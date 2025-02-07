console.log("%c" + "WAIT!", "color: #FF0000; -webkit-text-stroke: 2px black; font-size: 72px; font-weight: bold;");
console.log("%c" + "People can use the console to steal your account xo !", "color: #FF0000; -webkit-text-stroke: 0px black; font-size: 20px; font-weight: bold;");

// IMPORTANT! By default, socket.io() connects to the host that
// served the page, so we dont have to pass the server url
var socket = io.connect();

socket.emit("userConnected", { id: UserManager.getID(), name: UserManager.getUsername(), icon: UserManager.getPFP(), 
    status: UserManager.getStatus(), token: UserManager.getToken(),
    aboutme: UserManager.getAboutme(), banner: UserManager.getBanner()}, function (response) {});

socket.emit("checkPermission", {id: UserManager.getID(), token: UserManager.getToken(), permission: ["manageServer",
    "manageGroup",
    "manageChannels",
    "manageUploads",
    "manageGroup",
    "viewLogs",
    "manageServerInfo",
    "manageRateSettings"] }, function (response) {

    if(response.permission == "denied"){
        window.location.href = window.location.origin;
    }
    else{
        document.getElementById("pagebody").style.display = "block";
    }
});

var checkEmptyElements = document.querySelectorAll("#nav_settings div");
checkEmptyElements.forEach(emptyElement => {

    var ele = emptyElement;
    console.log(ele.id + " hm")

    if(ele == null || ele.id.length <= 0 || ele.id.includes("info")) { return; }


    var links = document.querySelectorAll("#nav_settings #" + ele.id + " a")
    if(links.length > 0){
        links.forEach(link =>{

            if(link.id.length <= 0 || link == null) { return; }

            console.log(`Checking setting ${link.id}`)
            socket.emit("checkPermission", {id: UserManager.getID(), token: UserManager.getToken(), permission: link.id  }, function (response) {

                if(response.permission == "denied"){
                    //console.log(link.id)

                    // Get new line break
                    var br = document.getElementById(link.id+"-br");
                    if(br != null) { br.remove();} // check if it exists. if so, remove it

                    // Save Parent Id for Empty Check
                    var parentId = link.parentNode.id;

                    //if(parentId == "info") { return; }

                    // Remove setting link
                    document.getElementById(link.id).remove();
                    //console.log(`Parent Id: ${parentId}`)
                    //console.log(`Child Id: ${link.id}`)

                    var parentLinksAfterDelete = document.querySelectorAll("#nav_settings #" + parentId + " a");

                    // Recheck if The "sections" of options is empty or not
                    var counter = 0;
                    parentLinksAfterDelete.forEach(secondLink => {
                        if(secondLink.id.length != 0){
                            counter++;
                        }
                    })

                    // If a section like "Media Settings" was empty, remove it
                    if(parentLinksAfterDelete.length == 0 || counter == 0){
                        document.getElementById(parentId).remove();
                    }
                }
                else{

                }
            });
        });

    }
});

var page = getUrlParams("page");

loadPageContent(page);

async function loadPageContent(page) {
    if(!page) page = "server-info";

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
}

function getUrlParams(param){
    var url = window.location.search;
    var urlParams = new URLSearchParams(url);
    var urlChannel = urlParams.get(param);

    return urlChannel;
}
