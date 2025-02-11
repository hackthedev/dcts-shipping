import { io, serverconfig, xssFilters } from "../../index.mjs";
import { getMemberHighestRole } from "../functions/chat/helper.mjs";
import { hasPermission } from "../functions/chat/main.mjs";
import Logger from "../functions/logger.mjs";
import { copyObject, sendMessageToUser, validateMemberId } from "../functions/main.mjs";

export default (socket) => {
    // socket.on code here
    socket.on('getAllRoles', function (member, response) {
        if (validateMemberId(member.id, socket) == true
        ) {
            if (!hasPermission(member.id, "manageRoles", member.group)) {
                return;
            }

            var highestRole = getMemberHighestRole(member.id);
            
            var roles = serverconfig.serverroles;
            var sortIndex = 0;
            var returnRole = [];

            let sortedRoles = Object.keys(roles).sort((a, b) => {
                return roles[b].info.sortId - roles[a].info.sortId
            });

            sortedRoles = sortedRoles.reverse().map((key) => roles[key]);



            // Only returns roles that are can be assigned
            Object.keys(sortedRoles).reverse().forEach(function (role) {
                //console.log(roles[role].info.name)

                if (sortedRoles[role].info.sortId < highestRole.info.sortId || hasPermission(member.id, "administrator", member.group)) {
                    sortIndex = sortedRoles[role].info.sortId;

                    if (sortedRoles[role].members.includes(member.targetUser)) {
                        sortedRoles[role].info.hasRole = 1;
                    }
                    else {
                        sortedRoles[role].info.hasRole = 0;
                    }

                    // Get Highest role of user doing it
                    var executer = getMemberHighestRole(member.id);

                    // Only let people show roles they can actually assign
                    if (sortedRoles[role].info.sortId < executer.info.sortId && role != 0 && role != 1) {
                        returnRole.push(sortedRoles[role]);
                    }
                }
            });



            io.emit("updateMemberList");
            response({ type: "success", data: returnRole });
        }
    });
}
