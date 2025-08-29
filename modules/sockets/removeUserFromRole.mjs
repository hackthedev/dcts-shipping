import { saveConfig, serverconfig, usersocket, xssFilters } from "../../index.mjs";
import { getMemberHighestRole } from "../functions/chat/helper.mjs";
import { hasPermission } from "../functions/chat/main.mjs";
import Logger from "../functions/logger.mjs";
import { copyObject, sendMessageToUser, validateMemberId } from "../functions/main.mjs";

export default (io) => (socket) => {
    // socket.on code here
    socket.on('removeUserFromRole', function (member, response) {
        if (validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token
        ) {

            Logger.debug(`trying to remove role`)
            member.id = xssFilters.inHTMLData(member.id)
            member.token = xssFilters.inHTMLData(member.token)
            member.target = xssFilters.inHTMLData(member.target)
            
            try {
                var executer = getMemberHighestRole(member.id);
                var target = getMemberHighestRole(member.target);
                let hasPerms = hasPermission(member.id, "manageMembers")


                // If user is not a admin they cant assign roles that are higher
                if ((executer.info.sortId >= target.info.sortId)) {
                    if (!hasPerms) {
                        response({ type: "error", msg: "You cant remove roles that are higher or equal then yours" });
                        return;
                    }
                }
                // Default Roles
                if (serverconfig.serverroles[member.role].info.id == 0 || serverconfig.serverroles[member.role] == 1) {
                    return;
                }

                // return only filtered
                serverconfig.serverroles[member.role].members = serverconfig.serverroles[member.role].members.filter(id => id !== member.target);

                saveConfig(serverconfig);


                io.emit("updateMemberList");
                io.to(usersocket[member.target]).emit("updateMemberList");
                response({ type: "success", msg: "Role removed" });
            }
            catch (e) {
                Logger.error("Unable to remove member from group");
                Logger.error(e);
            }
        }
    });
}
