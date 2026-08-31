import { validateMemberId } from "../functions/main.mjs";

export default (io) => (socket) => {
    // socket.on code here

    socket.on('MyEvent', async function (member, response) {
        // some code
        if(await validateMemberId(member?.id, socket, member?.token) === false){
            response({ error: null })
            return;
        }
    });
}
