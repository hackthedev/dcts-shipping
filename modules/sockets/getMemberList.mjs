import { serverconfig, xssFilters } from "../../index.mjs";
import {getMemberList, hasPermission, resolveGroupByChannelId} from "../functions/chat/main.mjs";
import Logger from "../functions/logger.mjs";
import { copyObject, sendMessageToUser, validateMemberId } from "../functions/main.mjs";

export default (io) => (socket) => {
    // socket.on code here
    socket.on('getMemberList', async function (member, response) {
        if (await validateMemberId(member?.id, socket, member?.token) === true) {

            if (!await hasPermission(member.id, "viewGroup", member.group)) {
                response({ error: "You arent allowed to view this group", type: "error" })
                return;
            }

            if(!member?.channel) return response({ error: "Missing channel id from memberlist" })

            let {members, index} = await getMemberList(member, member?.group, member?.lastIndex);
            response({ members, index })
        }
    });
}
