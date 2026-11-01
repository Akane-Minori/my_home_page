import { SetSpin } from '../spintext.js';
import { PanelPoints, ShrinkPolygon, Bounds, FitImage, PointsAttr } from './illusts_panel.js';
import { OpenIllustCard, CloseIllustCard, IsIllustCardOpen, ThumbPath } from './illusts_card.js';
import { ChangeScene } from '../scenechange.js';

const NS = 'http://www.w3.org/2000/svg';
const MAX_WIDTH = 400;      // ページの最大幅(px)
const BAR = 30;             // シネスコの帯の高さ(px)
const FOLLOW = 0.12;        // スクロールの追従の速さ(大きいほど速い)

const track = document.querySelector('#illusts_track');
const svg = document.querySelector('#illusts_svg');

let start_time;
let end_time;

let enddone = false;

let page_height = 0;        // ページの高さ(幅 = 1.0)
let scroll = 0, target = 0;
let frame = 0, running = false;

// ----------------------------------------------------------------------------
// コマ割りの組み立て(json/illusts.json は、コマ割りエディターで作る)
// ----------------------------------------------------------------------------
function El(name, attrs, parent)
{
    const e = document.createElementNS(NS, name);
    for (const [key, value] of Object.entries(attrs)) e.setAttribute(key, value);
    if (parent) parent.append(e);
    return e;
}

async function GetImageSize(url)
{
    const img = new Image();
    img.src = url;
    await img.decode();
    return { w: img.naturalWidth, h: img.naturalHeight };
}

function ClearEdges()
{
    for (const e of svg.querySelectorAll('.illusts_edge.on')) e.classList.remove('on');
}

// ratio: 絵の 幅÷高さ
function OnPanelClick(panel, ratio)
{
    if (IsIllustCardOpen()) return;
    if (panel.back)
    {
        ChangeScene('works');
        return;
    }
    if (!panel.img) return;     // 絵のないコマは、何も開かない
    ClearEdges();
    OpenIllustCard(panel, ratio);
}

async function Build()
{
    try
    {
        const data = await (await fetch('./json/illusts.json')).json();
        const gap = data.gap ?? 0.02;
        page_height = data.height;

        svg.setAttribute('viewBox', `0 0 1 ${data.height}`);
        svg.style.aspectRatio = `1 / ${data.height}`;

        const defs = El('defs', {}, svg);
        const art = El('g', {}, svg);       // 絵
        const edges = El('g', {}, svg);     // ホバーの縁取り(絵より手前)
        const hits = El('g', {}, svg);      // 当たり判定(いちばん手前)

        const jobs = data.panels.map(async (panel, i) =>
        {
            const inner = ShrinkPolygon(PanelPoints(data, panel), gap);
            const shape = PointsAttr(inner);
            const box = Bounds(inner);
            const slot = El('g', {}, art);  // 描く順番を保つため、先に場所だけ取る
            const src = panel.img ? ThumbPath(panel.img) : null;   // 一覧に使う絵は、原寸と同名のサムネ
            let ratio = 1;                          // 絵の 幅÷高さ(読み込み後に決まる)

            // 縁取り
            const edge = El('g', { class: 'illusts_edge' }, edges);
            El('polygon', { points: shape, class: 'edge_brown' }, edge);
            El('polygon', { points: shape, class: 'edge_white' }, edge);

            // 当たり判定
            const hit = El('polygon', { points: shape, class: 'illusts_hit' }, hits);
            hit.addEventListener('mouseenter', () => edge.classList.add('on'));
            hit.addEventListener('mouseleave', () => edge.classList.remove('on'));
            hit.addEventListener('click', () => OnPanelClick(panel, ratio));

            // 中身
            if (panel.back)
            {
                El('polygon', { points: shape, fill: '#ff21ac' }, slot);
                const label = El('text', {
                    x: (box.x0 + box.x1) / 2, y: (box.y0 + box.y1) / 2,
                    'font-size': 0.08, fill: '#fff', 'font-family': 'Anton, sans-serif',
                    'text-anchor': 'middle', 'dominant-baseline': 'middle',
                }, slot);
                label.textContent = 'BACK';
            }
            else if (src)
            {
                try
                {
                    const size = await GetImageSize(src);
                    ratio = size.w / size.h;
                    const f = FitImage(box, size.w, size.h, panel.focus, panel.zoom);
                    const clip = El('clipPath', { id: `illusts_clip_${i}` }, defs);
                    El('polygon', { points: shape }, clip);
                    El('image', {
                        href: src, x: f.x, y: f.y, width: f.w, height: f.h,
                        preserveAspectRatio: 'none', 'clip-path': `url(#illusts_clip_${i})`,
                    }, slot);
                }
                catch (e)
                {
                    console.error(`illusts: ${src} の読み込み失敗`, e);
                    El('polygon', { points: shape, fill: '#777' }, slot);
                }
            }
            else
            {
                El('polygon', { points: shape, fill: '#aab' }, slot);
            }
        });
        await Promise.all(jobs);
    }
    catch (e)
    {
        console.error('illusts: 読み込み失敗', e);
    }
}
let ready = null;

export function PreloadIllusts()
{
    if (!ready) ready = Build();
    return ready;
}

// ----------------------------------------------------------------------------
// 縦スクロール
// ----------------------------------------------------------------------------
function ScrollMax()
{
    const w = Math.min(MAX_WIDTH, window.innerWidth);
    return Math.max(0, page_height * w + BAR * 2 - window.innerHeight);
}

function OnWheel(e)
{
    if (IsIllustCardOpen()) return;     // 詳細表示中は、後ろをスクロールさせない
    target = Math.min(Math.max(target + e.deltaY, 0), ScrollMax());
}

function Tick()
{
    scroll += (target - scroll) * FOLLOW;
    track.style.transform = `translate3d(0, ${-scroll}px, 0)`;
    frame = requestAnimationFrame(Tick);
}

// ----------------------------------------------------------------------------
// イントロ処理
// ----------------------------------------------------------------------------
export async function EnterIllusts()
{
    enddone = false;
    start_time = performance.now();

    SetSpin("ILLUSTS", 4);

    running = true;
    await PreloadIllusts();
    if (!running) return;

    scroll = target = 0;
    track.style.transform = '';
    window.addEventListener('wheel', OnWheel);
    frame = requestAnimationFrame(Tick);
}



// ----------------------------------------------------------------------------
// 退場処理
// ----------------------------------------------------------------------------
export function ExitIllusts()
{
    end_time = performance.now();

    SetSpin();

    running = false;
    cancelAnimationFrame(frame);
    window.removeEventListener('wheel', OnWheel);
    ClearEdges();
    CloseIllustCard();

    // 仮
    enddone = true;
}

export function GetEndDone()
{
    return enddone;
}