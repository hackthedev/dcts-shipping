import { saveConfig, xssFilters } from "../../index.mjs";
import { hasPermission } from "../functions/chat/main.mjs";
import Logger from "@hackthedev/terminal-logger";
import { escapeHtml, sendMessageToUser, validateMemberId } from "../functions/main.mjs";
import {serverconfig} from "../functions/init/config.mjs";

export default (io) => (socket) => {
    // socket.on code here
    socket.on('updateGroupName', async function (member, response) {
        if (await validateMemberId(member?.id, socket, member?.token) === true
        ) {
            
            if (!await hasPermission(member.id, "manageGroups")) {
                return sendMessageToUser(socket.id, JSON.parse(
                    `{
                            "title": "Missing permissions!",
                            "message": "You arent allowed to change the group name",
                            "buttons": {
                                "0": {
                                    "text": "Ok",
                                    "events": ""
                                }
                            },
                            "type": "error",
                            "popup_type": "confirm"
                        }`));
            }

            try {
                var groupName = xssFilters.inHTMLData(escapeHtml(member.groupName));
                var groupDescription = xssFilters.inHTMLData(escapeHtml(member.groupDescription));
                var groupId = xssFilters.inHTMLData(escapeHtml(member.groupId));

                if (!groupDescription) {
                    groupDescription = null;
                }

                serverconfig.groups[groupId].info.name = groupName;
                serverconfig.groups[groupId].info.description = groupDescription;
                saveConfig(serverconfig); 

                response({ type: "success", msg: "Group Name Updated" });

                io.emit("updateGroupList");
            }
            catch (e) {
                Logger.error("Couldnt update group name");
                Logger.error(e);

                response({ type: "error", msg: "Unable to update group name" });
            }
        }
    });
}
