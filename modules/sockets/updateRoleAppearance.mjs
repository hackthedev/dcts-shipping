import { saveConfig, usersocket } from "../../index.mjs";
import { hasPermission } from "../functions/chat/main.mjs";
import Logger from "@hackthedev/terminal-logger";
import { validateMemberId } from "../functions/main.mjs";
import {serverconfig} from "../functions/init/config.mjs";

export default (io) => (socket) => {
    // socket.on code here
    socket.on('updateRoleAppearance', async  function (member, response) {
        if (await validateMemberId(member?.id, socket, member?.token) === true
        ) {

            if (await hasPermission(member.id, "manageRoles")) {
                try {
                    serverconfig.serverroles[member.roleId].info.name = member.data.info.name;
                    serverconfig.serverroles[member.roleId].info.color = member.data.info.color;
                    serverconfig.serverroles[member.roleId].info.background = member.data.info.background;
                    serverconfig.serverroles[member.roleId].info.backgroundClip = member.data.info.backgroundClip;
                    serverconfig.serverroles[member.roleId].info.displaySeperate = member.data.info.displaySeperate;

                    saveConfig(serverconfig);
                    response({ type: "success", msg: "Role was updated successfully" });

                    // Update to everyone and yourself
                    io.emit("updateMemberList");
                    io.to(usersocket[member.id]).emit("updateMemberList");
                }
                catch (e) {
                    Logger.error("Unable to sort roles");
                    Logger.error(e);
                }
            }
            else {
                response({ type: "error", msg: "denied" });
            }
        }
    });
}
