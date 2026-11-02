import * as Works from './scenes/works.js';
import * as Games from './scenes/games.js';
import * as Illusts from './scenes/illusts.js';
import * as Musics from './scenes/musics.js';
import { SetNoise } from './webgpu/webgpu_noiseobject.js';
import { ChangeBGFrame } from './webgpu/webgpu_bgframe.js';
import { PlayLogo } from './webgpu/webgpu_logo.js';
import { Ease } from './animation.js';
import { CreateDom, PlayClip, ResetDom } from './animation_dom.js';

const transitions = await (await fetch('./json/transitions.json')).json();

const background = document.body;
const grid = document.querySelector('#bgframe');

let current_scene = "title";
let playing = false;

// enter : シーンに入るときの初期化(アニメは含めない)
// exit  : シーンを出た後の後始末(アニメは含めない)
// noise : 動く模様の名前(無ければ模様は隠れる)
// grid  : 格子を使うか
// bg    : 背景の CSS (background の一括指定)
// noise / grid / bg は、遷移が終わった時の最終状態。遷移の途中は JSON のキーが動かす
// title の最初の登場アニメは title.js が読み込み時に自分で再生する(戻ってきたときのロゴは enter の PlayLogo)
const scenes =
{
    title:
    {
        enter: PlayLogo,
        noise: "title",
        grid: true,
        bg: "var(--blue)"
    },
    hello:
    {
        grid: false,
        bg: "var(--pink_pale)"
    },
    works:
    {
        enter: Works.EnterWorks,
        grid: true,
        bg: "var(--pink_pale)"
    },
    games:
    {
        enter: Games.EnterGames,
        exit: Games.ExitGames,
        grid: false,
        bg: "linear-gradient(to bottom, var(--blue), var(--blue_pale))"
    },
    illusts:
    {
        enter: Illusts.EnterIllusts,
        exit: Illusts.ExitIllusts,
        noise: "illusts",
        grid: false,
        bg: "var(--brown)"
    },
    musics:
    {
        enter: Musics.EnterMusics,
        exit: Musics.ExitMusics,
        grid: false,
        bg: "linear-gradient(to bottom, var(--green), var(--green_pale))"
    },
    diary:
    {
        grid: false,
        bg: "var(--pink_pale)"
    },
};

// 格子の今の値。JSON に無い項目は、前の値を引き継ぐ(最初は title の格子)
const grid_state = { color: [0.67, 0.93, 1.0, 1], pixel: 3, amount: 1, interval: 250, ox: 0, oy: 0 };

// ----------------------------------------------------------------------------
// キー配列の評価
// ----------------------------------------------------------------------------

// 数値: キーの間を補間する
function EvalNum(keys, t)
{
    if (!keys || keys.length === 0) return undefined;
    if (t <= keys[0].t) return keys[0].v;
    const last = keys[keys.length - 1];
    if (t >= last.t) return last.v;
    let i = 0;
    while (keys[i + 1].t <= t) i++;
    const a = keys[i], b = keys[i + 1];
    return a.v + (b.v - a.v) * Ease(a.ease || 'linear', (t - a.t) / (b.t - a.t));
}

// 文字列: 最後に過ぎたキーの値に、パッと切り替わる
function EvalStep(keys, t)
{
    if (!keys || keys.length === 0) return undefined;
    let v = keys[0].v;
    for (const k of keys)
    {
        if (k.t <= t + 1e-9) v = k.v;
        else break;
    }
    return v;
}

// CSS の色(#rrggbb / rgb() / var(--x))を [r,g,b,a](0〜1)にする
const color_ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
color_ctx.canvas.width = color_ctx.canvas.height = 1;
const color_cache = new Map();
function ColorOf(s)
{
    if (color_cache.has(s)) return color_cache.get(s);

    let str = String(s).trim();
    const m = /^var\((--[\w-]+)\)$/.exec(str);
    if (m) str = getComputedStyle(document.documentElement).getPropertyValue(m[1]).trim() || str;

    color_ctx.clearRect(0, 0, 1, 1);
    color_ctx.fillStyle = '#000';
    color_ctx.fillStyle = str;
    color_ctx.fillRect(0, 0, 1, 1);
    const p = color_ctx.getImageData(0, 0, 1, 1).data;

    const c = [p[0] / 255, p[1] / 255, p[2] / 255, p[3] / 255];
    color_cache.set(s, c);
    return c;
}

// ----------------------------------------------------------------------------
// 背景・ノイズ・格子の、時刻 t の状態を反映する
// ----------------------------------------------------------------------------
let last_noise = scenes.title.noise;
let last_bg = scenes.title.bg;

function ApplyFx(tr, t)
{
    // ノイズ(名前が変わった瞬間だけ切り替える)
    const noise = EvalStep(tr.noise, t);
    const noise_changed = noise !== undefined && noise !== last_noise;
    if (noise_changed)
    {
        last_noise = noise;
        SetNoise(noise || null);
    }

    // 格子
    const g = tr.grid;
    if (g)
    {
        const color = EvalStep(g.color, t);
        const s = grid_state;
        if (color !== undefined) s.color = ColorOf(color);
        s.amount   = EvalNum(g.amount, t)   ?? s.amount;
        s.pixel    = EvalNum(g.pixel, t)    ?? s.pixel;
        s.interval = EvalNum(g.interval, t) ?? s.interval;
        s.ox       = EvalNum(g.ox, t)       ?? s.ox;
        s.oy       = EvalNum(g.oy, t)       ?? s.oy;

        ChangeBGFrame(s.color, Math.max(0, s.pixel), s.amount, Math.max(1, s.interval), [s.ox, s.oy]);
    }

    // 背景(SetNoise が背景を書き換えるので、必ず最後に掛ける)
    const bg = EvalStep(tr.background, t);
    if (bg !== undefined && (bg !== last_bg || noise_changed))
    {
        last_bg = bg;
        background.style.background = bg;
    }
}

// ----------------------------------------------------------------------------
// 要素ごとの動きの再生
// ----------------------------------------------------------------------------
const doms = new Map();     // 要素 → CreateDom の結果(SVGフィルタが増えないよう使い回す)

function GetDom(element, target)
{
    let dom = doms.get(element);
    if (!dom) doms.set(element, dom = CreateDom(element));
    dom.pre = target.pre ?? "";
    dom.rotate = target.rotate ?? 0;
    return dom;
}

// 遷移 tr の全 target を再生し、使った dom を返す
function PlayTargets(tr, start_time)
{
    const used = [];
    for (const target of tr.targets ?? [])
    {
        const list = [...document.querySelectorAll(target.selector)].map(e => GetDom(e, target));
        if (list.length === 0) continue;

        PlayClip(list, { ...target, duration: tr.duration }, start_time);
        used.push(...list);
    }
    return used;
}

// 背景・ノイズ・格子を、終わるまで毎フレーム反映する
function PlayFx(tr, start_time, ondone)
{
    function Tick(now)
    {
        const t = Math.min((now - start_time) / 1000.0, tr.duration);
        ApplyFx(tr, t);

        if (t < tr.duration) requestAnimationFrame(Tick);
        else ondone();
    }
    Tick(start_time);
}

// ----------------------------------------------------------------------------
// シーンの最終状態を、scenes テーブルの値で確定する
// ----------------------------------------------------------------------------
function ApplyNoise(id)
{
    const noise = scenes[id].noise ?? "";
    if (noise === last_noise) return;

    last_noise = noise;
    SetNoise(noise || null);
}

// SetNoise が背景を書き換えるので、ApplyNoise の後に呼ぶ
function ApplyBackground(id)
{
    last_bg = scenes[id].bg;
    background.style.background = scenes[id].bg;
}

function ApplyGrid(id)
{
    grid.style.display = scenes[id].grid ? '' : 'none';
}

// ----------------------------------------------------------------------------
// シーン遷移
// ----------------------------------------------------------------------------
export function ChangeScene(id)
{
    if (playing || id === current_scene) return;    // 遷移中の連打は無視する
    playing = true;

    const from = current_scene;
    const tr = transitions[`${from}>${id}`];
    current_scene = id;

    const from_element = document.getElementById(from);
    const to_element = document.getElementById(id);

    to_element.classList.add('is-active');

    // 格子を使う遷移・シーンでは、再生の前に出しておく
    // (非表示のままだと canvas の大きさが0になり、描画が壊れる)
    const uses_grid = !!tr?.grid && Object.values(tr.grid).some(k => k.length > 0);
    if (uses_grid || scenes[id].grid) grid.style.display = '';

    // JSON が背景・ノイズのキーを持たないなら、最初にテーブルの値へ切り替える
    if (!tr?.noise?.length) ApplyNoise(id);
    if (!tr?.background?.length) ApplyBackground(id);

    scenes[id].enter?.();

    function Finish(used)
    {
        // 退場したシーンの要素は、CSS の元の状態に戻す(次に入るときのため)
        for (const dom of used)
        {
            if (from_element.contains(dom.element) && !to_element.contains(dom.element)) ResetDom(dom);
        }
        from_element.classList.remove('is-active');

        // 最終状態は、JSON の内容に関わらずテーブルの値にそろえる
        ApplyNoise(id);
        ApplyBackground(id);
        ApplyGrid(id);

        scenes[from].exit?.();
        playing = false;
    }

    // JSON に無いペアは、アニメなしで即時に切り替える
    if (!tr)
    {
        Finish([]);
        return;
    }

    const start_time = performance.now();
    const used = PlayTargets(tr, start_time);
    PlayFx(tr, start_time, () => Finish(used));
}

const buttons = document.querySelectorAll('[data-scene]');
for (let i = 0; i < buttons.length; i++) {
    buttons[i].addEventListener('click', ChangeScene.bind(null, buttons[i].dataset.scene));
}