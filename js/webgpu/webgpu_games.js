// ゲーム一覧の立ち絵を、1枚ずつ小さな canvas に描き、全体を横スクロールする
import { device, format, SetupCanvas, LoadSprite, DrawSprites } from './webgpu_common.js';
import { SetEdge } from './webgpu_edge.js';
import { OpenCard, IsCardOpen } from '../scenes/games_card.js';

const PAD = 32;         // 縁取り用の余白(画像のピクセル)
const MARGIN = 0.1;     // 最後の立ち絵の右の余白(画面の高さ = 1.0)
const FOLLOW = 0.12;    // スクロールの追従の速さ(大きいほど速い)

// 縁取りの設定(PAD より小さい合計にする)
const white = { px: 18, color: [1.0, 1.0, 1.0, 1] };
const brown = { px: 2, color: [0.34, 0.22, 0.20, 1] };

const track = document.querySelector('#games_track');

let extent = 0;         // 一番右の立ち絵の右端(画面の高さ = 1.0)
let scroll = 0, target = 0;
let frame = 0, running = false;

// 画像のピクセルサイズを取る(読み込みはブラウザにキャッシュされる)
async function GetImageSize(url) {
    const img = new Image();
    img.src = url;
    await img.decode();
    return { imgW: img.naturalWidth, imgH: img.naturalHeight };
}

// 立ち絵1枚ぶんの button と canvas を作る
async function SetupItem(data) {
    const sprite = await LoadSprite(data.img);
    const { imgW, imgH } = await GetImageSize(data.img);
    const aspect = imgW / imgH;
    const W = imgW + PAD * 2;
    const H = imgH + PAD * 2;

    const button = document.createElement('button');
    button.className = 'game_item';
    const vars = {
        '--x': data.x, '--y': data.y, '--h': data.h, '--aspect': aspect,
        '--pad': PAD, '--img-w': imgW, '--img-h': imgH,
    };
    for (const [key, value] of Object.entries(vars)) button.style.setProperty(key, value);

    const canvas = document.createElement('canvas');
    button.append(canvas);
    track.append(button);

    const context = SetupCanvas(canvas, W, H);

    // 縁取りなしの絵を、1回だけ描いておく
    const textureUsage = GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING;
    const sceneTexture = device.createTexture({ size: [W, H], format, usage: textureUsage });
    const whiteTexture = device.createTexture({ size: [W, H], format, usage: textureUsage });
    const item = {
        x: PAD, y: PAD, w: imgW, h: imgH,
        rotate: 0, ox: 0, oy: 0, scale: 1, rotAnim: 0, alpha: 1,
        ...sprite,
    };
    const first = device.createCommandEncoder();
    DrawSprites(first, [item], sceneTexture);
    device.queue.submit([first.finish()]);

    // edge: 縁の濃さ(0: なし、1: あり)
    function Render(edge) {
        const enc = device.createCommandEncoder();
        SetEdge(enc, white.color, white.px, edge, sceneTexture, whiteTexture);
        SetEdge(enc, brown.color, brown.px, edge, whiteTexture, context.getCurrentTexture());
        device.queue.submit([enc.finish()]);
    }

    button.addEventListener('mouseenter', () => Render(1));
    button.addEventListener('mouseleave', () => Render(0));
    button.addEventListener('click', () => OpenCard(data));
    Render(0);

    extent = Math.max(extent, data.x + data.h * aspect);
}

async function Load() {
    try {
        const list = await (await fetch('./json/games.json')).json();
        for (const data of list) await SetupItem(data);
    } catch (e) {
        console.error('games: 読み込み失敗', e);
    }
}
const ready = Load();

function OnWheel(e) {
    if (IsCardOpen()) return;
    const max = Math.max(0, (extent + MARGIN) * window.innerHeight - window.innerWidth);
    target = Math.min(Math.max(target + e.deltaY + e.deltaX, 0), max);
}

function Tick() {
    scroll += (target - scroll) * FOLLOW;
    track.style.transform = `translate3d(${-scroll}px, 0, 0)`;
    frame = requestAnimationFrame(Tick);
}

// 立ち絵の読み込みが終わってから、スクロールを始める
export async function StartGames() {
    running = true;
    await ready;
    if (!running) return;

    scroll = target = 0;
    window.addEventListener('wheel', OnWheel);
    frame = requestAnimationFrame(Tick);
}

export function StopGames() {
    running = false;
    cancelAnimationFrame(frame);
    window.removeEventListener('wheel', OnWheel);
}