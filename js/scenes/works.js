import { clips_works, CreateDom, PlayClip } from '../animation_dom.js'

const dom_back = CreateDom(document.querySelector("#works_back"));
const dom_game = CreateDom(document.querySelector("#works_game"));
const dom_illust = CreateDom(document.querySelector("#works_illust"));
const dom_music = CreateDom(document.querySelector("#works_music"));
const dom_bg = CreateDom(document.querySelector("#bggrid"));

let start_time;
let end_time;

let enddone = false;

// ----------------------------------------------------------------------------
// イントロ処理
// ----------------------------------------------------------------------------
export function EnterWorks()
{
    enddone = false;
    start_time = performance.now();

    PlayClip([dom_back], clips_works.works_back, start_time);
    PlayClip([dom_game], clips_works.works_game, start_time);
    PlayClip([dom_illust], clips_works.works_illust, start_time);
    PlayClip([dom_music], clips_works.works_music, start_time);
    PlayClip([dom_bg], clips_works.works_bg, start_time);
}



// ----------------------------------------------------------------------------
// 退場処理
// ----------------------------------------------------------------------------
export function ExitWorks()
{
    
    end_time = performance.now();

    // 仮
    enddone = true;
}

export function GetEndDone()
{
    return enddone;
}