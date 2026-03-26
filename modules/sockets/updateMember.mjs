import {serverconfig} from "../../index.mjs";
import {validateMemberId} from "../functions/main.mjs";
import {updateMember} from "../functions/member.mjs";


export default (io) => (socket) => {
    // socket.on code here

    socket.on('updateMember', async function (member, response) {
        try {
            if (await validateMemberId(member?.updatedMember?.id, socket, member?.token) === true) {
                updateMember(member?.updatedMember);
                response({ updatedMember: serverconfig.servermembers[member?.updatedMember?.id] });
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
