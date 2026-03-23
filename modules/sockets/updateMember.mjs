import {serverconfig} from "../../index.mjs";
import {validateMemberId} from "../functions/main.mjs";

export default (io) => (socket) => {
    // socket.on code here

    socket.on('updateMember', async function (member, response) {
        if (await validateMemberId(member?.id, socket, member?.token) === true) {
            try {
                if(member?.newSettings?.icon !== undefined) serverconfig.servermembers[member?.id].icon = member.newSettings.icon;
                if(member?.newSettings?.banner !== undefined) serverconfig.servermembers[member?.id].banner = member.newSettings.banner;
                if(member?.newSettings?.aboutme !== undefined) serverconfig.servermembers[member?.id].aboutme = member.newSettings.aboutme;
                if(member?.newSettings?.username !== undefined) serverconfig.servermembers[member?.id].username = member.newSettings.username;
                if(member?.newSettings?.status !== undefined) serverconfig.servermembers[member?.id].status = member.newSettings.status;
                response({updatedMember: serverconfig.servermembers[member?.id]});
            }
            catch (exception){
                response({ type: 'error', msg: 'Error while updating the member information.', error: "Error while updating the member information from the server." });
            }
            } else {
                response({ type: 'error', msg: 'Invalid member or token', error: "Member ID or Token invalid" });
            }
    });
}
