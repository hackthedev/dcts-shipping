import {serverconfig} from "../../index.mjs";
import {saveMemberToDB} from "./mysql/helper.mjs";
import {sanitizeHTML, stripHTML} from "./sanitizing/functions.mjs";

export function createMember(id, token, name, loginName, icon, banner, aboutme, status, country_code, publicKey, joined, lastOnline, hashedPassword, isVerifiedKey, onboarding) {
    serverconfig.servermembers[id] = {
        id: id,
        token: token,
        name: name,
        loginName: loginName,
        nickname: null,
        icon: icon,
        banner: banner,
        aboutme: aboutme,
        status: status,
        country_code: country_code,
        publicKey: publicKey,
        joined: joined,
        isOnline: 1,
        lastOnline: lastOnline,
        isBanned: 0,
        isMuted: 0,
        password: hashedPassword,
        isVerifiedKey: isVerifiedKey,
        onboarding: onboarding
    }
    saveMemberToDB(id, serverconfig.servermembers[id]);
}


export function updateMember(member) {
    if (!member?.id in serverconfig.servermembers) {
        serverconfig.servermembers[member?.id] = {}
    }
    if (serverconfig.servermembers[member?.id])
    if(member?.icon !== undefined) serverconfig.servermembers[member?.id].icon = stripHTML(member?.icon);
    if(member?.banner !== undefined) serverconfig.servermembers[member?.id].banner = stripHTML(member?.banner);
    if(member?.aboutme !== undefined) serverconfig.servermembers[member?.id].aboutme = sanitizeHTML(member?.aboutme, false);
    if(member?.username !== undefined) serverconfig.servermembers[member?.id].username = stripHTML(member?.username);
    if(member?.country_code !== undefined) serverconfig.servermembers[member?.id].country_code = sanitizeHTML(member?.country_code, false);
    if(member?.publicKey !== undefined) serverconfig.servermembers[member?.id].status = member?.publicKey;
    if(member?.isVerifiedKey !== undefined) serverconfig.servermembers[member?.id].isVerifiedKey = member?.isVerifiedKey
    if(member?.lastOnline !== undefined) serverconfig.servermembers[member?.id].lastOnline = member?.lastOnline
    if(member?.onboarding !== undefined) serverconfig.servermembers[member?.id].onboarding = member?.onboarding
    saveMemberToDB(member?.id, serverconfig.servermembers[member?.id]);
}
