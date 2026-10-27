// タイトルのボタンを、縁取りつきで canvas に描く
import { device, format, SetupCanvas,} from './webgpu_common.js';


// ----------------------------------------------------------------------------
// 初期化
// ----------------------------------------------------------------------------
let frame_interval = 170;
let frame_offset = [0, 0];
let brown = { px: 8, color: [0.34, 0.22, 0.20, 1], amount: 1 };


const canvas = document.querySelector('#bgframe');
const context = SetupCanvas(canvas);

const module = device.createShaderModule({ code: /* wgsl */`
    struct Uniform
    {
        color : vec4f,
        size : vec2f, pixel : f32, amount : f32,
        interval : f32, offset : vec2f
    };
    @group(0) @binding(0) var<uniform> o : Uniform;
    struct VSOut { @builtin(position) pos : vec4f, @location(0) uv : vec2f };

    @vertex fn vs(@builtin(vertex_index) i : u32) -> VSOut {
        var p = array<vec2f, 3>(vec2f(-1,-1), vec2f(3,-1), vec2f(-1,3));   // 画面全体を覆う三角形
        var v : VSOut;
        v.pos = vec4f(p[i], 0.0, 1.0);
        v.uv = vec2f(p[i].x * 0.5 + 0.5, 0.5 - p[i].y * 0.5);
        return v;
    }

    @fragment fn fs(in : VSOut) -> @location(0) vec4f {
        var p = (in.uv - vec2f(0.5)) * o.size + o.offset;
        p = abs(p - o.interval * round(p / o.interval));
        let a =
            (1.0 - smoothstep(o.pixel * 0.5 - 0.005, o.pixel * 0.5 + 0.005, min(p.x, p.y))) *
            clamp(o.pixel * 2.0, 0.0, 1.0);
        return o.color * o.amount * a;
    }
`});

const one = { srcFactor: 'one', dstFactor: 'one-minus-src-alpha' };
const pipeline = device.createRenderPipeline({
    layout: 'auto',
    vertex:   { module, entryPoint: 'vs' },
    fragment: { module, entryPoint: 'fs', targets: [{ format, blend: { color: one, alpha: one } }] },
});

const buffer = device.createBuffer(
    { size: 48, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
        { binding: 0, resource: { buffer } },
    ],
});


// ----------------------------------------------------------------------------
// 描画
// ----------------------------------------------------------------------------
function Render() {
    const enc = device.createCommandEncoder();

    const pass = enc.beginRenderPass({ colorAttachments: [{
            view: context.getCurrentTexture().createView(),
            clearValue: [0, 0, 0, 0], loadOp: 'clear', storeOp: 'store',
        }]});
        pass.setPipeline(pipeline);

        device.queue.writeBuffer(buffer, 0, new Float32Array([
            ...brown.color,
            canvas.clientWidth, canvas.clientHeight,
            brown.px, brown.amount, frame_interval, 0,
            ...frame_offset,
        ]));
        pass.setBindGroup(0, bindGroup);
        pass.draw(3);
        pass.end();

    device.queue.submit([enc.finish()]);
}

function ResizeCheck()
{
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    Render();
}

addEventListener('resize', ResizeCheck);


// ----------------------------------------------------------------------------
// 値の変更
// ----------------------------------------------------------------------------
export function ChangeBGFrame(color, pixel, amount, interval, offset = [0, 0])
{
    const notchanged =
        brown.px === pixel &&
        frame_offset[0] === offset[0] &&
        frame_offset[1] === offset[1] &&
        brown.amount === amount &&
        frame_interval === interval &&
        brown.color.every((v, i) => v === color[i]);
    if (notchanged) return;

    brown.px = pixel;
    brown.amount = amount;
    brown.color = color;
    frame_interval = interval;
    frame_offset = offset;

    Render();
}