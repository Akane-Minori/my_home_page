

const scene_title = document.querySelector("#title");

// 関数宣言
async function InitPage()
{
    // シーンのアクティブ化
    scene_title.classList.add("is-active");

    // もどるボタンにイベントを挿入
    const backbuttons = document.getElementsByClassName("back-title");
    for (let i = 0; i < backbuttons.length; i++)
    {

        backbuttons[i].addEventListener("click", BackTitle);
    }

}





// 初期化
{

    InitPage();
}
