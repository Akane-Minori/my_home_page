// 動く背景(ノイズ)。シーンごとに、色・閾値・速さ・背景色を持つ
import { SetupCanvas } from './webgpu_common.js';
import { CreateNoise } from './webgpu_noise.js';

const context_latte = SetupCanvas(document.querySelector('#noise'));

const noises =
{
    // 閾値は大きいほど模様が減る。speed は時間の倍率
    title:
    {
        render: CreateNoise([1.0, 1.0, 1.0], 0.25),
        speed: 1.0,
    },
    illusts:
    {
        render: CreateNoise([0.851, 0.722, 0.659], 0.25),   // #d9b8a8 (--brown_pale)
        speed: 0.1,
    },
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

const noise_canvas = document.querySelector('#noise');

// name: noises のキー。null で止める
export function SetNoise(name) {
    if (!name) {
        active = false;
        noise_canvas.style.display = 'none';
        return;
    }
    noise_canvas.style.display = '';
    current = noises[name];
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

// 自己紹介の、動かない背景(透明と --white の2色。透明の所は body の背景色 --pink_pale が見える)
// 非表示のシーンは clientWidth が0なので、画面サイズを渡す
const context_table = SetupCanvas(document.querySelector('#hello_bg'), window.innerWidth, window.innerHeight);

const RenderTable = CreateNoise([1.0, 0.890, 0.643], 0.3, [10.0, 100.0]);
RenderTable(context_table, 100);   // 100 = 模様の選び方。数字を変えると柄が変わる