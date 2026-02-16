import { serverconfig, xssFilters } from "../../index.mjs";
import { getMemberList, hasPermission } from "../functions/chat/main.mjs";
import Logger from "../functions/logger.mjs";
import { copyObject, sendMessageToUser, validateMemberId } from "../functions/main.mjs";

export default (io) => (socket) => {
    // socket.on code here
    socket.on('getMemberList', function (member, response) {
        if (validateMemberId(member?.id, socket, member?.token) === true) {

            if (!hasPermission(member.id, "viewGroup", member.group)) {
                response({ error: true, msg: "You arent allowed to view this group", type: "error" })
                return;
            }

            if(!member?.channel) return response({ members: {}, index: 0, error: "No channel id provided" });

            let {members, index} = getMemberList(member, member?.channel, member?.lastIndex);
            
            response({ members, index })
        }
    });
}
