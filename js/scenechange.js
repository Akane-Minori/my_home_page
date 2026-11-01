import * as Title from './scenes/title.js';
import * as Hello from './scenes/hello.js';
import * as Works from './scenes/works.js';
import * as Games from './scenes/games.js';
import * as Illusts from './scenes/illusts.js';
import * as Musics from './scenes/musics.js';
import * as Diary from './scenes/diary.js';
import { SetNoise } from './webgpu/webgpu_noiseobject.js';

let current_scene = "title";

const scenes =
{
    title: { enter: Title.EnterTitle, exit: Title.ExitTitle, done: Title.GetEndDone, noise: "title" },
    hello: { enter: Hello.EnterHello, exit: Hello.ExitHello, done: Hello.GetEndDone },
    works: { enter: Works.EnterWorks, exit: Works.ExitWorks, done: Works.GetEndDone },
    games: { enter: Games.EnterGames, exit: Games.ExitGames, done: Games.GetEndDone },
    illusts: { enter: Illusts.EnterIllusts, exit: Illusts.ExitIllusts, done: Illusts.GetEndDone, noise: "illusts" },
    musics: { enter: Musics.EnterMusics, exit: Musics.ExitMusics, done: Musics.GetEndDone },
    diary: { enter: Diary.EnterDiary, exit: Diary.ExitDiary, done: Diary.GetEndDone },
}

let next_scene = "";
let exit_scene = "";

function CheckExit()
{
    if (scenes[exit_scene].done())
    {
        document.getElementById(exit_scene).classList.remove('is-active');
        if (!scenes[current_scene].noise) SetNoise(null);
    }
    else
    {
        requestAnimationFrame(CheckExit);
    }
}

// ----------------------------------------------------------------------------
// シーン遷移の処理付け
// ----------------------------------------------------------------------------
export function ChangeScene(id) {
    exit_scene = current_scene;
    next_scene = id;
    current_scene = id;

    scenes[exit_scene].exit(next_scene);
    document.getElementById(next_scene).classList.add('is-active');
    if (scenes[next_scene].noise) SetNoise(scenes[next_scene].noise);
    scenes[next_scene].enter();

    CheckExit();
}

const buttons = document.querySelectorAll('[data-scene]');
for (let i = 0; i < buttons.length; i++) {
    buttons[i].addEventListener('click', ChangeScene.bind(null, buttons[i].dataset.scene));
}