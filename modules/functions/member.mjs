import {serverconfig} from "../../index.mjs";
import {saveMemberToDB} from "./mysql/helper.mjs";
import {sanitizeHTML, stripHTML} from "./sanitizing/functions.mjs";

export function createMember(id, token, name, loginName, icon, banner, aboutme, status, country_code, publicKey, joined, lastOnline, password, isVerifiedKey, onboarding) {
    if(!id) throw "Member id is missing when creating member."
    serverconfig.servermembers[id] = {
        id: id,
        token: (token !== undefined && token !== null) ? token: null,
        name: (name !== undefined && name !== null) ? name: null,
        loginName: (loginName !== undefined && loginName !== null) ? loginName: null,
        nickname: null,
        icon: (icon !== undefined && icon !== null) ? icon: null,
        banner: (banner !== undefined && banner !== null) ? banner: null,
        aboutme: (aboutme !== undefined && aboutme !== null) ? aboutme: null,
        status: (status !== undefined && status !== null) ? status: null,
        country_code: (country_code !== undefined && country_code !== null) ? country_code: null,
        publicKey: (publicKey !== undefined && publicKey !== null) ? publicKey: null,
        joined: (joined !== undefined && joined !== null) ? joined: null,
        isOnline: 1,
        lastOnline: (lastOnline !== undefined && lastOnline !== null) ? lastOnline: null,
        isBanned: 0,
        isMuted: 0,
        password: (password !== undefined && password !== null) ? password: null,
        isVerifiedKey: (isVerifiedKey !== undefined && isVerifiedKey !== null) ? isVerifiedKey: null,
        onboarding: (onboarding !== undefined && onboarding !== null) ? onboarding: null,
    }
    saveMemberToDB(id, serverconfig.servermembers[id]);
}


export function updateMember(member) {
    if(!member?.id) {
        throw "Member id is missing when updating member."
    }
    if (!member?.id in serverconfig.servermembers) {
        throw "Member does not exist and therefore it cannot be updates."
    }
    if(member?.token !== undefined) serverconfig.servermembers[member?.id].token = stripHTML(member?.token);
    if(member?.name !== undefined) serverconfig.servermembers[member?.id].name = stripHTML(member?.name);
    if(member?.loginName !== undefined) serverconfig.servermembers[member?.id].loginName = stripHTML(member?.loginName);
    if(member?.icon !== undefined) serverconfig.servermembers[member?.id].icon = stripHTML(member?.icon);
    if(member?.banner !== undefined) serverconfig.servermembers[member?.id].banner = stripHTML(member?.banner);
    if(member?.aboutme !== undefined) serverconfig.servermembers[member?.id].aboutme = sanitizeHTML(member?.aboutme, false);
    if(member?.nickname !== undefined) serverconfig.servermembers[member?.id].nickname = stripHTML(member?.nickname);
    if(member?.status !== undefined) serverconfig.servermembers[member?.id].status = stripHTML(member?.status);
    if(member?.country_code !== undefined) serverconfig.servermembers[member?.id].country_code = sanitizeHTML(member?.country_code, false);
    if(member?.publicKey !== undefined) serverconfig.servermembers[member?.id].publicKey = stripHTML(member?.publicKey);
    if(member?.isVerifiedKey !== undefined) serverconfig.servermembers[member?.id].isVerifiedKey = member?.isVerifiedKey
    if(member?.lastOnline !== undefined) serverconfig.servermembers[member?.id].lastOnline = Number(stripHTML(member?.lastOnline))
    if(member?.onboarding !== undefined) serverconfig.servermembers[member?.id].onboarding = Boolean(stripHTML(member?.onboarding))
    saveMemberToDB(member?.id, serverconfig.servermembers[member?.id]);
}
