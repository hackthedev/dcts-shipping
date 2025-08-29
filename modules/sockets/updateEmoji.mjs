import { fs, serverconfig, xssFilters } from "../../index.mjs";
import { findEmojiByID } from "../functions/chat/helper.mjs";
import { hasPermission } from "../functions/chat/main.mjs";
import Logger from "../functions/logger.mjs";
import { copyObject, sendMessageToUser, validateMemberId } from "../functions/main.mjs";

export default (io) => (socket) => {
    // socket.on code here
    socket.on('updateEmoji', async function (member, response) {
        checkRateLimit(socket);

        if (validateMemberId(member.id, socket) == true &&
            serverconfig.servermembers[member.id].token == member.token
        ) {

            try {
                if (!hasPermission(member.id, "manageEmojis")) {
                    sendMessageToUser(socket.id, JSON.parse(
                        `{
                            "title": "Missing permissions!",
                            "message": "You arent allowed to manage Emojis",
                            "buttons": {
                                "0": {
                                    "text": "Ok",
                                    "events": ""
                                }
                            },
                            "type": "error",
                        "popup_type": "confirm"
                        }`));

                    response({ type: "error", msg: "You dont have permissions to manage Emojis" });
                    return;
                }

                var oldEmoji = findEmojiByID(member.emojiId);
                var newEmoji = `emoji_${member.emojiId}_${member.emojiName}.${oldEmoji.split(".").pop()}`;

                fs.rename('./public/emojis/' + oldEmoji, `./public/emojis/` + newEmoji, function (err) {
                    if (err) {
                        response({ type: "error", error: err, msg: "Couldnt update emoji" })
                    }
                    else {
                        response({ type: "success", msg: "Emoji successfully updated" })
                    }
                });
            }
            catch (e) {
                Logger.error("Couldnt get emojis");
                Logger.error(e);
            }
        }
    });
}
