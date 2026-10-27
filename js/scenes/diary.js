
let start_time;
let end_time;

let enddone = false;


// ----------------------------------------------------------------------------
// イントロ処理
// ----------------------------------------------------------------------------
export function EnterDiary()
{
    enddone = false;
    start_time = performance.now();

    
}



// ----------------------------------------------------------------------------
// 退場処理
// ----------------------------------------------------------------------------
export function ExitDiary()
{
    end_time = performance.now();

    // 仮
    enddone = true;
}

export function GetEndDone()
{
    return enddone;
}