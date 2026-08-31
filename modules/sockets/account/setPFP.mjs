import { saveConfig, } from "../../../index.mjs";
import { validateMemberId } from "../../functions/main.mjs";
import {serverconfig} from "../../functions/init/config.mjs";

export default (io) => (socket) => {
    // socket.on code here
    socket.on('setPFP', async function (member) {
        if (await validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token) {

            serverconfig.servermembers[member.id].icon = member.icon;
            saveConfig(serverconfig);
        
            io.emit("updateMemberList",);
        }
    });
}
