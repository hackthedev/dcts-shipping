import { loginAttempts, serverconfig, xssFilters } from "../../index.mjs";
import {banIp, getNewDate, getSocketIp, unbanIp} from "../functions/chat/main.mjs";
import { copyObject, findAndVerifyUser, getCastingMemberObject, validateMemberId } from "../functions/main.mjs";

export default (io) => (socket) => {
    // socket.on code here
    socket.on('userLogin', async function (member, response) {
        member.password = xssFilters.inHTMLData(member.password)
        member.loginName = xssFilters.inHTMLData(member.loginName)


        // Handling ip ban
        var ip = getSocketIp(socket);
        if (serverconfig.ipblacklist.hasOwnProperty(ip)) {

            // if the ban has expired, unban them
            if (Date.now() > serverconfig.ipblacklist[ip]) {
                unbanIp(socket)
            }
        }

        // initiate login counter
        if (!loginAttempts.hasOwnProperty(ip)) {
            loginAttempts.push(ip);
            loginAttempts[ip] = 0;
        }

        // increase login counter
        loginAttempts[ip]++;

        // if count exceeded, temporarily ban ip and clean up
        if (loginAttempts[ip] > serverconfig.serverinfo.login.maxLoginAttempts) {
            banIp(socket, getNewDate(serverconfig.serverinfo.moderation.bans.ipBanDuration).getTime());
            delete loginAttempts[ip];

            response({ error: "You've been temporarily banned. Please try again later" })
            socket.disconnect();
            return;
        }

        let loginCheck = await findAndVerifyUser(member.loginName, member.password);
        if (loginCheck.result === true) {
            response({ error: null, member: loginCheck.member })
        }
        else if (loginCheck.result === false) {
            response({ error: "Invalid login on sign up" })
        }
        else {
            response({ error: "Account not found" })
        }
    });
}
