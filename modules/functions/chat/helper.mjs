/*
    The functions here are basically the "core" of the chat app on the server side.
 */
import {serverconfig, fetch, fs} from "../../../index.mjs"

export function convertMention(text) {
    var pingedUsers;
    var userId;
    try {
        text = text.toString();
        
        // Extracting the mention part
        pingedUsers = text.match(/&lt;@(\d+)&gt;/);

        if (pingedUsers == null) {
            return text;
        }

        for (let i = 1; i < pingedUsers.length; i++) {
            try {
                userId = pingedUsers[i];

                text = text.replace(`&lt;@${userId}&gt;`, `<label class="mention" id="mention-${serverconfig.servermembers[userId].id}">@${serverconfig.servermembers[userId].name}</label>`);
            } catch (lolz) {
                // Handle error if necessary
                console.log(lolz);
            }
        }
        return text;
    } catch (exe) {
        console.log(exe);
    }
}

export function findEmojiByID(id){
    // Get all local emojis

    var filename = "";
    fs.readdirSync("./public/emojis").forEach(file => {
        if(file.includes(id)){
            filename = file;
            return;
        }
    });

    return filename;
}

export function getMemberHighestRole(id){
    var roles = serverconfig.serverroles;
    var sortIndex = 0;
    var returnRole = null;

    Object.keys(roles).reverse().forEach(function(role) {
        if(roles[role].members.includes(id)){
            if(roles[role].info.sortId > sortIndex){
                sortIndex = roles[role].info.sortId;
                returnRole = roles[role];
            }
        }
    });

    if(returnRole == null){
        return roles["0"];
    }

    return returnRole;
}


