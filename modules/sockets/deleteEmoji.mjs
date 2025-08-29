import { fs, serverconfig, xssFilters } from "../../index.mjs";
import { hasPermission } from "../functions/chat/main.mjs";
import Logger from "../functions/logger.mjs";
import { checkRateLimit, copyObject, sendMessageToUser, validateMemberId } from "../functions/main.mjs";

export default (io) => (socket) => {
    // socket.on code here
    socket.on('deleteEmoji', function (member, response) {
        checkRateLimit(socket);
        
        member.id = xssFilters.inHTMLData(member.id)
        member.token = xssFilters.inHTMLData(member.token)
        member.emoji = xssFilters.inHTMLData(member.emoji)
        if (member.emoji.includes("..")) return;
        
        if (validateMemberId(member.id, socket) == true
        ) {

            if (hasPermission(member.id, "manageEmojis")) {
                try {

                    try {
                        if (member.emoji.includes("..")) return

                        fs.unlinkSync(`./public/emojis/${member.emoji}`);
                        response({ type: "success", msg: "Emoji deleted successfully" });

                    } catch (error) {
                        Logger.error("Coudlnt delete emoji")
                        Logger.error(error)

                        response({ type: "error", msg: "Cant Delete Emoji", error: error });
                    }
                }
                catch (e) {
                    Logger.error("Unable to resolve member");
                    Logger.error(e);
                }
            }
            else {
                response({ type: "error", msg: "You dont have permissions to manage emojis" });
            }
        }
    });
}
