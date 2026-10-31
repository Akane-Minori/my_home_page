import { SetSpin } from '../spintext.js';


let start_time;
let end_time;

let enddone = false;

// ----------------------------------------------------------------------------
// イントロ処理
// ----------------------------------------------------------------------------
export function EnterMusics()
{
    enddone = false;
    start_time = performance.now();

    SetSpin("MUSICS", 4);
}



// ----------------------------------------------------------------------------
// 退場処理
// ----------------------------------------------------------------------------
export function ExitMusics()
{
    end_time = performance.now();

    SetSpin();

    // 仮
    enddone = true;
}

export function GetEndDone()
{
    return enddone;
}