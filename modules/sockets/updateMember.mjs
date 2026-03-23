import {serverconfig} from "../../index.mjs";
import Logger from "../functions/logger.mjs";

export default (io) => (socket) => {
    // socket.on code here

    socket.on('updateMember', async function (member, response) {
        try{
            serverconfig.servermembers[member?.id].icon = member.newSettings.icon;
            serverconfig.servermembers[member?.id].banner = member.newSettings.banner;
            serverconfig.servermembers[member?.id].aboutme = member.newSettings.aboutme;
            serverconfig.servermembers[member?.id].username = member.newSettings.username;
            serverconfig.servermembers[member?.id].status = member.newSettings.status;
            response({updatedMember: serverconfig.servermembers[member?.id]});
        }
        catch (exception){
            Logger.error(exception);
        }

    });
}
