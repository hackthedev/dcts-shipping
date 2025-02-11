import { powVerifiedUsers, serverconfig, xssFilters } from "../../index.mjs";
import { copyObject, validateMemberId } from "../functions/main.mjs";

export default (socket) => {
    // socket.on code here
    // Send a PoW challenge to the client
    socket.on('requestPow', () => {
        const challenge = crypto.randomBytes(16).toString('hex');
        socket.emit('powChallenge', { challenge, difficulty: powDifficulty });
    });

    // Verify the PoW solution
    socket.on('verifyPow', ({ challenge, solution }) => {
        if (isValidProof(challenge, solution)) {

            if (!powVerifiedUsers.includes(socket.id)) {
                powVerifiedUsers.push(socket.id);
            }

            console.log('Client authenticated');
            socket.emit('authSuccess', { message: 'Authenticated' });
        } else {
            console.log('Client failed to authenticate');
            socket.emit('authFailure', { message: 'Failed to authenticate' });
        }
    });

    function isValidProof(challenge, solution) {
        const hash = crypto.createHash('sha256').update(challenge + solution).digest('hex');
        return hash.substring(0, powDifficulty) === Array(powDifficulty + 1).join('0');
    }

}
