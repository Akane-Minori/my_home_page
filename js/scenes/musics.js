import { SetSpin } from '../spintext.js';

const audio = new Audio();
const $ = (id) => document.getElementById(id);
const ui = {
    title: $('music_title'), date: $('music_date'), comment: $('music_comment'),
    current: $('music_current'), duration: $('music_duration'),
    bar: $('music_bar'), fill: $('music_bar').querySelector('i'),
    play: $('music_play'), prev: $('music_prev'), next: $('music_next'),
    download: $('music_download'), list: $('music_list'),
};

let tracks = [];
let index = 0;

function Format(sec)
{
    if (!isFinite(sec)) return '0:00';
    return `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;
}

// 曲を選ぶ(play が true なら、そのまま再生する)
function Select(i, play)
{
    index = (i + tracks.length) % tracks.length;
    const t = tracks[index];

    audio.src = t.file;
    ui.title.textContent = t.title;
    ui.date.textContent = t.date ?? '';
    ui.comment.textContent = t.comment ?? '';
    ui.download.href = t.file;
    ui.current.textContent = ui.duration.textContent = '0:00';
    ui.fill.style.width = '0%';
    [...ui.list.children].forEach((li, n) => li.classList.toggle('now', n === index));

    if (play) audio.play();
}

async function Load()
{
    if (tracks.length > 0) return;
    tracks = await (await fetch('./json/musics.json')).json();

    tracks.forEach((t, n) =>
    {
        const li = document.createElement('li');
        li.textContent = `${n + 1}. ${t.title}`;
        li.addEventListener('click', () => Select(n, true));
        ui.list.append(li);
    });
    Select(0, false);
}

audio.addEventListener('loadedmetadata', () => ui.duration.textContent = Format(audio.duration));
audio.addEventListener('timeupdate', () =>
{
    ui.current.textContent = Format(audio.currentTime);
    ui.fill.style.width = `${(audio.currentTime / audio.duration || 0) * 100}%`;
});
audio.addEventListener('play',  () => ui.play.textContent = '⏸');
audio.addEventListener('pause', () => ui.play.textContent = '▶');
audio.addEventListener('ended', () => Select(index + 1, index + 1 < tracks.length));

ui.play.addEventListener('click', () => audio.paused ? audio.play() : audio.pause());
ui.prev.addEventListener('click', () => Select(index - 1, !audio.paused));
ui.next.addEventListener('click', () => Select(index + 1, !audio.paused));
ui.bar.addEventListener('click', (e) =>
{
    if (!isFinite(audio.duration)) return;
    const r = ui.bar.getBoundingClientRect();
    audio.currentTime = audio.duration * (e.clientX - r.left) / r.width;
});

export async function EnterMusics()
{
    SetSpin("MUSICS", 4);
    await Load();
}

export function ExitMusics()
{
    audio.pause();
    audio.currentTime = 0;
    SetSpin();
}