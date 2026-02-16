/*
    The functions here are basically the "core" of the chat app on the server side.
 */
import {serverconfig, fetch, fs} from "../../../index.mjs"

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

    Object.keys(roles).forEach(function(role) {
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


