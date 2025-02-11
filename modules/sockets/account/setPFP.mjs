import { io, saveConfig, serverconfig } from "../../../index.mjs";
import { validateMemberId } from "../../functions/main.mjs";

export default (socket) => {
    // socket.on code here
    socket.on('setPFP', function (member) {
        if (validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token) {

            serverconfig.servermembers[member.id].icon = member.icon;
            saveConfig(serverconfig);
        
            io.emit("updateMemberList",);
        }
    });
}
