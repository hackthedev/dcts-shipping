import {validateMemberId} from "../functions/main.mjs";
import {updateMember} from "../functions/member.mjs";
import {serverconfig} from "../functions/init/config.mjs";


export default (io) => (socket) => {
    // socket.on code here

    socket.on('updateMember', async function (member, response) {
        try {
            if (await validateMemberId(member?.id, socket, member?.token) === true) {
                await updateMember(member);
                response({ ...serverconfig.servermembers[member.id] });
                io.emit("memberUpdated");
            }
            else {
                response({ error: "Member ID or Token invalid" });
            }
        }
        catch (exception){
            response({ error: "Error while updating the member information from the server." });
        }
    });
};
