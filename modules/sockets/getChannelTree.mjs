import { io, serverconfig, xssFilters } from "../../index.mjs";
import { getChannelTree, hasPermission } from "../functions/chat/main.mjs";
import Logger from "../functions/logger.mjs";
import { copyObject, sendMessageToUser, validateMemberId } from "../functions/main.mjs";

export default (socket) => {
    // socket.on code here
    socket.on('getChannelTree', function (member, response) {
        if (validateMemberId(member.id, socket) == true
        ) {

            member.id = xssFilters.inHTMLData(member.id)
            member.token = xssFilters.inHTMLData(member.token)
            member.group = xssFilters.inHTMLData(member.group)

            if (!hasPermission(member.id, "viewGroup", member.group)) {
                return;
            }

            response({ type: "success", data: getChannelTree(member) });
            //io.to(usersocket[member.id]).emit("receiveChannelTree", getChannelTree(member));
        }
    });
}
