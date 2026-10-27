// 縁取り処理を担当する
// edge(enc, 色, 大きさ, 濃さ, 元テクスチャ, 出力先テクスチャ, ずらし) を呼ぶと、
// 元テクスチャの絵に縁取りをつけて、出力先に描く
import { device, format } from './webgpu_common.js';

const sampler = device.createSampler({ magFilter: 'linear', minFilter: 'linear' });
const one = { srcFactor: 'one', dstFactor: 'one-minus-src-alpha' };

const module = device.createShaderModule({ code: /* wgsl */`
    struct O { texel : vec2f, r : f32, amount : f32, color : vec4f, offset : vec2f, _p : vec2f };
    @group(0) @binding(0) var<uniform> o : O;
    @group(0) @binding(1) var scene : texture_2d<f32>;
    @group(0) @binding(2) var samp : sampler;
    struct VSOut { @builtin(position) pos : vec4f, @location(0) uv : vec2f };

    @vertex fn vs(@builtin(vertex_index) i : u32) -> VSOut {
        var p = array<vec2f, 3>(vec2f(-1,-1), vec2f(3,-1), vec2f(-1,3));   // 画面全体を覆う三角形
        var v : VSOut;
        v.pos = vec4f(p[i], 0.0, 1.0);
        v.uv = vec2f(p[i].x * 0.5 + 0.5, 0.5 - p[i].y * 0.5);
        return v;
    }
    fn a_at(uv : vec2f) -> f32 {
        if (any(uv < vec2f(0.0)) || any(uv > vec2f(1.0))) { return 0.0; }
        return textureSampleLevel(scene, samp, uv, 0.0).a;
    }
    // 絵を r だけ太らせたシルエット
    fn dilated(uv : vec2f) -> f32 {
        var e = a_at(uv);
        for (var ring = 0; ring < 2; ring++) {            // 内側と外側の2周で隙間を埋める
            let rad = o.r * (1.0 - 0.5 * f32(ring));
            for (var i = 0; i < 16; i++) {
                let t = f32(i) * 0.392699 + f32(ring) * 0.19635;
                e = max(e, a_at(uv + vec2f(cos(t), sin(t)) * rad * o.texel));
            }
        }
        return e;
    }
    @fragment fn fs(in : VSOut) -> @location(0) vec4f {
        let c = textureSampleLevel(scene, samp, in.uv, 0.0);
        var s = dilated(in.uv);                                       // 縁取り
        if (o.offset.x != 0.0 || o.offset.y != 0.0) {
            s = max(s, dilated(in.uv - o.offset * o.texel));            // ずらした影
        }
        s = s * o.amount;
        // 絵の後ろに色を敷く(premultiplied)
        return vec4f(c.rgb + o.color.rgb * s * (1.0 - c.a), c.a + s * (1.0 - c.a));
    }
`});

const pipeline = device.createRenderPipeline({
    layout: 'auto',
    vertex:   { module, entryPoint: 'vs' },
    fragment: { module, entryPoint: 'fs', targets: [{ format, blend: { color: one, alpha: one } }] },
});

// 元テクスチャごとの uniform と bindGroup(最初に使ったとき1回だけ作って使い回す)
const cache = new WeakMap();
function getStage(src) {
    let stage = cache.get(src);
    if (!stage) {
        const buffer = device.createBuffer({ size: 48, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
        const bindGroup = device.createBindGroup({
            layout: pipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: { buffer } },
                { binding: 1, resource: src.createView() },
                { binding: 2, resource: sampler },
            ],
        });
        stage = { buffer, bindGroup };
        cache.set(src, stage);
    }
    return stage;
}

// ----------------------------------------------------------------------------
// 縁取り
//   enc    : commandEncoder
//   color  : [r, g, b, a]  縁の色(0〜1)
//   px     : 縁の大きさ(ピクセル)
//   amount : 濃さ(0〜1)
//   src    : 元のテクスチャ(縁取りなしの絵)
//   dst    : 出力先のテクスチャ(キャンバスなら context.getCurrentTexture())
//   offset : [x, y] 縁をずらす量(影にしたいとき)。省略すると [0, 0]
// ----------------------------------------------------------------------------
export function SetEdge(enc, color, px, amount, src, dst, offset = [0, 0]) {
    const stage = getStage(src);
    device.queue.writeBuffer(stage.buffer, 0, new Float32Array([
        1 / src.width, 1 / src.height, px, amount, ...color, ...offset, 0, 0,
    ]));
    const pass = enc.beginRenderPass({ colorAttachments: [{
        view: dst.createView(), clearValue: [0, 0, 0, 0], loadOp: 'clear', storeOp: 'store',
    }]});
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, stage.bindGroup);
    pass.draw(3);
    pass.end();
}