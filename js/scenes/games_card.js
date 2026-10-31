// ゲーム詳細カード
const card = document.querySelector('#game_card');
const title = document.querySelector('#game_card_title');
const text = document.querySelector('#game_card_text');
const link = document.querySelector('#game_card_link');
const close = document.querySelector('#game_card_close');

// data: games.json の1件分
export function OpenCard(data)
{
    title.textContent = data.title ?? '';
    text.textContent = data.text ?? '';
    link.hidden = !data.url;
    if (data.url) link.href = data.url;
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

// 閉じる操作:ボタン、カードの外側、Esc
close.addEventListener('click', CloseCard);
card.addEventListener('click', (e) => { if (e.target === card) CloseCard(); });
window.addEventListener('keydown', (e) => { if (e.key === 'Escape') CloseCard(); });