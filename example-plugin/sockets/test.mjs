import { validateMemberId } from "../../../modules/functions/main.mjs";

export default (socket) => {
    socket.on('test', async (member, response) => {
        if (await validateMemberIdmember?.id, socket, member?.token) === true) {

            // some cool code here ;)
            response({ type: 'success', msg: "Worked!", error: null });
        } else {
            response({ type: 'error', msg: 'Invalid member or token', error: "Member ID or Token invalid" });
        }
    });
};