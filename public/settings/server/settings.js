console.log("%c" + "WAIT!", "color: #FF0000; -webkit-text-stroke: 2px black; font-size: 72px; font-weight: bold;");
console.log("%c" + "People can use the console to steal your account xo !", "color: #FF0000; -webkit-text-stroke: 0px black; font-size: 20px; font-weight: bold;");

// IMPORTANT! By default, socket.io() connects to the host that
// served the page, so we dont have to pass the server url
var socket = io.connect();

socket.emit("userConnected", { id: getID(), name: getUsername(), icon: getPFP(), status: getStatus(), token: getToken(),
    aboutme: getAboutme(), banner: getBanner()}, function (response) {});

socket.emit("checkPermission", {id:getID(), token: getToken(), permission: ["manageServer",
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
            socket.emit("checkPermission", {id:getID(), token: getToken(), permission: link.id  }, function (response) {

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

loadPageContent();

/*
if(page == null){
    /*
    fetch(`page/server-info/server-info.html`)
        .then(response=> response.text())
        .then(text=> document.getElementById('content').innerHTML = text);

    var head  = document.getElementsByTagName('head')[0];
    var link  = document.createElement('link');
    link.rel  = 'stylesheet';
    link.type = 'text/css';
    link.href = `page/server-info/server-info.css`;
    link.media = 'all';
    head.appendChild(link);

    var jsc  = document.createElement('script');
    jsc.src = window.location.href + "/page/server-info/server-info.js";;
    head.appendChild(jsc);

     */
    /*
}
else{
    fetch(`page/${getUrlParams("page")}/${getUrlParams("page")}.html`)
        .then(response=> response.text())
        .then(text=> document.getElementById('content').innerHTML = text);

    var head  = document.getElementsByTagName('head')[0];
    var link  = document.createElement('link');
    link.rel  = 'stylesheet';
    link.type = 'text/css';
    link.href = `page/${page}/${page}.css`;
    link.media = 'all';
    head.appendChild(link);

    var jsc  = document.createElement('script');
    jsc.src = window.location.href.replace("?page="+getUrlParams("page"), "") + `/page/${page}/${page}.js`;
    head.appendChild(jsc);
}
*/

async function loadPageContent() {
    const page = getUrlParams("page") || "server-info";

    try {
        // Load HTML content
        const response = await fetch(`page/${page}/${page}.html`);
        if (!response.ok) throw new Error(`Failed to load HTML for ${page}`);
        const html = await response.text();
        document.getElementById("content").innerHTML = html;

        // Attach CSS
        const head = document.head;
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = `page/${page}/${page}.css`;
        head.appendChild(link);

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


function setCookie(name,value,days) {
    var expires = "";
    if (days) {
        var date = new Date();
        date.setTime(date.getTime() + (days*24*60*60*1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "")  + expires + "; path=/";
}
function getCookie(name) {
    var nameEQ = name + "=";
    var ca = document.cookie.split(';');
    for(var i=0;i < ca.length;i++) {
        var c = ca[i];
        while (c.charAt(0)==' ') c = c.substring(1,c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
    }
    return null;
}
function eraseCookie(name) {
    document.cookie = name +'=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
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

function getToken(){
    var token = getCookie("token");

    if(token == null || token.length <= 0){
        return null;
    }
    else{
        return token;
    }
}

function getAboutme(){
    var aboutme = getCookie("aboutme");

    if(aboutme == null || aboutme.length <= 0){

        return "";
    }
    else{
        //updateUsernameOnUI(aboutme);
        return aboutme;
    }
}

function getBanner(){
    var banner = getCookie("banner");

    if(banner == null || banner.length <= 0){
        return "";
    }
    else{
        //updateUsernameOnUI(aboutme);
        return banner;
    }
}

function getID(){
    var id = getCookie("id");

    if(id == null || id.length != 12){
        id = generateId(12);
        setCookie("id", id, 360);
        return id;
    }
    else{
        return id;
    }
}

function getPFP(){
    var pfp = getCookie("pfp");

    if(pfp == null || pfp.length <= 0){

        if(pfp.length <= 0){
            pfp = "https://wallpapers-clan.com/wp-content/uploads/2022/05/cute-pfp-25.jpg";
        }
        setCookie("pfp", pfp, 360);
        return pfp;
    }

    return pfp;
}

function getStatus(){
    var status = getCookie("status");

    if(status == null || status.length <= 0){
        setCookie("status", "Hey im new!", 360);
        return status;
    }
    else{
        return status;
    }
}

function getUsername(){
    var username = getCookie("username");

    if(username == null || username.length <= 0){
        username = prompt("Whats your username?");

        if(username.length > 0){
            setCookie("username", username, 360);
            return username;
        }
    }
    else{
        return username;
    }
}