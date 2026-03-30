var socket = io.connect();
let splash;

Element.prototype.fadeIn = function (duration = 300, display = "block") {
    const el = this;

    if (getComputedStyle(el).display !== "none") return;
    if (el._fadeAnim) cancelAnimationFrame(el._fadeAnim);

    el.style.opacity = 0;
    el.style.display = display;

    const start = performance.now();

    function tick(now) {
        const progress = (now - start) / duration;
        const value = Math.min(progress, 1);

        el.style.opacity = value;

        if (value < 1) {
            el._fadeAnim = requestAnimationFrame(tick);
        } else {
            el.style.opacity = "";
            el._fadeAnim = null;
        }
    }

    el._fadeAnim = requestAnimationFrame(tick);
};

document.addEventListener("DOMContentLoaded", async () => {
    splash = new SplashScreen(document.body);
    splash.show()

    MobilePanel.setLeftMenu([
        {
            direction: "column",
            children: [
                document.querySelector("#navigation")
            ]
        }
    ], "left");

    ChatManager.checkConnection(2000)
    await ChatManager.waitForSocket(socket);
    ChatManager.wasConnected = true;
    ContextMenu.init()

    await ChatManager.userJoined(
        null,
        null,
        null,
        null,
        null,
        async (response) => {
            renderDMs();

            if(ChatManager.getUrlParams("dm")){
                renderDmRoom(ChatManager.getUrlParams("dm"));
            }
            else{
                renderHome();
            }

            registerHomeContextMenu();

            splash.hide();
        },
    );

    getContentElement().fadeIn(250, "flex")
})

function getContentElement(){
    return document.querySelector(".layout .content");
}

function getSiteBannerElement(){
    return getContentElement().querySelector(".site-banner");
}

function goBackToChat(){
    if(ChatManager.isIframe()){
        ChatManager.closePagePopup('homeScreen');
    }
    else{
        window.location.href = "/"
    }
}

const ICONS = {
    edit_black: `<svg class="svg-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path fill="#000" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm2.92 2.33H5v-.92L14.06 7.5l.92.92L5.92 19.58zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>`,
    edit: `<svg class="svg-icon" viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm2.92 2.33H5v-.92L14.06 7.5l.92.92L5.92 19.58zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>`,
    pin: `<svg class="svg-icon" viewBox="0 0 24 24"><path d="M16 9V3H8v6l-2 4v2h6v7l2-7h4v-2l-2-4z"/></svg>`,
    unpin: `<svg class="svg-icon" viewBox="0 0 24 24"><path d="M3 5.27 4.28 4l15.5 15.5L18.5 21l-6.5-6.5L9 21v-7H5v-2l2-4V5h1.73L3 5.27zM16 9l2 4v2h-2.73l-5-5H16V3h-2v4h2v2z"/></svg>`,
    del: `<svg class="svg-icon" viewBox="0 0 24 24"><path d="M6 7h12v2H6V7zm2 3h8l-1 9H9L8 10zm3-6h2l1 1h4v2H6V5h4l1-1z"/></svg>`
};


async function getServerInfo(){
    return new Promise((resolve, reject) => {
        socket.emit("getServerInfo", {id: UserManager.getID(), token: UserManager.getToken() }, function (response) {
            resolve(response);
        })
    })
}