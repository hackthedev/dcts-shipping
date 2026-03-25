import {serverconfig} from "../../index.mjs";
import {validateMemberId} from "../functions/main.mjs";
import {updateMember} from "../functions/member.mjs";


export default (io) => (socket) => {
    // socket.on code here

    socket.on('updateMember', async function (member, response) {
        try {
            if (await validateMemberId(member?.id, socket, member?.token) === true) {
                serverconfig.servermembers[member?.id].icon = (member?.newSettings?.icon !== undefined || member?.newSettings?.icon == "" || member?.newSettings?.icon == "null") ? member.newSettings.icon : "/img/default_pfp.png";
                if(member?.newSettings?.banner !== undefined) serverconfig.servermembers[member?.id].banner = member.newSettings.banner;
                if(member?.newSettings?.aboutme !== undefined) serverconfig.servermembers[member?.id].aboutme = member.newSettings.aboutme;
                if(member?.newSettings?.username !== undefined) serverconfig.servermembers[member?.id].username = member.newSettings.username;
                if(member?.newSettings?.status !== undefined) serverconfig.servermembers[member?.id].status = member.newSettings.status;
                response({updatedMember: serverconfig.servermembers[member?.id]});
            }
            else {
                response({ type: 'error', msg: 'Invalid member or token', error: "Member ID or Token invalid" });
            }
        }
        catch (exception){
            response({ type: 'error', msg: 'Error while updating the member information.', error: "Error while updating the member information from the server." });
        }
    });
};
