import { ChangeBGFrame } from '../webgpu/webgpu_bgframe.js';
import * as Animation from '../animation.js'
import { clips, clips_works, CreateDom, PlayClip, ResetDom } from '../animation_dom.js';
import { PlayLogo } from '../webgpu/webgpu_logo.js';
import { PreloadWorks } from './works.js'

let start_time;
let end_time;

let enddone =
{
    button: false,
    logo: false,
    frame: false,
    background: false,
}

const logoarea = document.querySelector("#logo");
const cloudarea = document.querySelector("#title_cloud");
const button_hello = document.querySelector("#button_hello");
const button_works = document.querySelector("#button_works");
const button_diary = document.querySelector("#button_diary");

const logoshrink = 
{
    start: 1.25,
    end: 1.0,
    starttime: 0.6,
    time: 0.5
}

const bgframe_edge =
{
    start:
    {
        px: 120,
        interval: 1000,
        amount: 0.0,
    },
    end:
    {
        px: 3,
        interval:250,
        amount: 1.0,
    },
    color: [0.67, 0.93, 1.0, 1], 
    time: 1.0
}

const enter_button =
{
    interval: 0.06,
    color: [1.0, 0.7, 0.0, 1.0],
    time: 0.42,
}

const dom_logo = CreateDom(logoarea);
const dom_buttons = [button_hello, button_works, button_diary].map(b => CreateDom(b));
const dom_bgframe = CreateDom(document.querySelector("#bgframe"));
const dom_cloud = CreateDom(cloudarea);
PreloadWorks();


// ----------------------------------------------------------------------------
// イントロ処理
// ----------------------------------------------------------------------------
export function EnterTitle()
{
    enddone.button = false;
    enddone.logo = false;
    enddone.frame = false;
    enddone.background = false;
    
    ResetDom(dom_logo);
    ResetDom(dom_cloud);
    ResetDom(dom_bgframe);
    dom_buttons.forEach(ResetDom);

    logoarea.style.opacity = 1.0;
    cloudarea.style.opacity = 1.0;
    cloudarea.style.transform = "";
    start_time = performance.now();

    requestAnimationFrame(Enter_TickLogo)
    requestAnimationFrame(Enter_TickFrame);
    requestAnimationFrame(Enter_TickButton);

    PlayLogo();
}

function Enter_TickLogo(now)
{
    const time = (now - start_time) / 1000.0;
    let k = (time - logoshrink.starttime) / logoshrink.time;
    if (k < 0.0) k = 0.0;
    const progress = Animation.EaseInOutCubic(k);

    const logoscale = progress * (logoshrink.end - logoshrink.start) + logoshrink.start;

    logoarea.style.transform = `scale(${logoscale})`
    if ( k < 1.0) requestAnimationFrame(Enter_TickLogo);
}
function Enter_TickFrame(now)
{
    const time = (now - start_time) / 1000.0;
    const k = time / bgframe_edge.time;
    const progress = Animation.EaseOutCubic(k);

    const px = progress * (bgframe_edge.end.px - bgframe_edge.start.px) + bgframe_edge.start.px;
    const interval = progress * (bgframe_edge.end.interval - bgframe_edge.start.interval) + bgframe_edge.start.interval;
    const amount = progress * (bgframe_edge.end.amount - bgframe_edge.start.amount) + bgframe_edge.start.amount;

    ChangeBGFrame(bgframe_edge.color, px, amount, interval);
    if ( k < 1.0) requestAnimationFrame(Enter_TickFrame);
}

function Enter_TickButton(now)
{
    const time = (now - start_time) / 1000.0;
    const n = Math.floor(time / enter_button.interval);

    const k = time / enter_button.time;

    if (n % 2 === 0)
    {
        button_hello.style.filter = "url(#flash_orange)";
        button_works.style.filter = "url(#flash_orange)";
        button_diary.style.filter = "url(#flash_orange)";

    }
    else
    {
        button_hello.style.filter = "opacity(0)";
        button_works.style.filter = "opacity(0)";
        button_diary.style.filter = "opacity(0)";
    }

    if ( k < 1.0) requestAnimationFrame(Enter_TickButton);
    else
    {
        button_hello.style.filter = "none";
        button_works.style.filter = "none";
        button_diary.style.filter = "none";
    }
}

EnterTitle();


// ----------------------------------------------------------------------------
// 退場処理
// ----------------------------------------------------------------------------
export function ExitTitle(next)
{
    end_time = performance.now();
    const c = (next === "works") ? clips_works : clips;

    PlayClip([dom_logo], c.title_logo, end_time, () => { enddone.logo = true; });
    PlayClip(dom_buttons, c.title_buttons, end_time, () => { enddone.button = true; });
    PlayClip([dom_bgframe, dom_cloud], c.title_bg, end_time, () =>
    {
        enddone.frame = true;
        enddone.background = true;
    });
}

export function GetEndDone()
{
    return enddone.button && enddone.logo && enddone.frame && enddone.background;
}