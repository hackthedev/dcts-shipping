var socket = io.connect();

document.addEventListener("DOMContentLoaded", async () => {
    await ChatManager.waitForSocket(socket);

    ChatManager.applyThemeOnLoad(UserManager.getTheme(), UserManager.getThemeAccent());
    renderDMs();
    renderHome();
})

function getContentElement(){
    return document.querySelector(".layout .content");
}