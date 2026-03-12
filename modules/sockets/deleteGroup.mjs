import { saveConfig, serverconfig, xssFilters } from "../../index.mjs";
import { hasPermission } from "../functions/chat/main.mjs";
import Logger from "../functions/logger.mjs";
import { copyObject, sendMessageToUser, validateMemberId } from "../functions/main.mjs";

export default (io) => (socket) => {
    // socket.on code here
    socket.on('deleteGroup', async function (member) {
        if (await validateMemberId(member?.id, socket, member?.token) === true
        ) {
            if (serverconfig.groups[member.group].info.isDeletable === 0) {
                return sendMessageToUser(socket.id, JSON.parse(
                    `{
                        "title": "Error!",
                        "message": "This group cant be deleted.",
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

            if (!await hasPermission(member.id, "manageGroups")) {
                return sendMessageToUser(socket.id, JSON.parse(
                    `{
                        "title": "Missing permissions!",
                        "message": "You arent allowed to delete groups",
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
                delete serverconfig.groups[member.group];
                saveConfig(serverconfig);

                io.emit("updateGroupList");
            }
            catch (e) {
                Logger.error("Couldnt delete group");
                Logger.error(e);
            }
        }
    });
}
