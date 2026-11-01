// イラスト詳細表示
const card = document.querySelector('#illust_card');
const img = document.querySelector('#illust_card_img');
const date = document.querySelector('#illust_card_date');
const comment = document.querySelector('#illust_card_comment');

let token = 0;      // 開くたびに増やす番号。閉じたあとに届いた画像を捨てるために使う

// サムネは、原寸と同じ名前で thumbs フォルダに置く
//   ./img/illusts/a.png → ./img/illusts/thumbs/a.png
const THUMB_DIR = 'thumb';
export function ThumbPath(img)
{
    return img.replace(/[^/]+$/, (name) => `${THUMB_DIR}/${name}`);
}

// data: illusts.json の1コマ分 / ratio: 絵の 幅÷高さ(開いた瞬間に大きさを決めるため)
export function OpenIllustCard(data, ratio = 1)
{
    const my = ++token;

    img.style.setProperty('--ar', ratio);
    img.alt = data.comment ?? '';

    // 先にサムネを出す(一覧で読み込み済みなので、通信は増えない)
    if (data.img) img.src = ThumbPath(data.img);
    else img.removeAttribute('src');

    // 原寸は、ここで初めて読む。読み終わったら差し替える
    if (data.img)
    {
        const full = new Image();
        full.src = data.img;
        full.decode().then(() => { if (my === token) img.src = data.img; }).catch(() => {});
    }

    date.textContent = (data.date ?? '').replaceAll('-', '.');
    date.hidden = !data.date;
    comment.textContent = data.comment ?? '';
    comment.hidden = !data.comment;

    card.hidden = false;
}

export function CloseIllustCard()
{
    token++;
    card.hidden = true;
    img.removeAttribute('src');     // 大きい画像のメモリを手放す
}

export function IsIllustCardOpen()
{
    return !card.hidden;
}

// 閉じる操作:カードの外側、Esc
card.addEventListener('click', (e) => { if (e.target === card) CloseIllustCard(); });
window.addEventListener('keydown', (e) => { if (e.key === 'Escape') CloseIllustCard(); });