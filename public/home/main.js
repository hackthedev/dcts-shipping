document.addEventListener("DOMContentLoaded", async () => {
    renderDMs();
    renderHome();
})

function getContentElement(){
    return document.querySelector(".layout .content");
}