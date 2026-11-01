// ゲーム詳細カード
const card = document.querySelector('#game_card');
const title = document.querySelector('#game_card_title');
const text = document.querySelector('#game_card_text');
const link = document.querySelector('#game_card_link');

const images = document.querySelector('#game_card_images');
const image = document.querySelector('#game_card_image');
const prev = document.querySelector('#game_card_prev');
const next = document.querySelector('#game_card_next');
const count = document.querySelector('#game_card_count');

let list = [];      // 紹介画像のパス
let index = 0;      // いま表示している番号

function ShowImage()
{
    image.src = list[index];
    count.textContent = (index + 1) + ' / ' + list.length;
}

// 左右ボタン(data-step の値だけ動かして、端まで行ったら反対側へ)
function OnStep(e)
{
    index = (index + Number(e.currentTarget.dataset.step) + list.length) % list.length;
    ShowImage();
}

// data: games.json の1件分
export function OpenCard(data)
{
    title.textContent = data.title ?? '';
    text.textContent = data.text ?? '';
    link.hidden = !data.url;
    if (data.url) link.href = data.url;

    list = data.card_imgs ?? [];
    index = 0;
    const single = list.length < 2;
    images.hidden = list.length === 0;
    prev.hidden = single;
    next.hidden = single;
    count.hidden = single;
    if (list.length) ShowImage();

    card.hidden = false;
}

export function CloseCard()
{
    card.hidden = true;
}

export function IsCardOpen()
{
    return !card.hidden;
}

prev.addEventListener('click', OnStep);
next.addEventListener('click', OnStep);

// 閉じる操作:カードの外側、Esc
card.addEventListener('click', (e) => { if (e.target === card) CloseCard(); });
window.addEventListener('keydown', (e) => { if (e.key === 'Escape') CloseCard(); });