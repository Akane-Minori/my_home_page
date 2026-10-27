import * as Animation from '../animation.js'
import { clips, CreateDom, PlayClip } from '../animation_dom.js'

let start_time;
let end_time;

let enddone =
{
    paper: false,
    coffee: false,
    background: false,
}

const paperarea = document.querySelector("#hello_paper");
const coffeearea = document.querySelector("#hello_backbutton");
const backgroundarea = document.querySelector("#hello_bg");

const dom_paper = CreateDom(paperarea, { pre: "translateX(-50%)", rotate: -2 });
const dom_coffee = CreateDom(coffeearea);
const dom_background = CreateDom(backgroundarea);

const exit_hello =
{
    time: 0.42,
}



// ----------------------------------------------------------------------------
// イントロ処理
// ----------------------------------------------------------------------------
export function EnterHello()
{
    enddone.paper = false;
    enddone.coffee = false;
    enddone.background = false;

    start_time = performance.now();

    PlayClip([dom_paper], clips.hello_paper, start_time);
    PlayClip([dom_coffee], clips.hello_coffee, start_time);
    PlayClip([dom_background], clips.hello_bg, start_time);
}



// ----------------------------------------------------------------------------
// 退場処理
// ----------------------------------------------------------------------------
export function ExitHello()
{
    end_time = performance.now();

    requestAnimationFrame(Exit_TickPaper);
    requestAnimationFrame(Exit_TickCoffee);
    requestAnimationFrame(Exit_TickBackground);
}

function Exit_TickPaper(now)
{
    const time = (now - end_time) / 1000.0;
    const k = Math.min(time / exit_hello.time, 1.0);
    const progress = Animation.EaseOutCubic(k);

    paperarea.style.opacity = 1.0 - progress;

    if (k < 1.0) requestAnimationFrame(Exit_TickPaper);
    else enddone.paper = true;
}

function Exit_TickCoffee(now)
{
    const time = (now - end_time) / 1000.0;
    const k = Math.min(time / exit_hello.time, 1.0);
    const progress = Animation.EaseOutCubic(k);

    coffeearea.style.opacity = 1.0 - progress;

    if (k < 1.0) requestAnimationFrame(Exit_TickCoffee);
    else enddone.coffee = true;
}

function Exit_TickBackground(now)
{
    const time = (now - end_time) / 1000.0;
    const k = Math.min(time / exit_hello.time, 1.0);
    const progress = Animation.EaseOutCubic(k);

    backgroundarea.style.opacity = 1.0 - progress;

    if (k < 1.0) requestAnimationFrame(Exit_TickBackground);
    else enddone.background = true;
}



export function GetEndDone()
{
    return enddone.paper && enddone.coffee && enddone.background;
}