import { saveConfig, serverconfig, xssFilters } from "../../index.mjs";
import { hasPermission } from "../functions/chat/main.mjs";
import Logger from "../functions/logger.mjs";
import { copyObject, sendMessageToUser, validateMemberId } from "../functions/main.mjs";

export default (io) => (socket) => {
    // socket.on code here
    socket.on('deleteGroup', function (member) {
        if (validateMemberId(member.id, socket) == true &&
            serverconfig.servermembers[member.id].token == member.token
        ) {
            if (serverconfig.groups[member.group].info.isDeletable == 0) {
                sendMessageToUser(socket.id, JSON.parse(
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
                return;
            }

            if (!hasPermission(member.id, "manageGroups")) {
                sendMessageToUser(socket.id, JSON.parse(
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
                return;
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
