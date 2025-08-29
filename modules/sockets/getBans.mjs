import { serverconfig, xssFilters } from "../../index.mjs";
import { hasPermission } from "../functions/chat/main.mjs";
import Logger from "../functions/logger.mjs";
import { copyObject, getCastingMemberObject, sendMessageToUser, validateMemberId } from "../functions/main.mjs";

export default (io) => (socket) => {
    // socket.on code here
    socket.on('getBans', async function (member, response) {
        if (validateMemberId(member.id, socket) == true &&
            serverconfig.servermembers[member.id].token == member.token
        ) {

            try {
                if (!hasPermission(member.id, "manageBans")) {
                    sendMessageToUser(socket.id, JSON.parse(
                        `{
                            "title": "Missing permissions!",
                            "message": "You arent allowed to manage Bans",
                            "buttons": {
                                "0": {
                                    "text": "Ok",
                                    "events": ""
                                }
                            },
                            "type": "error",
                        "popup_type": "confirm"
                        }`));

                    response({ type: "error", msg: "You dont have permissions to manage Bans" });
                    return;
                }

                let banDataObj = copyObject(serverconfig.banlist);

                Object.entries(banDataObj).forEach(([bannedUserId, banData]) => {
                    banData.bannedModObj = getCastingMemberObject(serverconfig.servermembers[banData.bannedBy]) || null;
                    banData.bannedUserObj = getCastingMemberObject(serverconfig.servermembers[bannedUserId]) || null;
                });


                response({ type: "success", data: banDataObj, msg: "Successfully received banlist" })
            }
            catch (e) {
                Logger.error("Couldnt get emojis");
                Logger.error(e)
            }
        }
    });
}
