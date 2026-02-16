import { crypto, saveConfig, serverconfig, useridFromSocket, xssFilters } from "../../index.mjs";
import { formatDateTime, getJson } from "../functions/chat/main.mjs";
import Logger from "@hackthedev/terminal-logger"
import { checkConnectionLimit, checkMemberBan, checkRateLimit, copyObject, removeFromArray, validateMemberId } from "../functions/main.mjs";
import { estimatePoWDuration, formatTimeDifference } from "../functions/pow.mjs";

export let powVerifiedUsers = [];
export let powChallengeSessions = {}; // « save user challanges based on session id.

export default (io) => (socket) => {
    // socket.on code here
}

export function listenToPow(socket) {
    socket.on('verifyPow', async function (data, response) {
        checkRateLimit(socket); // cant call validateMember so we manually check rate limit

        let powResult = isValidProof(data.challenge, data.solution);

        if (powResult?.valid === true) {
            let powString = data.challenge + "-" + data.solution;

            powVerifiedUsers.push(socket.id);

            // only works after powVerifiedUsers includes the socket id
            checkConnectionLimit(socket, data?.token, data?.id);

            if (data?.token !== null && data?.id !== null) {
                // lets make sure the account data is correct and save the pow
                // so other accounts cant reuse the same id
                if (validateMemberId(data?.id, socket, data?.token,  true) === true) {
                    // if someone uses the same pow kick em!
                    const members = Object.values(serverconfig.servermembers || {});
                    const duplicatePowMember = members.find(member => member.pow === powString);

                    if (duplicatePowMember && serverconfig.servermembers[data.id].token !== data.token) {
                        removeFromArray(powVerifiedUsers, socket.id);
                        Logger.warn(`Duplicate PoW detected: ${serverconfig.servermembers[data.id].name} uses the same POW as ${duplicatePowMember.name} !!`);
                    }

                    useridFromSocket[socket.id] = data.id;

                    serverconfig.servermembers[data.id].pow = powString;
                    saveConfig(serverconfig);

                    
                    let banResult = await checkMemberBan(socket, serverconfig.servermembers[data.id]);
                    let banText = "";
                    if (banResult?.timestamp) {
                        if (new Date(banResult.timestamp).getFullYear() === 9999) {
                            banText = "banned permanently";
                        }
                        else {
                            banText = `banned until <br>${formatDateTime(new Date(banResult.timestamp))}`
                        }
                    }

                    if (banResult?.reason) {
                        banText += `<br><br>Reason:<br>${banResult.reason}`
                    }

                    if (banResult.result === true) {
                        response({ error: `You've been ${banText}`, type: "error", msg: `You've been ${banText}`, msgDisplayDuration: 1000 * 60 })
                        socket.disconnect();
                        return;
                    }
                }
            }

            response({ type: "success", msg: "Authenticated" })
        } else {
            response({
                type: "error",
                msg: `
                    Identity proof is invalid!<br>
                    - Your level: ${powResult.level}<br>
                    - Required: ${powResult.required}`,
                error: "invalidIdentity",
                displayTime: 100 * 60000,
                powResult
            })
        }
    });
}

export function isValidProof(challenge, solution) {
    const hash = crypto.createHash('sha256').update(challenge + solution).digest('hex');
    const requiredBits = serverconfig.serverinfo.pow.difficulty * 4; // each hex digit = 4 bits
    const actualBits = countLeadingZeroBits(hash);
    return {
        level: Math.floor(actualBits / 4),
        required: Math.floor(requiredBits / 4),
        valid: actualBits >= requiredBits
    };
}

function countLeadingZeroBits(hash) {
    let bits = 0;

    for (const char of hash) {
        const nibble = parseInt(char, 16); // 4 bits per hex character
        if (nibble === 0) {
            bits += 4;
        } else {
            if (nibble < 2) bits += 3;
            else if (nibble < 4) bits += 2;
            else if (nibble < 8) bits += 1;
            break;
        }
    }

    return bits;
}

// Send a PoW challenge to the client
export async function sendPow(socket) {
    let powChallenge = crypto.randomBytes(16).toString('hex');
    powChallengeSessions[socket.id] = powChallenge;
    socket.emit('powChallenge', { challenge: powChallenge, difficulty: serverconfig.serverinfo.pow.difficulty });
}

export async function calculateTimeoutBasedOnDifficulty(difficulty) {
    //const baseTimePerDifficulty =  3 * ( (serverconfig.serverinfo.pow.difficulty * serverconfig.serverinfo.pow.difficulty) / 2 ); // seconds per difficulty point (you can tweak this)
    const result = await estimatePoWDuration(serverconfig.serverinfo.pow.difficulty);
    const baseTimePerDifficulty = result.estimatedSeconds
    return baseTimePerDifficulty * 2;
}

export function waitForPow(socket, timeoutSeconds = 10) {
    return new Promise((resolve, reject) => {
        const timeoutMs = timeoutSeconds * 1000;
        const intervalMs = 500; // check every 500ms

        let waited = 0;

        const interval = setInterval(() => {
            if (powVerifiedUsers.includes(socket.id)) {
                clearInterval(interval);
                socket.off('disconnect', onDisconnect); // user is gone at this point
                resolve();
            } else if (waited >= timeoutMs) {
                clearInterval(interval);
                socket.off('disconnect', onDisconnect); // user is gone at this point
                reject(new Error('PoW timeout'));
            }
            waited += intervalMs;
        }, intervalMs);

        // disconnect handler
        function onDisconnect() {
            clearInterval(interval);
            reject(new Error('Socket disconnected before solving PoW'));
        }

        socket.on('disconnect', onDisconnect);
    });
}

export async function waitForPowSolution(socket) {
    const timeoutSeconds = await calculateTimeoutBasedOnDifficulty(serverconfig.serverinfo.pow.difficulty) + Number(600);
    try {
        Logger.debug(`Waiting ${formatTimeDifference(Date.now(), new Date().getTime() + (timeoutSeconds * 1000))} for ${socket.id} to solve POW`)

        await waitForPow(socket, timeoutSeconds);
        Logger.debug(`${socket.id} sent a valid POW`)

        return true;
    } catch (err) {
        Logger.debug(`[!] ${socket.id} failed to solve PoW in time. Disconnecting.`);
        return false;
    }
}