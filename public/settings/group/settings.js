console.log("%c" + "WAIT!", "color: #FF0000; -webkit-text-stroke: 2px black; font-size: 72px; font-weight: bold;");
console.log("%c" + "People can use the console to steal your account xo !", "color: #FF0000; -webkit-text-stroke: 0px black; font-size: 20px; font-weight: bold;");

// IMPORTANT! By default, socket.io() connects to the host that
// served the page, so we dont have to pass the server url
var socket = io.connect();

socket.emit("checkPermission", {id:getID(), token: getToken(), permission: "manageGroups" }, function (response) {
    if(response.permission == "denied"){
        window.location.href = window.location.origin;
    }
    else{
        document.getElementById("pagebody").style.display = "block";
    }
});


var page = getUrlParams("page");

if(page == null){

    fetch(`page/group-info/group-info.html`)
        .then(response=> response.text())
        .then(text=> document.getElementById('content').innerHTML = text);

    var head  = document.getElementsByTagName('head')[0];
    var link  = document.createElement('link');
    link.rel  = 'stylesheet';
    link.type = 'text/css';
    link.href = `page/group-info/group-info.css`;
    link.media = 'all';
    head.appendChild(link);

    var jsc  = document.createElement('script');
    jsc.src = "page/group-info/group-info.js";;
    head.appendChild(jsc);
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
    jsc.src = `page/${page}/${page}.js`;

    head.appendChild(jsc);
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
            pfp = "/img/default_pfp.png";
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