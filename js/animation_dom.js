import * as Animation from './animation.js';

let dom_count = 0;
export const clips = await (await fetch('./json/animation_title_hello.json')).json();
export const clips_works = await (await fetch('./json/animation_title_works.json')).json();

// ----------------------------------------------------------------------------
// element : 動かすHTML要素
// base    : CSSで元から付いている変形。pre = 先頭の変形、rotate = 元の回転(deg)
// ----------------------------------------------------------------------------
export function CreateDom(element, base = {})
{
    // 単色化に使うSVGフィルタを、要素ごとに1つ作る
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("width", "0");
    svg.setAttribute("height", "0");
    svg.style.position = "absolute";

    const filter = document.createElementNS(ns, "filter");
    filter.id = `dom_mono_${dom_count++}`;
    filter.setAttribute("color-interpolation-filters", "sRGB");

    const matrix = document.createElementNS(ns, "feColorMatrix");
    matrix.setAttribute("type", "matrix");

    filter.append(matrix);
    svg.append(filter);
    document.body.append(svg);

    return {
        element: element,
        pre: base.pre ?? "",
        rotate: base.rotate ?? 0,
        item: {},
        filter: filter,
        matrix: matrix,
    };
}

// ----------------------------------------------------------------------------
// dom.item の値を、要素の見た目に反映する
// ----------------------------------------------------------------------------
function ApplyDom(dom, clip)
{
    const e = dom.element;
    const v = dom.item;

    e.style.transform = `translate(${v.ox}px, ${v.oy}px) ${dom.pre} rotate(${dom.rotate + v.rotAnim}deg) scale(${v.scale})`;
    e.style.opacity = v.alpha;

    // ブラインド(縁取りcanvasがある要素は、canvasの方にマスクを掛ける)
    const cv = getComputedStyle(e).getPropertyValue("--pad").trim() ? e.querySelector(":scope > canvas") : null;
    const m = cv ?? e;

    if (v.blind >= 1)
    {
        m.style.maskImage = "";
    }
    else
    {
        const n = clip.blindCount ?? 8;
        const angle = clip.blindAngle ?? 45;
        const a = angle * Math.PI / 180;
        const length = Math.abs(m.offsetWidth * Math.sin(a)) + Math.abs(m.offsetHeight * Math.cos(a));
        const pitch = length / n;
        const open = Math.max(v.blind, 0) * pitch;

        if (m === e) e.style.maskClip = "no-clip";   // 要素の外にはみ出した部分も切らない
        m.style.maskImage = `repeating-linear-gradient(${angle + 180}deg, #000 0px, #000 ${open}px, transparent ${open}px, transparent ${pitch}px)`;
    }

    // 単色化
    if (v.mono > 0)
    {
        const m = Math.min(v.mono, 1);
        const n = parseInt((clip.monoColor ?? "#ffb200").slice(1), 16);
        const r = (n >> 16) / 255;
        const g = ((n >> 8) & 255) / 255;
        const b = (n & 255) / 255;

        dom.matrix.setAttribute("values",
            `${1 - m} 0 0 0 ${m * r}  0 ${1 - m} 0 0 ${m * g}  0 0 ${1 - m} 0 ${m * b}  0 0 0 1 0`);
        e.style.filter = `url(#${dom.filter.id})`;
    }
    else
    {
        e.style.filter = "none";
    }
}

// ----------------------------------------------------------------------------
// 同じクリップを、doms の全部に再生する。終わったら ondone を呼ぶ
// ----------------------------------------------------------------------------
export function PlayClip(doms, clip, start_time, ondone)
{
    function Tick(now)
    {
        const time = (now - start_time) / 1000.0;

        for (const dom of doms)
        {
            Animation.ApplyClip(dom.item, clip, time);
            ApplyDom(dom, clip);
        }

        if (time < clip.duration) requestAnimationFrame(Tick);
        else if (ondone) ondone();
    }

    Tick(start_time);   // 最初の1フレームは、描画される前に反映する
}

// ----------------------------------------------------------------------------
// 要素に付けた値を消して、CSSの元の状態に戻す
// ----------------------------------------------------------------------------
export function ResetDom(dom)
{
    const e = dom.element;
    e.style.transform = "";
    e.style.opacity = "";
    e.style.maskImage = "";
    e.style.maskClip = "";
    e.style.filter = "";

    const cv = e.querySelector(":scope > canvas");
    if (cv) cv.style.maskImage = "";
}