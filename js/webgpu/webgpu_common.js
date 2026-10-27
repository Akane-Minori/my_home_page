// デバイスの取得と、canvasの初期設定だけを担当する
export const format = navigator.gpu.getPreferredCanvasFormat();

const adapter = await navigator.gpu?.requestAdapter();
export const device = await adapter?.requestDevice();
if (!device) throw new Error('WebGPU対応ブラウザが必要です');

export function SetupCanvas(canvas, width, height) {
    const context = canvas.getContext('webgpu');
    canvas.width = width ?? canvas.clientWidth;
    canvas.height = height ?? canvas.clientHeight;
    context.configure({ device, format, alphaMode: 'premultiplied' });
    return context;
}

// ----------------------------------------------------------------------------
// 画像(スプライト)の読み込みと、テクスチャへの描画を担当する
// ----------------------------------------------------------------------------
const sampler = device.createSampler({ magFilter: 'linear', minFilter: 'linear' });
const one = { srcFactor: 'one', dstFactor: 'one-minus-src-alpha' };

const spriteModule = device.createShaderModule({ code: /* wgsl */`
    struct U { canvas : vec2f, center : vec2f, size : vec2f, rot : f32, alpha : f32 };
    @group(0) @binding(0) var<uniform> u : U;
    @group(0) @binding(1) var tex : texture_2d<f32>;
    @group(0) @binding(2) var samp : sampler;
    struct VSOut { @builtin(position) pos : vec4f, @location(0) uv : vec2f };

    @vertex fn vs(@builtin(vertex_index) i : u32) -> VSOut {
        var c = array<vec2f, 6>(
            vec2f(-1,-1), vec2f(1,-1), vec2f(-1,1),
            vec2f(-1,1), vec2f(1,-1), vec2f(1,1)
        );
        let k = c[i];
        let l = k * u.size * 0.5;
        let cs = cos(u.rot); let sn = sin(u.rot);
        let p = u.center + vec2f(l.x*cs - l.y*sn, l.x*sn + l.y*cs);   // 中心を軸に回転
        var o : VSOut;
        o.pos = vec4f(p.x / u.canvas.x * 2.0 - 1.0, 1.0 - p.y / u.canvas.y * 2.0, 0.0, 1.0);
        o.uv = k * 0.5 + 0.5;
        return o;
    }
    @fragment fn fs(in : VSOut) -> @location(0) vec4f {
        return textureSampleLevel(tex, samp, in.uv, 0.0) * u.alpha;
    }
`});

const spritePipeline = device.createRenderPipeline({
    layout: 'auto',
    vertex:   { module: spriteModule, entryPoint: 'vs' },
    fragment: { module: spriteModule, entryPoint: 'fs', targets: [{ format, blend: { color: one, alpha: one } }] },
});

// 画像1枚分のテクスチャ・uniform・bindGroup
export async function LoadSprite(url) {
    const bmp = await createImageBitmap(await (await fetch(url)).blob());
    const texture = device.createTexture({
        size: [bmp.width, bmp.height], format: 'rgba8unorm',
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
    });
    device.queue.copyExternalImageToTexture(
        { source: bmp }, { texture, premultipliedAlpha: true }, [bmp.width, bmp.height]);
    const buffer = device.createBuffer({ size: 32, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    const bindGroup = device.createBindGroup({
        layout: spritePipeline.getBindGroupLayout(0),
        entries: [
            { binding: 0, resource: { buffer } },
            { binding: 1, resource: texture.createView() },
            { binding: 2, resource: sampler },
        ],
    });
    return { buffer, bindGroup };
}

// ----------------------------------------------------------------------------
// items の画像を、target テクスチャに描く
//   items  : 各要素が { x, y, w, h, rotate, ox, oy, scale, rotAnim, buffer, bindGroup } を持つ配列
//            (描く順番に並べておく)
//   target : 描き込み先のテクスチャ
// ----------------------------------------------------------------------------
export function DrawSprites(enc, items, target) {
    const W = target.width, H = target.height;
    const pass = enc.beginRenderPass({ colorAttachments: [{
        view: target.createView(),
        clearValue: [0, 0, 0, 0], loadOp: 'clear', storeOp: 'store',
    }]});
    pass.setPipeline(spritePipeline);
    for (const it of items) {
        device.queue.writeBuffer(it.buffer, 0, new Float32Array([
            W, H,
            it.x + it.w / 2 + it.ox, it.y + it.h / 2 + it.oy,
            it.w * it.scale, it.h * it.scale,
            ((it.rotate || 0) + it.rotAnim) * Math.PI / 180, it.alpha ?? 1,
        ]));
        pass.setBindGroup(0, it.bindGroup);
        pass.draw(6);
    }
    pass.end();
}