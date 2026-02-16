isShown = false;

function showHome(override = null) {
    if (override !== null) isShown = override;
    const header = document.getElementById("header");
    const home = document.getElementById("homeScreen");


    if (!isShown) {
        window.location.href = "/home.html";
        return;

        let iframe = home.querySelector("iframe");
        if (!iframe) {
            iframe = document.createElement("iframe");
            iframe.src = "/home.html?popup=1";
            iframe.style.width = "100%";
            iframe.style.height = "100%";
            iframe.style.border = "0";
            home.appendChild(iframe);
        } else {

        }

        setTimeout(() => {
            home.classList.add("visible");
            header.style.setProperty("font-size", "0px", "important");
        }, 1);

    } else {
        home.classList.remove("visible");
        header.style.setProperty("font-size", "16px", "important");

        let iframe = home.querySelector("iframe");
        if (iframe) iframe.remove();
    }

    isShown = !isShown;
    displayHomeUnread()
}
