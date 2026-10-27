// アニメーションクリップの再生計算
// エディターで作った JSON のクリップと時刻 t から、item の値を書き換える


function EaseLinear(k)
{
    return k;
}
export function EaseStep(k)
{
    if (k < 1) return 0;
    return 1;
}
export function EaseInCubic(k)
{
    return k ** 3;
}
export function EaseOutCubic(k)
{
    return 1 - (1 - k) ** 3;
}
export function EaseInOutCubic(k)
{
    if (k < 0.5) return 4 * k ** 3;
    return 1 - (-2 * k + 2) ** 3 / 2;
}
export function EaseInBack(k)
{
    return 2.70158 * k ** 3 - 1.70158 * k * k;
}
export function EaseOutBack(k)
{
    return 1 + 2.70158 * (k - 1) ** 3 + 1.70158 * (k - 1) ** 2;
}
export function EaseOutBounce(k)
{
        const n = 7.5625, d = 2.75;
        if (k < 1 / d) return n * k * k;
        if (k < 2 / d) return n * (k -= 1.5 / d) * k + 0.75;
        if (k < 2.5 / d) return n * (k -= 2.25 / d) * k + 0.9375;
        return n * (k -= 2.625 / d) * k + 0.984375;
}

const EASE = {
    linear: EaseLinear,
    step: EaseStep,
    easeInCubic: EaseInCubic,
    easeOutCubic: EaseOutCubic,
    easeInOutCubic: EaseInOutCubic,
    easeInBack: EaseInBack,
    easeOutBack: EaseOutBack,
    easeOutBounce: EaseOutBounce,
};

export function Ease(name, k) {
    const f = EASE[name];
    if (!f) throw new Error(`イージング名が違います: ${name}`);
    return f(k);
}

// トラックを持たない項目の値
const DEFAULT = { ox: 0, oy: 0, scale: 1, rotAnim: 0, alpha: 1, blind: 1, mono: 0 };

// ----------------------------------------------------------------------------
// キー配列(時刻順)から、時刻 t の値を求める
// ----------------------------------------------------------------------------
function EvalTrack(keys, t, def) {
    if (!keys || keys.length === 0) return def;
    if (t <= keys[0].t) return keys[0].v;
    const last = keys[keys.length - 1];
    if (t >= last.t) return last.v;
    let i = 0;
    while (keys[i + 1].t <= t) i++;
    const a = keys[i], b = keys[i + 1];
    const k = (t - a.t) / (b.t - a.t);
    return a.v + (b.v - a.v) * EASE[a.ease || 'linear'](k);
}

// ----------------------------------------------------------------------------
// clip の t 秒目の状態を item に書き込む
// ----------------------------------------------------------------------------
export function ApplyClip(item, clip, t) {
    if (clip.loop) t %= clip.duration;
    else t = Math.min(t, clip.duration);
    if (clip.fps > 0) t = Math.floor(t * clip.fps + 1e-6) / clip.fps;

    let changed = false;
    for (const p in DEFAULT) {
        const v = EvalTrack(clip.tracks[p], t, DEFAULT[p]);
        if (item[p] !== v) { item[p] = v; changed = true; }
    }
    return changed;
}