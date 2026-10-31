// コマ割りの幾何計算(エディターとサイトで共有する。DOM には触らない)
// 座標は、ページの幅 W = 1.0 とした単位。x は右、y は下

// コマの点の番号の並びから、座標の並びを作る
export function PanelPoints(data, panel)
{
    return panel.points.map(i => data.points[i]);
}

// 符号付き面積(0 に近いと、つぶれたコマ)
export function SignedArea(pts)
{
    let a = 0;
    for (let i = 0; i < pts.length; i++)
    {
        const [x1, y1] = pts[i];
        const [x2, y2] = pts[(i + 1) % pts.length];
        a += x1 * y2 - x2 * y1;
    }
    return a / 2;
}

// へこんでいない形かどうか
export function IsConvex(pts)
{
    let sign = 0;
    for (let i = 0; i < pts.length; i++)
    {
        const [ax, ay] = pts[i];
        const [bx, by] = pts[(i + 1) % pts.length];
        const [cx, cy] = pts[(i + 2) % pts.length];
        const cross = (bx - ax) * (cy - by) - (by - ay) * (cx - bx);
        if (Math.abs(cross) < 1e-9) continue;
        const s = Math.sign(cross);
        if (sign === 0) sign = s;
        else if (s !== sign) return false;
    }
    return true;
}

// 外接する四角形
export function Bounds(pts)
{
    const xs = pts.map(p => p[0]);
    const ys = pts.map(p => p[1]);
    return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
}

// 各辺を gap の半分だけ内側へずらして、隣り合う辺の交点を新しい頂点にする
// 隣のコマも同じだけ縮むので、隙間の幅が全体で gap になる
export function ShrinkPolygon(pts, gap)
{
    const n = pts.length;
    const h = gap / 2;
    const side = SignedArea(pts) > 0 ? 1 : -1;   // 内側が、進行方向の左か右か

    // 各辺を内側へ h ずらした直線(通る点 p、向き d、内向きの法線 n)
    const lines = [];
    for (let i = 0; i < n; i++)
    {
        const [x1, y1] = pts[i];
        const [x2, y2] = pts[(i + 1) % n];
        const len = Math.hypot(x2 - x1, y2 - y1) || 1;
        const dx = (x2 - x1) / len;
        const dy = (y2 - y1) / len;
        const nx = -dy * side;
        const ny = dx * side;
        lines.push({ px: x1 + nx * h, py: y1 + ny * h, dx, dy });
    }

    const out = [];
    for (let i = 0; i < n; i++)
    {
        const a = lines[(i + n - 1) % n];   // 頂点 i に入ってくる辺
        const b = lines[i];                 // 頂点 i から出ていく辺
        const cross = a.dx * b.dy - a.dy * b.dx;

        let x, y;
        if (Math.abs(cross) < 1e-9)
        {
            x = b.px;                       // 平行なら、ずらした辺の始点
            y = b.py;
        }
        else
        {
            const t = ((b.px - a.px) * b.dy - (b.py - a.py) * b.dx) / cross;
            x = a.px + a.dx * t;
            y = a.py + a.dy * t;
        }

        // 鋭角で頂点が遠くへ飛ばないように、元の頂点からの距離を抑える
        const [ox, oy] = pts[i];
        const dist = Math.hypot(x - ox, y - oy);
        const limit = h * 4;
        if (dist > limit)
        {
            x = ox + (x - ox) * limit / dist;
            y = oy + (y - oy) * limit / dist;
        }

        out.push([x, y]);
    }
    return out;
}

// コマの中に、絵を「枠を埋める」大きさで置いた位置を返す
//   box   : Bounds の結果(縮めた後の形で測る)
//   focus : 絵の中で見せたい位置(0〜1)。枠の中心に来るように置く
//   zoom  : 枠を埋める大きさから、さらに拡大する倍率(1 以上)
export function FitImage(box, imgW, imgH, focus = [0.5, 0.5], zoom = 1)
{
    const bw = box.x1 - box.x0;
    const bh = box.y1 - box.y0;
    const scale = Math.max(bw / imgW, bh / imgH) * zoom;
    const w = imgW * scale;
    const h = imgH * scale;

    let x = (box.x0 + box.x1) / 2 - focus[0] * w;
    let y = (box.y0 + box.y1) / 2 - focus[1] * h;
    x = Math.min(Math.max(x, box.x1 - w), box.x0);   // 枠からはみ出さない範囲に収める
    y = Math.min(Math.max(y, box.y1 - h), box.y0);
    return { x, y, w, h };
}

// SVG の points 属性の文字列にする
export function PointsAttr(pts)
{
    return pts.map(p => `${p[0]},${p[1]}`).join(' ');
}

// データの点検。問題があれば、メッセージの配列で返す
export function Validate(data)
{
    const warnings = [];
    for (const panel of data.panels)
    {
        const pts = PanelPoints(data, panel);
        if (pts.some(p => !p)) { warnings.push(`${panel.id}: 存在しない点を使っています`); continue; }
        if (pts.length < 3) { warnings.push(`${panel.id}: 点が3つ未満です`); continue; }
        if (Math.abs(SignedArea(pts)) < 1e-6) warnings.push(`${panel.id}: つぶれています`);
        else if (!IsConvex(pts)) warnings.push(`${panel.id}: へこんだ形です`);
    }
    return warnings;
}