const list  = document.querySelector('#diary_list');
const card  = document.querySelector('#diary_card');
const body  = document.querySelector('#diary_card_body');
const date  = document.querySelector('#diary_card_date');
const title = document.querySelector('#diary_card_title');
const text  = document.querySelector('#diary_card_text');

let loaded = false;

// マークダウンを安全な HTML にする。画像1枚だけの段落は、中央揃えの図 + キャプションにする
function RenderBody(md)
{
    const box = document.createElement('div');
    box.innerHTML = DOMPurify.sanitize(marked.parse(md, { breaks: true }));

    box.querySelectorAll('p').forEach(p =>
    {
        const img = p.querySelector(':scope > img');
        if (!img || p.children.length !== 1 || p.textContent.trim() !== '') return;

        const fig = document.createElement('figure');
        fig.append(img);
        if (img.alt)
        {
            const cap = document.createElement('figcaption');
            cap.textContent = img.alt;
            fig.append(cap);
        }
        p.replaceWith(fig);
    });

    box.querySelectorAll('a').forEach(a => { a.target = '_blank'; a.rel = 'noopener'; });
    return box;
}

function OpenCard(a)
{
    date.textContent = a.date ?? '';
    title.textContent = a.title ?? '';
    text.replaceChildren(...RenderBody(a.body ?? '').childNodes);
    body.scrollTop = 0;
    card.hidden = false;
}

export function CloseCard()
{
    card.hidden = true;
}

async function Load()
{
    if (loaded) return;

    let articles;
    try { articles = await (await fetch('./json/diary.json')).json(); }
    catch { list.textContent = '記事を読み込めませんでした'; return; }

    if (articles.length === 0) { list.textContent = 'まだ記事がありません'; loaded = true; return; }

    articles.sort((a, b) => b.date.localeCompare(a.date));      // 新しい順
    for (const a of articles)
    {
        const row = document.createElement('div');
        row.className = 'diary_item';
        row.innerHTML = '<span class="diary_item_date"></span><span class="diary_item_title"></span>';
        row.children[0].textContent = a.date;
        row.children[1].textContent = a.title;
        row.addEventListener('click', () => OpenCard(a));
        list.append(row);
    }
    loaded = true;
}

// 閉じる操作:カードの外側、Esc
card.addEventListener('click', (e) => { if (e.target === card) CloseCard(); });
window.addEventListener('keydown', (e) => { if (e.key === 'Escape') CloseCard(); });

export async function EnterDiary()
{
    await Load();
}

export function ExitDiary()
{
    CloseCard();
}