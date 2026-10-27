import { device, format, SetupCanvas, LoadSprite, DrawSprites } from './webgpu_common.js';
import { SetEdge } from './webgpu_edge.js';
import { ApplyClip } from '../animation.js';

const BASE = './img/title/';   // 画像と positions.json の場所(HTMLからの相対パス)

const canvas = document.querySelector('#logo');
const { parts } = await (await fetch(BASE + 'positions.json')).json();
const clips = await (await fetch('./json/animation_logo.json')).json();

// ----------------------------------------------------------------------------
// 設定
// ----------------------------------------------------------------------------
// 白い縁取り + 右下の白い影(offset = 右, 下)
const white = { px: 8, offset: [12, 12], color: [1, 1, 1, 1], amount: 1 };
// その外側の茶色の縁取り
const brown = { px: 4, offset: [0, 0], color: [0.34, 0.22, 0.20, 1], amount: 1 };

// 縁取りと影で外側に広がる分の余白(白8 + 影12 + 茶6 = 26px 以上)
const PAD = 100;

let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
for (const p of Object.values(parts)) {
    const cx = p.x + p.w / 2, cy = p.y + p.h / 2, a = (p.rotate || 0) * Math.PI / 180;
    const hw = (Math.abs(p.w * Math.cos(a)) + Math.abs(p.h * Math.sin(a))) / 2;
    const hh = (Math.abs(p.w * Math.sin(a)) + Math.abs(p.h * Math.cos(a))) / 2;
    minX = Math.min(minX, cx - hw); maxX = Math.max(maxX, cx + hw);
    minY = Math.min(minY, cy - hh); maxY = Math.max(maxY, cy + hh);
}
minX = Math.floor(minX - PAD); minY = Math.floor(minY - PAD);
const W = Math.ceil(maxX + PAD) - minX;
const H = Math.ceil(maxY + PAD) - minY;

const context = SetupCanvas(canvas, W, H);
canvas.style.aspectRatio = `${W} / ${H}`;

// 各パーツの座標を、左上が原点になるようずらす
for (const p of Object.values(parts)) { p.x -= minX; p.y -= minY; }

// 元絵
const sceneTexture = device.createTexture({
    size: [W, H], format,
    usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
});

// 縁取り後
const whiteTexture = device.createTexture({
    size: [W, H], format,
    usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
});



// ----------------------------------------------------------------------------
// 描画
// ----------------------------------------------------------------------------
function render(items) {
    const enc = device.createCommandEncoder();

    DrawSprites(enc, items, sceneTexture);

    SetEdge(enc, white.color, white.px, white.amount, sceneTexture, whiteTexture, white.offset);
    SetEdge(enc, brown.color, brown.px, brown.amount, whiteTexture, context.getCurrentTexture(), brown.offset);

    device.queue.submit([enc.finish()]);
}

// positions.json から配置(parts はすでに座標をずらした後のもの)
const items = await Promise.all(Object.entries(parts).map(async ([name, p]) =>
    ({ ...p, ...await LoadSprite(BASE + name),
       name, ox: 0, oy: 0, scale: 1, rotAnim: 0, alpha: 1 })));
items.sort((a, b) => a.z - b.z);

// ----------------------------------------------------------------------------
// 描画の更新処理
// ----------------------------------------------------------------------------
const endTime = Math.max(...Object.values(clips).map(c => c.duration));
let startTime = 0, running = false;

export function PlayLogo() {
    startTime = performance.now();
    if (!running) { running = true; requestAnimationFrame(frame); }
}

function frame(now) {
    const t = (now - startTime) / 1000;
    let dirty = true;                       // 最初の1回は必ず描く
    for (const it of items) {
        const clip = clips[it.name];
        if (clip && ApplyClip(it, clip, t)) dirty = true;
    }
    if (dirty) render(items);
    if (t < endTime) requestAnimationFrame(frame);
    else running = false;                   // 終わったら完全に止める
}
PlayLogo();

// ----------------------------------------------------------------------------
// ロゴの高さを、ボタンの手前までに制限するための測定(CSSの --logo-bottom に渡す)
// ----------------------------------------------------------------------------
const buttons = document.querySelector('.titlebutton_area');
function fitLogo() {
    document.documentElement.style.setProperty(
        '--logo-bottom', innerHeight - buttons.getBoundingClientRect().top + 'px');
}
new ResizeObserver(fitLogo).observe(buttons);
addEventListener('resize', fitLogo);
fitLogo();
