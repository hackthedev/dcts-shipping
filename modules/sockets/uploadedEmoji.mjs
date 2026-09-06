import { hasPermission } from "../functions/chat/main.mjs";
import { validateMemberId } from "../functions/main.mjs";

export default (io) => (socket) => {
    // socket.on code here

    socket.on('uploadedEmoji', async function (member) {
        // some code
        if(await validateMemberId(member?.id, socket, member?.token) === true){
            if (await hasPermission(member.id, "manageEmojis") === false) {
                return;
            }

            io.emit("updatedEmojis");
        }
    });
}
