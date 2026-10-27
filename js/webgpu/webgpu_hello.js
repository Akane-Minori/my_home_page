import { device, format, SetupCanvas, LoadSprite, DrawSprites } from './webgpu_common.js';
import { SetEdge } from './webgpu_edge.js';

const IMG_W = 353, IMG_H = 310, PAD = 32;
const W = IMG_W + PAD * 2;
const H = IMG_H + PAD * 2;

const white = { px: 18, color: [1.0, 1.0, 1.0, 1], amount: 1 };
const brown = { px: 8, color: [0.34, 0.22, 0.20, 1], amount: 1 };

async function SetupBackButton(button, url) {
    const canvas = button.querySelector('canvas');
    const context = SetupCanvas(canvas, W, H);

    const sprite = await LoadSprite(url);
    const item = {
        x: PAD, y: PAD, w: IMG_W, h: IMG_H,
        rotate: 0, ox: 0, oy: 0, scale: 1, rotAnim: 0, alpha: 1,
        ...sprite,
    };

    const sceneTexture = device.createTexture({
        size: [W, H], format,
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
    });
    const whiteTexture = device.createTexture({
        size: [W, H], format,
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
    });

    let edge = 0;

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

SetupBackButton(document.querySelector('#hello_backbutton'), './img/coffee.webp');

// ----------------------------------------------------------------------------
// 自己紹介の白エリア
// ----------------------------------------------------------------------------
const PAPER_W = 595, PAPER_H = 842, PAPER_PAD = 8;   // A4（72dpi）
const PW = PAPER_W + PAPER_PAD * 2;   // 611
const PH = PAPER_H + PAPER_PAD * 2;   // 858

async function SetupPaper(canvas) {
    const context = SetupCanvas(canvas, PW, PH);

    // 白い1ピクセルの画像を作る
    const c = new OffscreenCanvas(1, 1);
    const g = c.getContext('2d');
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, 1, 1);
    const url = URL.createObjectURL(await c.convertToBlob());

    const sprite = await LoadSprite(url);
    const item = {
        x: PAPER_PAD, y: PAPER_PAD, w: PAPER_W, h: PAPER_H,
        rotate: 0, ox: 0, oy: 0, scale: 1, rotAnim: 0, alpha: 1,
        ...sprite,
    };

    const sceneTexture = device.createTexture({
        size: [PW, PH], format,
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
    });

    const enc = device.createCommandEncoder();
    DrawSprites(enc, [item], sceneTexture);
    SetEdge(enc, brown.color, 4, 1, sceneTexture, context.getCurrentTexture());
    device.queue.submit([enc.finish()]);
}

SetupPaper(document.querySelector('#hello_paper_canvas'));