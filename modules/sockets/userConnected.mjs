import {
    auther,
    checkPow,
    saveConfig,
    server,
    serverconfig, signer,
    socketToIP,
    usersocket,
    xssFilters,
} from "../../index.mjs";
import {
    formatDateTime,
    getJson, getMemberFromKey,
    getMemberIpInfo,
    getMemberLastOnline,
    hasVerifiedKey,
    resolveCategoryByChannelId,
    resolveGroupByChannelId,
} from "../functions/chat/main.mjs";
import {saveChatMessage} from "../functions/io.mjs";
import Logger from "../functions/logger.mjs";
import {
    checkMemberMute,
    checkRateLimit,
    emitBasedOnMemberId,
    generateId,
    getCastingMemberObject,
    hashPassword,
    removeFromArray,
    sendMessageToUser, validateMemberId,
} from "../functions/main.mjs";
import {sendSystemMessage} from "./home/general.mjs";
import {discoverHosts} from "../functions/discovery.mjs";
import {isValidProof, powVerifiedUsers} from "./pow.mjs";
import {checkMemberBan} from "../functions/ban-system/helpers.mjs";
import {sanitizeHTML, stripHTML} from "../functions/sanitizing/functions.mjs";
import {autobanXSS} from "../functions/sanitizing/actions.mjs";
import {cleanMemberData, createMember, updateMember} from "../functions/member.mjs";
import dSyncAuth from "@hackthedev/dsync-auth";

export function normalizeVar(v) {
    if (v === null || v === undefined) return "";

    if (typeof v === "string") {
        const val = v.trim().toLowerCase();

        if (val === "true") return true;
        if (val === "false") return false;
        if (val === "null" || val === "undefined" || val === "") return null;

        if (/^-?\d+(\.\d+)?$/.test(val)) {
            if (val.length < 10) {
                return Number(val);
            }
        }
    }

    return String(v);
}

export function truncateText(text, length) {
    text = String(text || "");
    if (text.length <= length) return text;
    return text.substr(0, length) + "\u2026";
}

function handleInviteCode(member, socket, response) {
    // handle user registration and invite only things.
    // if a member was on the server already he wont be prompted for codes.
    if(member?.code)  member.code = stripHTML(member?.code)

    if (
        serverconfig.serverinfo.registration.enabled === false
        && (serverconfig.servermembers[member?.id]?.onboarding === false || !serverconfig.servermembers[member?.id])
    ) {
        if (!member.code) {
            // to be extra sure, remove users from the pow verified array
            // so that if they try to fetch data like member list etc
            // it'll automatically be denied
            removeFromArray(powVerifiedUsers, socket.id);

            response({
                error: `Registration is disabled on this server.<br>
                        You need to provide an access code`,
                displayTime: 100 * 60000,
                registration: serverconfig.serverinfo.registration.enabled,
            });

            return false;
        }

        // code was correct, so lets process its properties
        if (serverconfig.serverinfo.registration.accessCodes[member.code]) {
            let code = serverconfig.serverinfo.registration.accessCodes[member.code];

            // check if the code is expired
            if (code.expires !== -1) {
                if (new Date().getTime() >= code.expires) {
                    response({
                        error: `The invite code you've used has expired`,
                        displayTime: 100 * 60000,
                        registration: serverconfig.serverinfo.registration.enabled,
                    });

                    removeFromArray(powVerifiedUsers, socket.id);
                    return false;
                }
            }

            // check if max uses is already used up if not infinite
            if (code.maxUses !== -1) {
                if (code.maxUses <= 0) {
                    response({
                        error: `The invite code you've used has been used up`,
                        displayTime: 100 * 60000,
                        registration: serverconfig.serverinfo.registration.enabled,
                    });

                    removeFromArray(powVerifiedUsers, socket.id);
                    return false;
                } else if (code.maxUses > 0) {
                    code.maxUses -= 1;
                    saveConfig(serverconfig);
                    return true;
                }
            }
        } else {
            response({
                error: `The invite code you've used is incorrect`,
                displayTime: 100 * 60000,
                registration: serverconfig.serverinfo.registration.enabled,
            });

            removeFromArray(powVerifiedUsers, socket.id);
            return false;
        }
    }

    return true;
}

export async function handlePowOnConnection(member, socket) {
    let challenge = stripHTML(normalizeVar(member.pow.challenge));
    let solution = stripHTML(normalizeVar(member.pow.solution));

    if (challenge && solution) {
        let result = dSyncAuth.isValidProof(
            stripHTML(normalizeVar(member.pow.challenge)),
            stripHTML(normalizeVar(member.pow.solution)),
            serverconfig.serverinfo.pow.difficulty
        )

        if (result.valid) {
            if (!powVerifiedUsers.includes(socket.id))
                powVerifiedUsers.push(socket.id)
            return
        }
    }

    await checkPow(socket)
}

export default (io) => (socket) => {
    // handles disconnect event as the member list doesnt update
    // currently if someone goes offline.
    socket.on("disconnect", async () => {
        const memberId = socket.data?.memberId || socket?.memberId;
        if (!memberId) return;

        setTimeout(async () => {
            const info = await getMemberLastOnline(memberId);
            if (info && !info.isOnline && info.minutesPassed >= 1) {
                io.emit("updateMemberList");
            }
        }, 65_000);
    });

    // socket.on code here
    socket.on("userConnected", async function (member, response) {
        if(!member?.id) return response({error: "No Account id provided"})
        if(member?.id?.length !== 12) return response({error: "Account id length not 12"})

        if (member?.id) member.id = normalizeVar(stripHTML(member.id));
        if (member?.loginName) member.loginName = normalizeVar(stripHTML(member.loginName));
        if (member?.token) member.token = normalizeVar(stripHTML(member.token));
        if (member?.pow?.challenge) member.pow.challenge = String(stripHTML(member?.pow?.challenge));
        if (member?.pow?.solution) member.pow.solution = String(stripHTML(member?.pow?.solution));

        await cleanMemberData(member);

        checkRateLimit(socket);

        // get ip info
        let ipInfo = await getMemberIpInfo(socket);
        if (ipInfo?.error) Logger.debug(ipInfo.error);
        if (ipInfo?.location?.country_code) member.country_code = ipInfo.location.country_code;

        // if pow has been passed. used for quicker
        // initial connection to skip pow challenge
        await handlePowOnConnection(member, socket)
        let authResult = await handlePublicKeyAuthOnConnection(member);
        if(authResult?.keepExecution === false) return;

        // check if knownServers was supplied for discovery
        if (member?.knownServers && member?.knownServers?.length > 1) {
            member.knownServers = stripHTML(member?.knownServers);
            discoverHosts(member.knownServers);
        }

        // handle invites
        let inviteResult = handleInviteCode(member, socket, response);
        if (!inviteResult) return;

        // check member ban and disconnect if needed.
        // will also auto remove the ban again
        let banResult = await checkMemberBan(socket, member);
        if (banResult.result === true) {
            response({
                error: banResult.text,
                type: "error",
                msg: banResult.text,
                displayTime: 1000 * 60,
            });

            return socket.disconnect();
        }

        // call checkMemberMute so it unmutes automatically
        checkMemberMute(socket, member);

        // Check if member is in default role
        if (serverconfig.serverroles["0"].members.includes(member.id) === false) {
            serverconfig.serverroles["0"].members.push(member.id);
            saveConfig(serverconfig);
        }

        // deprecated, left for legacy!!
        // if you remove this in a PR and it breaks shit imma rip yo balls off
        usersocket[member.id] = socket.id;

        // if new member
        if (
            !serverconfig.servermembers[member.id] ||
            serverconfig.servermembers[member.id]?.onboarding === false
        ) {
            // New Member joined the server
            Logger.debug("New member connected");

            // handle onboarding
            if (member?.onboarding === false) {
                // cant proceed as the user needs to setup their account with a password
                io.to(socket.id).emit("doAccountOnboarding");
                return response({
                    error: "Onboarding not completed",
                    finishedOnboarding: false,
                    type: "success",
                });
            }

            // error if no password passed
            if(!member?.password) return response({error: "Missing password field in plaintext"})

            var userToken = generateId(48);
            member.token = userToken;

            // if the user login name already exists we just append an id to the login name.
            // we then emit it to the user so they can save it.
            let existingUsernames = getJson(serverconfig.servermembers, [
                "*.id",
                "*.loginName",
            ]);

            // avoid overwriting existing member data
            existingUsernames.forEach((user) => {
                let userId = user[0];
                let loginName = user[1];

                if (userId === member.id) member.id = generateId(12);
                if (loginName === member.loginName) member.loginName += generateId(4);
            });

            // setup member
            const now = new Date().getTime();
            const hashedPassword = await hashPassword(member.password);

            await createMember(                    {
                id: member.id,
                token: member.token,
                name: member?.name ? stripHTML(member.name || "Member") : "",
                loginName: member.loginName,
                icon: member?.icon ? stripHTML(member.icon) : "",
                banner: member?.banner ? stripHTML(member.banner) : "",
                aboutme: member?.aboutme ? sanitizeHTML(member.aboutme) : "",
                status: member?.status ? stripHTML(member.status) : "",
                country_code: member?.country_code ? stripHTML(member.country_code) : "",
                publicKey: member?.publicKey ? stripHTML(member.publicKey) : "",
                joined: now,
                lastOnline: now,
                password: hashedPassword,
                isVerifiedKey: false,
                onboarding: true
            })

            try {
                // if a new member joins lets send a system welcome DM.
                // can be edited in config and is enabled on default.
                if (
                    serverconfig.serverinfo.system.welcome.enabled &&
                    serverconfig.serverinfo.system.welcome.message.length > 0
                )
                    sendSystemMessage(
                        member.id,
                        serverconfig.serverinfo.system.welcome.message,
                    );
                //
                // you can broadcast messages via the console with the following syntax
                // msg < userid | * > <Message>
                //msg * <h3>Welcome to the server!</h3><p>We hope you'll like it here!<br>If you ever need help press the <b>Support</b> button on the top!</p>
            } catch (e) {
                Logger.error("Error while sending system message");
                Logger.error(e);
            }

            // create copy of server member without token etc
            var castingMember = await getCastingMemberObject(
                serverconfig.servermembers[member.id],
            );

            // Save system message to the default channel
            castingMember.group = resolveGroupByChannelId(serverconfig.serverinfo.defaultChannel);
            castingMember.category = resolveCategoryByChannelId(serverconfig.serverinfo.defaultChannel);
            castingMember.channel = serverconfig.serverinfo.defaultChannel;
            castingMember.room = `${resolveGroupByChannelId(serverconfig.serverinfo.defaultChannel)}-${resolveCategoryByChannelId(serverconfig.serverinfo.defaultChannel)}-${serverconfig.serverinfo.defaultChannel}`;

            castingMember.timestamp = new Date().getTime();
            castingMember.messageId = generateId(12);
            castingMember.isSystemMsg = true;
            castingMember.author = {
                id: castingMember.id
            }

            castingMember.message = `<label class="username" data-member-id="${stripHTML(castingMember.id)}">${truncateText(sanitizeHTML(castingMember.name), 50)} joined the server!</label>`;
            await saveChatMessage(castingMember);

            io.emit("updateMemberList");
            let room = castingMember.room;
            io.in(room).emit("messageCreate", castingMember);

            // this join call is absolutely important so we can always emit
            // data to ourselves based on the member id. very helpful!
            socket.join(member.id);
            socket.data.memberId = member.id;

            // send back the account info
            response({
                finishedOnboarding: true,
                ...serverconfig.servermembers[member.id],
            });
        } else { // if existing member
            if (
                member.token == null ||
                member.token.length !== 48 ||
                serverconfig.servermembers[member.id]?.token == null ||
                serverconfig.servermembers[member.id]?.loginName == null ||
                serverconfig.servermembers[member.id]?.name == null ||
                serverconfig.servermembers[member.id]?.token !== member.token
            ) {
                return response({
                    error: "Invalid login",
                    title: "Invalid Login",
                    msg: "Something went wrong with your login.<br><a onclick='UserManager.resetAccount();'>Reset Session</a><br>",
                    type: "error",
                    displayTime: 1000 * 60 * 60,
                });
            }
        }

        successfulAuthResponse(member);

        async function successfulAuthResponse(member){
            // login was successful
            socket.join(member.id);

            updateMember({
                id: member.id,
                lastOnline: new Date().getTime()
            })

            socket.memberId = member.id;

            usersocket[member.id] = socket.id;
            socket.data.memberId = member.id;

            response({
                finishedOnboarding: true,
                ...serverconfig.servermembers[member.id],
            });

            io.emit("updateMemberList");
        }

        async function handlePublicKeyAuthOnConnection(member){
            if (member?.sessionId && member?.publicKey) {
                let session = await dSyncAuth.verifySession(auther.authSessions, member.sessionId, member.publicKey);

                if (session.valid) {
                    let serverMemberObj = await getMemberFromKey(session.publicKey);
                    if (serverMemberObj) {
                        await successfulAuthResponse(serverMemberObj);
                        return { keepExecution: false };
                    }
                }
            }

            if(member?.publicKey && !await validateMemberId(member?.id, socket, member?.token)){
                // if didnt supply a solution, create a challenge
                if(!member?.keySolution){
                    const keyChallengeResult = await dSyncAuth.createChallenge(signer, member.publicKey);

                    // prepair the socket a bit for easier handling n shit
                    socket.keyAuthIdentifier = keyChallengeResult.identifier;
                    socket.keyAuthSolution = keyChallengeResult.challengeString;

                    // then send response to client to solve
                    response({ keyAuth: true, challenge: keyChallengeResult.challenge });
                    return {
                        keepExecution: false,
                    }
                }
                // if there is a solution supplied and the socket still has the identifier set
                else if(member?.keySolution && socket?.keyAuthIdentifier && socket.keyAuthSolution){
                    // if the user successfully authenticated let them know it all worked
                    if(socket.keyAuthSolution === member.keySolution){
                        let serverMemberObj = await getMemberFromKey(member?.publicKey)
                        if(!serverMemberObj) return { keepExecution: true } // no member found, continue logic

                        await successfulAuthResponse(serverMemberObj)

                        return {
                            keepExecution: false,
                        }
                    }
                }
            }

            return {
                keepExecution: true,
            }
        }
    });
};
