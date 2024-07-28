import {
    debugmode,
    serverconfig,
    colors,
    versionCode,
    io,
    XMLHttpRequest,
    saveConfig,
    fetch,
    reloadConfig,
    flipDebug,
    ratelimit,
    setRatelimit,
    usersocket,
    sanitizeHtml,
    powVerifiedUsers
} from "../../index.mjs"
import {consolas} from "./io.mjs";

var serverconfigEditable = serverconfig;

/*
    conf = The Variable to check for
    value = Value to fill the variable if null
 */
export function checkEmptyConfigVar(conf, value){
    if(conf == null) return value;
    else return conf;
}

export function sanitizeInput(input) {
    return sanitizeHtml(input, {
        allowedTags: [
            'div', 
            'span', 
            'p', 
            'br',
            'b',
            'i', 
            'u', 
            's', 
            'a', 
            'ul', 
            'ol', 
            'li', 
            'h1', 
            'h2', 
            'h3', 
            'h4', 
            'h5', 
            'h6', 
            'pre', 
            'code', 
            'blockquote', 
            'strong',
            'em',
            'u',
            's',
        ],
        allowedAttributes: {
            'a': ['href', 'target', 'rel'],
            //'img': ['src', 'alt', 'title'],
            'div': ['class', 'style'],
            'strong': ['class'],
            'em': ['class'],
            'u': ['class'],
            's': ['class'],
            'span': ['class', 'style'],
            '*': ['class', 'style']
        },
        transformTags: {
            'a': sanitizeHtml.simpleTransform('a', {target: '_blank', rel: 'noopener noreferrer'})
        }/*,
        allowedSchemesByTag: {
            img: ['http', 'https', 'data']
        }
            */
    });
}

export async function checkVersionUpdate() {
    return new Promise((resolve, reject) => {
        var versionUrl = 'https://raw.githubusercontent.com/hackthedev/dcts-shipping/main/version';


        (async function () {
            const res = await fetch(versionUrl)

            if (res.status == 404) {
                resolve(null);
                return null;
            } else if (res.status == 200) {
                var onlineVersionCode = await res.text();
                onlineVersionCode = onlineVersionCode.replaceAll("\n\r", "").replaceAll("\n", "");

                if (onlineVersionCode > versionCode) {
                    resolve(onlineVersionCode);
                    return onlineVersionCode;
                } else {
                    resolve(null);
                    return null;
                }

                resolve(html);
                return html;
            } else {
                resolve(null);
                return null;
            }
        })()


    });

    return prom;
}

export function handleTerminalCommands(command, args){
    serverconfigEditable = checkEmptyConfigVar(serverconfigEditable, serverconfig);

    try{
        if (command == 'reload') {
            reloadConfig();
            consolas("Reloaded config".cyan);
        }
        if (command == 'debug') {
            flipDebug();
            consolas(`Debug Mode set to ${debugmode}`.cyan);
        }
        else if (command == 'roles') {
            var serverroles = serverconfig.serverroles;
            var serverRolesSorted = []

            console.log("");
            console.log("Server Roles:".cyan);

            // Add them to array for sorting
            Object.keys(serverroles).forEach(function(role) {
                serverRolesSorted.push(serverconfig.serverroles[role]);
            });

            // Sort Server Roles by sortId
            serverRolesSorted = serverRolesSorted.sort((a, b) => {
                if (a.info.sortId > b.info.sortId) {
                    return -1;
                }
            });

            serverRolesSorted.forEach(role => {
                console.log(colors.yellow("- Role ID: " + role.info.id));
                console.log("   - Role Name: " + role.info.name);
                console.log("");
            })
        }
        else if(command == "token"){

            if(args.length == 2){

                var roleIdArg = args[1];

                if(isNaN(roleIdArg) == false){
                    try{
                        var roleToken = generateId(64);
                        serverconfigEditable.serverroles[roleIdArg].token.push(roleToken);
                        saveConfig(serverconfigEditable);

                        consolas(colors.cyan(`Redeem key generated for role ${serverconfigEditable.serverroles[roleIdArg].info.name}`));
                        consolas(colors.cyan(roleToken))
                    }
                    catch (Err){
                        consolas("Couldnt save or generate key".yellow);
                        consolas(colors.red(Err));
                    }
                }
            }
            else{
                consolas(colors.yellow(`Missing Argument: Role ID`));
            }

        }
        else if (command == 'delete') {
            if(args.length == 3){
                if(args[1] == "user"){
                    if(args[2].length == 12){
                        if(serverconfig.servermembers[args[2]] != null){
                            delete serverconfigEditable.servermembers[args[2]];
                            consolas(`Deleting user ${args[2]}`.cyan);
                            saveConfig(serverconfigEditable);
                        }
                        else{
                            consolas(`Couldnt find user ${args[2]}`.yellow);
                        }
                    }
                    else{
                        consolas(`${args[2]} seems to be a invalid id`.yellow);
                    }
                }
            }
            else{
                consolas("Syntax error: delete <option> <value> ".cyan + command);
            }
        }
        else{
            consolas("Unkown command: ".cyan + command);
        }
    }
    catch(e){
        consolas("Couldnt handle command input".red)
        consolas(colors.red(e))
    }
}

export function copyObject(obj) {
    return JSON.parse(JSON.stringify(obj));
}


export function checkConfigAdditions() {
    
    /*
        Config changes from update xxx
    */

    // Settings for CR Use
    checkObjectKeys(serverconfig, "serverinfo.commercial.enabled", false)
    checkObjectKeys(serverconfig, "serverinfo.commercial.licenseKey", "")
    checkObjectKeys(serverconfig, "serverinfo.commercial.accountId", 0)
    checkObjectKeys(serverconfig, "serverinfo.commercial.domain", "")

    // Added MySQL
    checkObjectKeys(serverconfig, "serverinfo.sql.enabled", false)
    checkObjectKeys(serverconfig, "serverinfo.sql.host", "localhost")
    checkObjectKeys(serverconfig, "serverinfo.sql.username", "")
    checkObjectKeys(serverconfig, "serverinfo.sql.password", "")
    checkObjectKeys(serverconfig, "serverinfo.sql.database", "dcts")
    checkObjectKeys(serverconfig, "serverinfo.sql.connectionLimit", 10) // Depending on Server Size

    // If the channel doesnt exist it will not display "member joined" messages etc
    checkObjectKeys(serverconfig, "serverinfo.defaultChannel", "0")
    // check for message load limit
    checkObjectKeys(serverconfig, "serverinfo.messageLoadLimit", 50)

    // Additional File Types 
    // Delete entire uploadFileTypes section from config file to recreate it 
    // with the extended list or add manually. will not update if already exists
    checkObjectKeys(serverconfig, "serverinfo.uploadFileTypes", 
        [
            "image/png",
            "image/jpeg",
            "image/gif",
            "image/webp",
            "audio/mpeg",
            "video/mp4",
            "audio/vnd.wave"
        ])
}


export function checkObjectKeys(obj, path, defaultValue) {
    const keys = path.split('.');
    let current = obj;
  
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (!current[key]) {
        current[key] = (i === keys.length - 1) ? defaultValue : {};
      }
      current = current[key];
    }
  
    saveConfig(obj);
  }

export function checkRateLimit(socket){
    serverconfigEditable = checkEmptyConfigVar(serverconfigEditable, serverconfig);

    var ip = socket.handshake.address;

    //console.log("IP RATE LIMIT")
    //console.log(ip)

    if(ip == "::1" || ip.includes("127.0.0.1")){
        return;
    }

    if(ratelimit[ip] == null){
        setRatelimit(ip, 1);
    }else{
        setRatelimit(ip, ratelimit[ip] + 1)
    }

    //consolas(`${ip} Rate Limit: ${ratelimit[ip]}`)

    if(ratelimit[ip] > serverconfig.serverinfo.rateLimit){
        consolas("Limit exceeded".red);

        sendMessageToUser(socket.id, JSON.parse(
            `{
                        "title": "Rate Limited!",
                        "message": "Your connection was terminated.",
                        "buttons": {
                            "0": {
                                "text": "Ok",
                                "events": ""
                            }
                        },
                        "type": "error",
                        "popup_type": "confirm"
                    }`));

        socket.disconnect();

        if(!serverconfig.ipblacklist.includes(ip)){

            serverconfigEditable.ipblacklist.push(ip);
            saveConfig(serverconfigEditable);
            consolas(`IP ${ip} was added to the blacklist for rate limit spam`);
        }

        return;
    }

    setTimeout(() => {

        try{
            setRatelimit(ip, ratelimit[ip] - 1);
        }catch { }

    }, serverconfig.serverinfo.dropInterval * 1000);
}

export function limitString(text, limit){
    if(text.length <= limit) return text.substring(0, limit);
    else return text.substring(0, limit) + "...";
}

export function generateId(length) {
    let result = '1';
    const characters = '0123456789';
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length-1) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
        counter += 1;
    }
    return result;
}

export function validateMemberId(id, socket, bypass = false){

    /* Future Feature
    if(!powVerifiedUsers.includes(socket.id)){

        sendMessageToUser(socket.id, JSON.parse(
            `{
                "title": "Verification Pending",
                "message": "Your identity security is too low.#Please wait for your client to adjust",
                "buttons": {
                    "0": {
                        "text": "Ok",
                        "events": "closePrompt();"
                    }
                },
                "type": "error",
                "popup_type": "confirm"
            }`));

        return false;
    }
        */

    if(bypass == false){
        checkRateLimit(socket);
    }

    if(id.length == 12 && isNaN(id) == false){
        return true;
    }
    else{
        return false;
    }
}

export function escapeHtml(text) {
    // Not sure if this is even helpful but so far worked ig sooo

    if(text == null || text.length <= 0){
        return text;
    }

    var map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };

    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

export function httpGetAsync(theUrl, callback, id)
{
    // create the request object
    var xmlHttp = new XMLHttpRequest();

    // set the state change callback to capture when the response comes in
    xmlHttp.onreadystatechange = function()
    {
        if (xmlHttp.readyState == 4 && xmlHttp.status == 200)
        {
            callback(xmlHttp.responseText, id);
        }
    }

    // open as a GET call, pass in the url and set async = True
    xmlHttp.open("GET", theUrl, true);
    //xmlHttp.setRequestHeader('Content-Type', 'application/json');

    /*
    xmlHttp.setRequestHeader('Access-Control-Allow-Headers', '*');
     xmlHttp.setRequestHeader('Content-Type', 'application/json');
    xmlHttp.setRequestHeader('Access-Control-Allow-Headers', '*');
    xmlHttp.setRequestHeader("Access-Control-Allow-Origin", "*")
    xmlHttp.setRequestHeader("Access-Control-Allow-Methods", "DELETE, POST, GET, OPTIONS")

     */

    // call send with no params as they were passed in on the url string
    xmlHttp.send(null);

    return;
}

export function tenorCallback_search(responsetext, id)
{
    // Parse the JSON response
    var response_objects = JSON.parse(responsetext);

    var top_10_gifs = response_objects["results"];

    // load the GIFs -- for our example we will load the first GIFs preview size (nanogif) and share size (gif)


    top_10_gifs.forEach(gif => {

        io.to(usersocket[id]).emit("receiveGifImage", {gif: gif.media_formats.gif.url, preview: gif.media_formats.gifpreview.url});
        /*
        document.getElementById("emoji-entry-container").insertAdjacentHTML("beforeend",
            `<img
                onclick="sendGif('${gif.media_formats.gif.url}')" src="${gif.media_formats.gifpreview.url}"
                onmouseover="changeGIFSrc('${gif.media_formats.gif.url}', this);"
                onmouseleave="changeGIFSrc('${gif.media_formats.gifpreview.url}', this);"
                style="padding: 1%;border-radius: 20px;float: left;width: 48%; height: fit-content;">`
            */
    })



    //document.getElementById("share_gif").src = top_10_gifs[0]["media_formats"]["gif"]["url"]; top_10_gifs[0]["media_formats"]["gif"]["url"]

    return;

}

export function searchTenor(search, id)
{
    // set the apikey and limit
    var apikey = serverconfig.serverinfo.tenor.api_key;
    var clientkey = serverconfig.serverinfo.tenor.client_key;
    var lmt = serverconfig.serverinfo.tenor.limit;

    // test search term
    var search_term = search;

    // using default locale of en_US
    var search_url = "https://tenor.googleapis.com/v2/search?q=" + search_term + "&key=" +
        apikey +"&client_key=" + clientkey +  "&limit=" + lmt;

    httpGetAsync(search_url,tenorCallback_search, id);

    // data will be loaded by each call's callback
    return;
}

export function addMinutesToDate(date, minutes) {
    return new Date(date.getTime() + minutes*60000);
}

export function sendMessageToUser(socketId, data){
    io.to(socketId).emit("modalMessage", data);
}