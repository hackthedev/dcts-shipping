import { saveConfig, serverconfig, xssFilters } from "../../index.mjs";
import { hasPermission } from "../functions/chat/main.mjs";
import Logger from "../functions/logger.mjs";
import { copyObject, sendMessageToUser, validateMemberId } from "../functions/main.mjs";

export default (io) => (socket) => {
    // socket.on code here
    socket.on('removeRoleFromGroup', async function (member, response) {
        if (await validateMemberIdmember?.id, socket, member?.token) === true
        ) {

            if (await hasPermission(member.id, "manageGroups")) {
                try {
                    delete serverconfig.groups[member.group].permissions[member.role];
                    saveConfig(serverconfig);

                    response({ type: "success", msg: "Role was successfully removed from the group" });
                }
                catch (e) {
                    Logger.error("Unable to remove role to group");
                    Logger.error(e);
                }
            }
            else {
                response({ type: "error", msg: "denied" });
            }
        }
    });
}
