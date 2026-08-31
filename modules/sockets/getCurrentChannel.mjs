import { usersocket } from "../../index.mjs";
import { hasPermission } from "../functions/chat/main.mjs";
import { validateMemberId } from "../functions/main.mjs";
import {serverconfig} from "../functions/init/config.mjs";

export default (io) => (socket) => {
    // socket.on code here
    socket.on('getCurrentChannel', async function (member) {
        if (await validateMemberId(member?.id, socket, member?.token) === true) {

            try {
                if (await hasPermission(member.id, "viewChannel", member.channel) === true) {
                    io.to(usersocket[member.id]).emit("receiveCurrentChannel", serverconfig.groups[member.group].channels.categories[member.category].channel[member.channel]);
                }
            }
            catch {
                io.to(usersocket[member.id]).emit("receiveCurrentChannel", serverconfig.groups[member.group]);
            }
        }
    });
}
