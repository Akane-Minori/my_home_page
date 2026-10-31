// 回転文字。games / illusts / musics で共通に使う
const spin_svg = document.querySelector('#spin_text');
const spin_text = document.querySelector('#spin_big_text');

// word を渡すと回転文字を表示、渡さないと消す
export function SetSpin(word, repeat)
{
    if (!word)
    {
        spin_svg.classList.remove('is-active');
        return;
    }
    spin_text.textContent = (word + '\u00A0').repeat(repeat);
    spin_svg.classList.add('is-active');
}