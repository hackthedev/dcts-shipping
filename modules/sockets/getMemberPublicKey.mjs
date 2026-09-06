
import {validateMemberId} from "../functions/main.mjs";
import {serverconfig} from "../functions/init/config.mjs";

export default (io) => (socket) => {
    // socket.on code here

    socket.on('getMemberPublicKey', async function (member, response) {
        if(await validateMemberId(member?.id, socket, member?.token) === true){

            if(!member?.target){
                response({ error: "No target member specified", publicKey: null})
                return;
            }

            if(serverconfig.servermembers[member?.target] === null){
                response({ error: "Target member not found", publicKey: null})
                return;
            }

            response( { error: null, publicKey: serverconfig.servermembers[member.target]?.publicKey ?? null } )
        }
    });
}
