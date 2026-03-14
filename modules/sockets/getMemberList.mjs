import { serverconfig, xssFilters } from "../../index.mjs";
import { getMemberList, hasPermission } from "../functions/chat/main.mjs";
import Logger from "../functions/logger.mjs";
import { copyObject, sendMessageToUser, validateMemberId } from "../functions/main.mjs";

export default (io) => (socket) => {
    // socket.on code here
    socket.on('getMemberList', async function (member, response) {
        if (await validateMemberId(member?.id, socket, member?.token) === true) {

            if (!await hasPermission(member.id, "viewGroup", member.group)) {
                response({ error: true, msg: "You arent allowed to view this group", type: "error" })
                return;
            }

            if(!member?.channel) return response({ members: {}, index: 0, error: "No channel id provided" });

            let {members, index} = await getMemberList(member, member?.channel, member?.lastIndex);
            
            response({ members, index })
        }
    });
}
