import { serverconfig, xssFilters } from "../../index.mjs";
import { getMemberHighestRole } from "../functions/chat/helper.mjs";
import { hasPermission } from "../functions/chat/main.mjs";
import Logger from "../functions/logger.mjs";
import { copyObject, sendMessageToUser, validateMemberId } from "../functions/main.mjs";

export default (io) => (socket) => {
    // socket.on code here
    socket.on('getAllRoles', function (member, response) {
        if (validateMemberId(member.id, socket) == true
        ) {
            if (!hasPermission(member.id, ["manageRoles", "manageChannels", "manageGroups"], member.group)) {
                return;
            }

            var highestRole = getMemberHighestRole(member.id);
            var emitUpdate = member.emitUpdate || true;
            let isAdmin = hasPermission(member.id, "administrator", member.group);

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

                if ( (sortedRoles[role].info.sortId < highestRole.info.sortId && !isAdmin) || isAdmin) {
                    sortIndex = sortedRoles[role].info.sortId;

                    if (sortedRoles[role].members.includes(member.targetUser)) {
                        sortedRoles[role].info.hasRole = 1;
                    }
                    else {
                        sortedRoles[role].info.hasRole = 0;
                    }

                    // Get Highest role of user doing it
                    var executer = getMemberHighestRole(member.id);
                    returnRole.push(sortedRoles[role]);

                    // DEPRECATED
                    // MAY NEED ADJUSTMENT IN CLIENT
                    //
                    // Only let people show roles they can actually assign
                    //if (sortedRoles[role].info.sortId < executer.info.sortId && role != 0 && role != 1) {
                    //    returnRole.push(sortedRoles[role]);
                    //}
                }
            });



            if(emitUpdate) io.emit("updateMemberList");
            response({ type: "success", data: returnRole });
        }
    });
}
