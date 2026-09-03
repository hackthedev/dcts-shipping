import { usersocket } from "../../index.mjs";
import { getGroupList } from "../functions/chat/main.mjs";
import { validateMemberId } from "../functions/main.mjs";
import {serverconfig} from "../functions/init/config.mjs";

export default (io) => (socket) => {
    // socket.on code here
    socket.on('getGroupList', async function (member) {
        if (await validateMemberId(member.id, socket) === true
            && serverconfig.servermembers[member.id].token === member.token) {
            io.to(usersocket[member.id]).emit("receiveGroupList", await getGroupList(member));
        }
    });
}
