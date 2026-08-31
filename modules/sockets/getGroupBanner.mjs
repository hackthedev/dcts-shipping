import { usersocket } from "../../index.mjs";
import { hasPermission } from "../functions/chat/main.mjs";
import { validateMemberId } from "../functions/main.mjs";
import {serverconfig} from "../functions/init/config.mjs";

export default (io) => (socket) => {
    // socket.on code here
    socket.on('getGroupBanner', async function (member) {
        if (await validateMemberId(member?.id, socket, member?.token) === true) {

            if (!await hasPermission(member.id, "viewGroup", member.group)) {
                return;
            }

            io.to(usersocket[member.id]).emit("receiveGroupBanner", serverconfig.groups[member.group].info.banner);
        }
    });
}
