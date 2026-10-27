// タイトルのボタンを、縁取りつきで canvas に描く
import { device, format, SetupCanvas, LoadSprite, DrawSprites } from './webgpu_common.js';
import { SetEdge } from './webgpu_edge.js';

// ボタン画像のサイズと余白(title.css の --img-w / --img-h / --pad と同じ値にする)
const IMG_W = 860, IMG_H = 190, PAD = 32;
const W = IMG_W + PAD * 2;
const H = IMG_H + PAD * 2;

// 縁取りの設定
const white = { px: 18, color: [1.0, 1.0, 1.0, 1], amount: 1 };
const brown = { px: 2, color: [0.34, 0.22, 0.20, 1], amount: 1 };

// button の中の canvas に、url の画像を縁取りつきで描く
async function SetupButton(button, url) {
    const canvas = button.querySelector('canvas');
    const context = SetupCanvas(canvas, W, H);

    const sprite = await LoadSprite(url);
    const item = {
        x: PAD, y: PAD, w: IMG_W, h: IMG_H,
        rotate: 0, ox: 0, oy: 0, scale: 1, rotAnim: 0, alpha: 1,
        ...sprite,
    };

    // 縁取りなしの絵を置くテクスチャ
    const sceneTexture = device.createTexture({
        size: [W, H], format,
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
    });
    const whiteTexture = device.createTexture({
        size: [W, H], format,
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
    });

    let edge = 0;   // 縁の濃さ。0: 縁なし、1: 縁あり

    function Render() {
        const enc = device.createCommandEncoder();
        DrawSprites(enc, [item], sceneTexture);
        SetEdge(enc, white.color, white.px, edge, sceneTexture, whiteTexture);
        SetEdge(enc, brown.color, brown.px, edge, whiteTexture, context.getCurrentTexture());
        device.queue.submit([enc.finish()]);
    }

    button.addEventListener('mouseenter', () => { edge = 1; Render(); });
    button.addEventListener('mouseleave', () => { edge = 0; Render(); });

    Render();
}

SetupButton(document.querySelector('#button_hello'), './img/button_hello.webp');
SetupButton(document.querySelector('#button_works'), './img/button_works.webp');
SetupButton(document.querySelector('#button_diary'), './img/button_diary.webp');