import { clips_works, CreateDom, PlayClip } from '../animation_dom.js'
import { ChangeScene } from '../scenechange.js';
import { PreloadIllusts } from './illusts.js';
import { PreloadGames } from '../webgpu/webgpu_games.js';
import { PanelPoints, ShrinkPolygon, Bounds, FitImage, PointsAttr } from './illusts_panel.js';

const NS = 'http://www.w3.org/2000/svg';
const stage = document.querySelector('#works_panels');

const dom_back = CreateDom(document.querySelector("#works_back"));
const dom_bg = CreateDom(document.querySelector("#bggrid"));

// コマの名前(works.json の panels の id) → 移動先のシーンと、登場アニメの名前
// works_editor でコマの名前を変えたら、ここも合わせる
const TARGETS = {
    p1: { scene: 'games',   clip: 'works_game' },
    p2: { scene: 'musics',  clip: 'works_music' },
    p3: { scene: 'illusts', clip: 'works_illust' },
};

// 文字の基準点(works_editor と同じ。SVG の text-anchor / dominant-baseline の値)
const ANCHORS = {
    'top-left':     { h: 'start',  v: 'text-before-edge' },
    'top':          { h: 'middle', v: 'text-before-edge' },
    'top-right':    { h: 'end',    v: 'text-before-edge' },
    'left':         { h: 'start',  v: 'middle' },
    'center':       { h: 'middle', v: 'middle' },
    'right':        { h: 'end',    v: 'middle' },
    'bottom-left':  { h: 'start',  v: 'text-after-edge' },
    'bottom':       { h: 'middle', v: 'text-after-edge' },
    'bottom-right': { h: 'end',    v: 'text-after-edge' },
};

const panel_doms = [];      // { dom, clip } 登場アニメを当てる対象
let ready = null;

let start_time;
let end_time;

let enddone = false;

// ----------------------------------------------------------------------------
// 読み込み
// ----------------------------------------------------------------------------
function El(tag, attrs, parent)
{
    const el = document.createElementNS(NS, tag);
    const keys = Object.keys(attrs);
    for (let i = 0; i < keys.length; i++) el.setAttribute(keys[i], attrs[keys[i]]);
    if (parent) parent.append(el);
    return el;
}

async function GetImageSize(url)
{
    const img = new Image();
    img.src = url;
    await img.decode();
    return { w: img.naturalWidth, h: img.naturalHeight };
}

// 文字を1つ、コマの SVG の中に置く(座標は works.json と同じ、ページの幅 = 1.0 の単位)
function AppendLabel(svg, label, font)
{
    const a = ANCHORS[label.anchor] ?? ANCHORS.center;
    const text = El('text', {
        x: label.x,
        y: label.y,
        'font-size': label.size,
        fill: label.color,
        'text-anchor': a.h,
        'dominant-baseline': a.v,
        'font-family': `${font}, sans-serif`,
        transform: `rotate(${label.rotate} ${label.x} ${label.y})`,
        'pointer-events': 'none',
    }, svg);
    text.textContent = label.text;
}

// コマ1つぶんのボタンを作る(画像・背景色・文字は、ボタンの中の SVG に入れる)
async function BuildPanel(data, panel, index)
{
    const pts = PanelPoints(data, panel);
    if (pts.length < 3 || pts.includes(undefined)) return null;

    const inner = ShrinkPolygon(pts, data.gap ?? 0.02);
    const box = Bounds(inner);
    const shape = PointsAttr(inner);
    const w = box.x1 - box.x0;
    const h = box.y1 - box.y0;

    const svg = El('svg', { viewBox: `${box.x0} ${box.y0} ${w} ${h}` });

    if (panel.color) El('polygon', { points: shape, fill: panel.color }, svg);

    if (panel.img)
    {
        try
        {
            const size = await GetImageSize(panel.img);
            const clip = El('clipPath', { id: `works_clip_${index}` }, svg);
            El('polygon', { points: shape }, clip);
            const f = FitImage(box, size.w, size.h, panel.focus ?? [0.5, 0.5], panel.zoom ?? 1);
            El('image', {
                href: panel.img,
                x: f.x, y: f.y, width: f.w, height: f.h,
                'clip-path': `url(#works_clip_${index})`,
                preserveAspectRatio: 'none',
            }, svg);
        }
        catch (e)
        {
            console.error(`works: ${panel.id} の画像を読み込めません`, e);
        }
    }

    const names = [];
    const labels = data.labels ?? [];
    for (let i = 0; i < labels.length; i++)
    {
        if (labels[i].panel !== panel.id) continue;
        AppendLabel(svg, labels[i], data.font ?? 'Anton');
        names.push(labels[i].text);
    }

    // クリックの当たり判定(コマの形。文字より前に置く)
    El('polygon', { points: shape, class: 'works_hit' }, svg);

    // ボタンの位置と大きさは、ページ全体(works_panels)に対する割合
    const button = document.createElement('button');
    button.className = 'works_panel';
    button.style.left = `${box.x0 * 100}%`;
    button.style.top = `${box.y0 / data.height * 100}%`;
    button.style.width = `${w * 100}%`;
    button.style.height = `${h / data.height * 100}%`;
    if (names.length) button.setAttribute('aria-label', names.join(' '));
    button.append(svg);

    const target = TARGETS[panel.id];
    if (target) button.addEventListener('click', ChangeScene.bind(null, target.scene));
    else console.warn(`works: ${panel.id} の移動先が TARGETS にありません`);

    return { button, target };
}

async function Build()
{
    try
    {
        const data = await (await fetch('./json/works.json')).json();
        stage.style.setProperty('--page-h', data.height);

        const jobs = [];
        for (let i = 0; i < data.panels.length; i++) jobs.push(BuildPanel(data, data.panels[i], i));
        const built = await Promise.all(jobs);

        for (let i = 0; i < built.length; i++)
        {
            if (!built[i]) continue;
            stage.append(built[i].button);
            if (built[i].target) panel_doms.push({ dom: CreateDom(built[i].button), clip: built[i].target.clip });
        }
    }
    catch (e)
    {
        console.error('works: 読み込み失敗', e);
    }
}

// 最初に呼ばれたときだけ読み込みを始める(タイトルから先に呼んでおくと、入ったときの待ちが減る)
export function PreloadWorks()
{
    if (!ready) ready = Build();
    return ready;
}

// ----------------------------------------------------------------------------
// イントロ処理
// ----------------------------------------------------------------------------
export async function EnterWorks()
{
    enddone = false;

    // 先読み(完了は待たない。各シーンに入るときに待つ)
    PreloadIllusts();
    PreloadGames();

    await PreloadWorks();
    start_time = performance.now();

    PlayClip([dom_back], clips_works.works_back, start_time);
    for (let i = 0; i < panel_doms.length; i++)
    {
        PlayClip([panel_doms[i].dom], clips_works[panel_doms[i].clip], start_time);
    }
    PlayClip([dom_bg], clips_works.works_bg, start_time);
}



// ----------------------------------------------------------------------------
// 退場処理
// ----------------------------------------------------------------------------
export function ExitWorks()
{
    
    end_time = performance.now();

    // 仮
    enddone = true;
}

export function GetEndDone()
{
    return enddone;
}