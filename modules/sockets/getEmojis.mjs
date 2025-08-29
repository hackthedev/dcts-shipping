import { fs, serverconfig, xssFilters } from "../../index.mjs";
import { hasPermission } from "../functions/chat/main.mjs";
import Logger from "../functions/logger.mjs";
import { copyObject, sendMessageToUser, validateMemberId } from "../functions/main.mjs";

export default (io) => (socket) => {
    // socket.on code here
    socket.on('getEmojis', async function (member, response) {

        if (validateMemberId(member.id, socket) == true &&
            serverconfig.servermembers[member.id].token == member.token
        ) {
            try {
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
