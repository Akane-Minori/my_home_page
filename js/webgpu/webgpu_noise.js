// ノイズの描き方だけを担当する。色と時間は、使う側から渡す
import { device, format } from './webgpu_common.js';

const vertices = new Float32Array([
    -1.0,  1.0,   // 0: 左上
    -1.0, -1.0,   // 1: 左下
     1.0, -1.0,   // 2: 右下
     1.0,  1.0,   // 3: 右上
]);
const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);

const vertex_buffer = device.createBuffer({
    size: vertices.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
});
device.queue.writeBuffer(vertex_buffer, 0, vertices);

const index_buffer = device.createBuffer({
    size: indices.byteLength,
    usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
});
device.queue.writeBuffer(index_buffer, 0, indices);

const module = device.createShaderModule({
    code: /* wgsl */ `

    struct Uniforms
    {
        tint : vec3f,
        time : f32,
        scale : vec2f,
        threshold : f32,
    };
    @group(0) @binding(0) var<uniform> u_data : Uniforms;

    struct VSOut {
        @builtin(position) position : vec4f,
        @location(0) uv : vec2f,
    };

    @vertex fn vs(
        @location(0) position : vec2f
    ) -> VSOut {
        var out : VSOut;
        out.position = vec4f(position, 0.0, 1.0);
        out.uv = position;
        return out;
    }

    fn pre_hash3(p : vec3f) -> f32 {
        var q = fract(p * vec3f(123.34, 456.21, 789.53));
        q += dot(q, q.yzx + 45.32);
        return fract((q.x + q.y) * q.z);
    }

    fn hash3(p : vec3f) -> vec3f {
        let a = pre_hash3(p);
        let b = pre_hash3(p + vec3f(37.0, 91.0, 17.0));
        let c = pre_hash3(p + vec3f(71.0, 13.0, 53.0));
        return vec3f(a, b, c) * 2.0 - 1.0;
    }

    fn noise3(p : vec3f) -> f32 {
        let i = floor(p);
        let f = fract(p);

        let g000 = hash3(i + vec3f(0.0, 0.0, 0.0));
        let g100 = hash3(i + vec3f(1.0, 0.0, 0.0));
        let g010 = hash3(i + vec3f(0.0, 1.0, 0.0));
        let g110 = hash3(i + vec3f(1.0, 1.0, 0.0));
        let g001 = hash3(i + vec3f(0.0, 0.0, 1.0));
        let g101 = hash3(i + vec3f(1.0, 0.0, 1.0));
        let g011 = hash3(i + vec3f(0.0, 1.0, 1.0));
        let g111 = hash3(i + vec3f(1.0, 1.0, 1.0));

        let v000 = dot(g000, f - vec3f(0.0, 0.0, 0.0));
        let v100 = dot(g100, f - vec3f(1.0, 0.0, 0.0));
        let v010 = dot(g010, f - vec3f(0.0, 1.0, 0.0));
        let v110 = dot(g110, f - vec3f(1.0, 1.0, 0.0));
        let v001 = dot(g001, f - vec3f(0.0, 0.0, 1.0));
        let v101 = dot(g101, f - vec3f(1.0, 0.0, 1.0));
        let v011 = dot(g011, f - vec3f(0.0, 1.0, 1.0));
        let v111 = dot(g111, f - vec3f(1.0, 1.0, 1.0));

        let u = f * f * (3.0 - 2.0 * f);

        let x00 = mix(v000, v100, u.x);
        let x10 = mix(v010, v110, u.x);
        let x01 = mix(v001, v101, u.x);
        let x11 = mix(v011, v111, u.x);

        let y0 = mix(x00, x10, u.y);
        let y1 = mix(x01, x11, u.y);

        return mix(y0, y1, u.z);
    }

    @fragment fn fs(input : VSOut) -> @location(0) vec4f
    {
        let uv = input.uv * u_data.scale;
        let flow = u_data.time * 0.02;     // 流れる速さ
        let morph = u_data.time * 0.002;   // 形が変わる速さ

        let wave = sin(uv.x * 2.7 + noise3(vec3f(uv.x * 0.8, 0.0, morph)) * 3.0) * 1.2;

        let base = vec3f(uv.x, uv.y, morph);
        let w = vec2f(
            noise3(base),
            noise3(base + vec3f(5.2, 1.3, 0.0))
        );

        let q = vec3f(uv.x * 0.3 + flow + w.x * 0.2, uv.y * 0.45 + wave + w.y, morph);
        let n = noise3(q);

        let m = smoothstep(u_data.threshold - 0.0002, u_data.threshold + 0.0002, n);
        return vec4f(u_data.tint * m, m);
    }
`,
});

const pipeline = device.createRenderPipeline({
    layout: 'auto',
    vertex: {
        module,
        entryPoint: 'vs',
        buffers: [{
            arrayStride: 8,
            attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x2' }],
        }],
    },
    fragment: { module, entryPoint: 'fs', targets: [{ format }] },
});

// ----------------------------------------------------------------------------
// tint : 模様の色 [r, g, b](0〜1)
// 戻り値 : Render(context, time)  context のcanvasに、time 秒ぶんのノイズを描く
// ----------------------------------------------------------------------------
export function CreateNoise(tint, threshold = -0.043, scale = [1.0, 4.0])
{
    const uniform_buffer = device.createBuffer({
        size: 32,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    const bind_group = device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [{ binding: 0, resource: { buffer: uniform_buffer } }],
    });

    return function Render(context, time) {
        device.queue.writeBuffer
        (
            uniform_buffer, 0,
            new Float32Array([...tint, time, ...scale, threshold])
        );

        const encoder = device.createCommandEncoder();
        const pass = encoder.beginRenderPass({
            colorAttachments: [{
                view: context.getCurrentTexture().createView(),
                clearValue: [0, 0, 0, 0],
                loadOp: 'clear',
                storeOp: 'store',
            }],
        });
        pass.setPipeline(pipeline);
        pass.setBindGroup(0, bind_group);
        pass.setVertexBuffer(0, vertex_buffer);
        pass.setIndexBuffer(index_buffer, 'uint16');
        pass.drawIndexed(6);
        pass.end();
        device.queue.submit([encoder.finish()]);
    };
}