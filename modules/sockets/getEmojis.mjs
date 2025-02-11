import { fs, io, serverconfig, xssFilters } from "../../index.mjs";
import { hasPermission } from "../functions/chat/main.mjs";
import Logger from "../functions/logger.mjs";
import { copyObject, sendMessageToUser, validateMemberId } from "../functions/main.mjs";

export default (socket) => {
    // socket.on code here
    socket.on('getEmojis', async function (member, response) {

        if (validateMemberId(member.id, socket) == true &&
            serverconfig.servermembers[member.id].token == member.token
        ) {

            try {

                /*
                Maybe use this with a permission like "useEmojis" until it becomes a problem
                if(!hasPermission(member.id, "manageEmojis")){
                    sendMessageToUser(socket.id, JSON.parse(
                        `{
                            "title": "Missing permissions!",
                            "message": "You arent allowed to manage Emojis",
                            "buttons": {
                                "0": {
                                    "text": "Ok",
                                    "events": "onclick='closeModal()'"
                                }
                            },
                            "type": "error"
                        }`));
 
                    response({type: "error", msg: "You dont have permissions to manage Emojis"});
                    return;
                } 
                */

                // Emoji List array
                var emojiList = [];

                // Get all local emojis sorted by creation date
                fs.readdirSync("./public/emojis").sort((a, b) => {
                    let aStat = fs.statSync(`./public/emojis/${a}`),
                        bStat = fs.statSync(`./public/emojis/${b}`);

                    return new Date(bStat.birthtime).getTime() - new Date(aStat.birthtime).getTime();
                }).forEach(file => {
                    emojiList.push(file);
                });

                if (emojiList.length > 0) {
                    response({ type: "success", data: emojiList, msg: "Successfully received emojis" })
                }
                else {
                    response({ type: "error", data: null, msg: "No Emojis found" })
                }
            }
            catch (e) {
                Logger.error("Couldnt get emojis");
                Logger.error(e);
            }
        }
    });
}
