document.addEventListener("DOMContentLoaded", () => {
    if (!isLocal()) getHeaderEndBar().style.display = "flex";
})

function getHeaderEndBar(){
    return document.querySelector(`.layout > .header .end-bar`);
}