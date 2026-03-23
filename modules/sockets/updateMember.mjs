import {serverconfig} from "../../index.mjs";
import Logger from "../functions/logger.mjs";

export default (io) => (socket) => {
    // socket.on code here

    socket.on('updateMember', async function (member, response) {
        try{
            if(member?.newSettings?.icon !== undefined) serverconfig.servermembers[member?.id].icon = member.newSettings.icon;
            if(member?.newSettings?.banner !== undefined) serverconfig.servermembers[member?.id].banner = member.newSettings.banner;
            if(member?.newSettings?.aboutme !== undefined) serverconfig.servermembers[member?.id].aboutme = member.newSettings.aboutme;
            if(member?.newSettings?.username !== undefined) serverconfig.servermembers[member?.id].username = member.newSettings.username;
            if(member?.newSettings?.status !== undefined) serverconfig.servermembers[member?.id].status = member.newSettings.status;
            response({updatedMember: serverconfig.servermembers[member?.id]});
        }
        catch (exception){
            Logger.error(exception);
        }

    });
}
