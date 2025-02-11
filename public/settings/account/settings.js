console.log("%c" + "WAIT!", "color: #FF0000; -webkit-text-stroke: 2px black; font-size: 72px; font-weight: bold;");
console.log("%c" + "People can use the console to steal your account xo !", "color: #FF0000; -webkit-text-stroke: 0px black; font-size: 20px; font-weight: bold;");

// IMPORTANT! By default, socket.io() connects to the host that
// served the page, so we dont have to pass the server url
var socket = io.connect();

socket.emit("userConnected", {
    id: UserManager.getID(), name: UserManager.getUsername(), icon: UserManager.getPFP(), status: UserManager.getStatus(), token: UserManager.getToken(),
    aboutme: UserManager.getAboutme(), banner: UserManager.getBanner()
}, function (response) {

});


var page = getUrlParams("page") || "profile";
loadPageContent(page)

async function loadPageContent(page) {

    if(!page){
        console.log("No page specified")
        return;
    }

    try {
        // Attach CSS
        const head = document.head;
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = `page/${page}/${page}.css`;
        head.appendChild(link);
        
        // Load HTML content
        const response = await fetch(`page/${page}/${page}.html`);
        if (!response.ok) throw new Error(`Failed to load HTML for ${page}`);
        const html = await response.text();
        document.getElementById("content").innerHTML = html;

        // Load JS after HTML is loaded
        const script = document.createElement("script");
        script.src = `page/${page}/${page}.js`;
        script.onload = () => console.log(`${page}.js loaded successfully`);
        script.onerror = () => console.error(`Failed to load ${page}.js`);
        document.body.appendChild(script);
    } catch (error) {
        console.error("Error loading page content:", error);
        document.getElementById("content").innerHTML = "<p>Failed to load content.</p>";
    }
}

function setUrl(param){
    window.history.replaceState(null, null, param); // or pushState
    let page = param.replace("?page=", "");
    loadPageContent(page)
}

function getUrlParams(param){
    var url = window.location.search;
    var urlParams = new URLSearchParams(url);
    var urlChannel = urlParams.get(param);

    return urlChannel;
}
