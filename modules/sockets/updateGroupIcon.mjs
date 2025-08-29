import { saveConfig, serverconfig, xssFilters } from "../../index.mjs";
import { hasPermission } from "../functions/chat/main.mjs";
import Logger from "../functions/logger.mjs";
import { copyObject, sendMessageToUser, validateMemberId } from "../functions/main.mjs";

export default (io) => (socket) => {
    // socket.on code here
    socket.on('updateGroupIcon', function (member) {
        if (validateMemberId(member.id, socket) == true &&
            serverconfig.servermembers[member.id].token == member.token
        ) {

            if (!hasPermission(member.id, "manageGroups")) {
                sendMessageToUser(socket.id, JSON.parse(
                    `{
                            "title": "Missing permissions!",
                            "message": "You arent allowed to change the group icon",
                            "buttons": {
                                "0": {
                                    "text": "Ok",
                                    "events": ""
                                }
                            },
                            "type": "error",
                            "popup_type": "confirm"
                        }`));
                return;
            }

            try {
                if (member.value == null || member.value.length <= 0) {
                    member.value = "https://wallpapers-clan.com/wp-content/uploads/2022/05/cute-pfp-25.jpg";
                }

                member.value = xssFilters.inHTMLData(member.value);
                serverconfig.groups[member.group].info.icon = member.value;
                saveConfig(serverconfig);

                io.emit("updateGroupList");
            }
            catch (e) {
                Logger.error("Couldnt update group icon");
                Logger.error(e);
            }
        }
    });
}
