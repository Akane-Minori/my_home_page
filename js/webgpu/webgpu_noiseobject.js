// 動く背景(ノイズ)。シーンごとに、色・閾値・速さ・背景色を持つ
import { SetupCanvas } from './webgpu_common.js';
import { CreateNoise } from './webgpu_noise.js';

const context_latte = SetupCanvas(document.querySelector('#noise'));
const background = document.querySelector('#background');

const noises =
{
    // 閾値は大きいほど模様が減る。speed は時間の倍率
    title:
    {
        render: CreateNoise([1.0, 1.0, 1.0], 0.30),
        speed: 1.0,
        bg: "var(--blue)"
    },
    illusts:
    {
        render: CreateNoise([0.851, 0.722, 0.659], 0.25),
        speed: 0.1,
        bg: "var(--brown)"
    },   // #d9b8a8 (--brown_pale)
};
let current = noises.title;

const INTERVAL = 1000 / 24;   // 24fps
let last = 0;

let active = true;     // ノイズを動かすか
let running = false;   // ループが回っているか

function loop(time) {
    if (!active) {
        running = false;
        return;
    }
    if (time - last >= INTERVAL) {
        last = time;
        current.render(context_latte, time * 0.001 * current.speed);
    }
    requestAnimationFrame(loop);
}
running = true;
requestAnimationFrame(loop);

// name: noises のキー。null で止める
export function SetNoise(name) {
    if (!name) {
        active = false;
        return;
    }
    current = noises[name];
    background.style.backgroundColor = current.bg;
    active = true;
    if (!running) {   // すでに回っているときは、二重に始めない
        running = true;
        requestAnimationFrame(loop);
    }
}

export function SetNoiseActive(on) {
    active = on;
    if (on && !running) {   // すでに回っているときは、二重に始めない
        running = true;
        requestAnimationFrame(loop);
    }
}

// 自己紹介の、動かない背景(--orange_pale のノイズを1回だけ描く)
// 非表示のシーンは clientWidth が0なので、画面サイズを渡す
const context_table = SetupCanvas(document.querySelector('#hello_bg'), window.innerWidth, window.innerHeight);

const RenderTable = CreateNoise([1.0, 0.89, 0.64]);   // #ffe3a4 (--orange_pale)
RenderTable(context_table, 100);   // 100 = 模様の選び方。数字を変えると柄が変わる