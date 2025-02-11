import { validateMemberId } from "../../../modules/functions/main.mjs";
import { serverconfig } from "../../../index.mjs";

export default (socket) => {
    
    socket.on('test', (member, response) => {
        if (
            validateMemberId(member.id, socket) === true &&
            serverconfig.servermembers[member.id].token === member.token
        ) {
            response({ type: 'success', message: "Worked!" });
            
        } else {
            response({ type: 'error', message: 'Invalid member or token' });
        }
    });
    
};