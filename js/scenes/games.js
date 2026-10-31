import { SetSpin } from '../spintext.js';
import { StartGames, StopGames } from '../webgpu/webgpu_games.js';
import { CloseCard } from './games_card.js';

let start_time;
let end_time;

let enddone = false;

// ----------------------------------------------------------------------------
// ブラインド(帯状のマスク + 単色化)
// 立ち絵が画面の右端にいるうちは単色ブラインドで、右 1/5 に来るまでに解除される
// ----------------------------------------------------------------------------
const BLIND_START = 0.8;                // 画面の幅に対する位置。これより右はブラインド
const BLIND_MIN = 0.3;                  // 右端での帯の開き具合(0: 全部閉じて見えない、1: 全部開く)
const BLIND_COUNT = 8;                  // 帯の数
const BLIND_ANGLE = 45;                 // 帯の角度
const BLIND_COLOR = [1.0, 0.129, 0.675]; // 単色の色(--pink)

let items = [];             // 立ち絵ごとの { element, canvas, filter, matrix, last }
let filter_count = 0;
let frame = 0;
let active = false;

// 立ち絵1枚ぶんの、単色化用の SVG フィルターを作る
function CreateBlind(element)
{
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("width", "0");
    svg.setAttribute("height", "0");
    svg.style.position = "absolute";

    const filter = document.createElementNS(ns, "filter");
    filter.id = `games_mono_${filter_count++}`;
    filter.setAttribute("color-interpolation-filters", "sRGB");

    const matrix = document.createElementNS(ns, "feColorMatrix");
    matrix.setAttribute("type", "matrix");

    filter.append(matrix);
    svg.append(filter);
    document.body.append(svg);

    return { element, canvas: element.querySelector("canvas"), filter, matrix, last: -1 };
}

// t: ブラインドの強さ(0: なし、1: 右端)
function SetBlind(item, t)
{
    const canvas = item.canvas;

    if (t === 0)
    {
        canvas.style.maskImage = "";
        item.element.style.filter = "";
        return;
    }

    // 帯のマスク(縁取り用の余白があるので、canvas に掛ける)
    const open = BLIND_MIN + (1 - BLIND_MIN) * (1 - t);
    const a = BLIND_ANGLE * Math.PI / 180;
    const length = Math.abs(canvas.offsetWidth * Math.sin(a)) + Math.abs(canvas.offsetHeight * Math.cos(a));
    const pitch = length / BLIND_COUNT;
    const opened = open * pitch;
    canvas.style.maskImage = `repeating-linear-gradient(${BLIND_ANGLE + 180}deg, #000 0px, #000 ${opened}px, transparent ${opened}px, transparent ${pitch}px)`;

    // 単色化
    const [r, g, b] = BLIND_COLOR;
    item.matrix.setAttribute("values",
        `${1 - t} 0 0 0 ${t * r}  0 ${1 - t} 0 0 ${t * g}  0 0 ${1 - t} 0 ${t * b}  0 0 0 1 0`);
    item.element.style.filter = `url(#${item.filter.id})`;
}

function Tick()
{
    const W = window.innerWidth;

    for (const item of items)
    {
        // 画面上の位置からブラインドの強さを決める
        const rect = item.element.getBoundingClientRect();
        const center = rect.left + rect.width / 2;
        const t = Math.min(Math.max((center / W - BLIND_START) / (1 - BLIND_START), 0), 1);

        const key = Math.round(t * 50);     // 細かい変化では更新しない
        if (key === item.last) continue;
        item.last = key;

        SetBlind(item, key / 50);
    }

    frame = requestAnimationFrame(Tick);
}

// ----------------------------------------------------------------------------
// イントロ処理
// ----------------------------------------------------------------------------
export async function EnterGames()
{
    enddone = false;
    start_time = performance.now();

    SetSpin("GAMES", 5);

    active = true;
    await StartGames();     // 立ち絵の読み込みを待つ
    if (!active) return;

    if (items.length === 0) items = [...document.querySelectorAll(".game_item")].map(CreateBlind);
    for (const item of items) item.last = -1;   // 戻ってきたとき、反映し直す
    frame = requestAnimationFrame(Tick);
}



// ----------------------------------------------------------------------------
// 退場処理
// ----------------------------------------------------------------------------
export function ExitGames()
{
    end_time = performance.now();
    
    CloseCard();
    SetSpin();
    StopGames();

    active = false;
    cancelAnimationFrame(frame);

    // 仮
    enddone = true;
}

export function GetEndDone()
{
    return enddone;
}