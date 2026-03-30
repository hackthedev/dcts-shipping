import {serverconfig} from "../../index.mjs";
import {saveMemberToDB} from "./mysql/helper.mjs";
import {sanitizeHTML, stripHTML} from "./sanitizing/functions.mjs";
import {normalizeVar} from "../sockets/userConnected.mjs";
import {hasVerifiedKey} from "./chat/main.mjs";
import {emitBasedOnMemberId} from "./main.mjs";
import {autobanXSS} from "./sanitizing/actions.mjs";
import {truncateText} from "../sockets/userConnected.mjs";

export async function createMember({
                                 id, token, name, loginName, icon, banner, aboutme, status, country_code, publicKey, joined, lastOnline, password, isVerifiedKey, onboarding
                             } = {}) {
    if(!id) throw "Member id is missing when creating member."
    if(!token) throw "Member token is missing when creating member."
    if(!password) throw "Member password is missing when creating member."
    if(!loginName) throw "Member loginName is missing when creating member."

    serverconfig.servermembers[id] = {
        id: normalizeVar(stripHTML(id)),
        token: normalizeVar(stripHTML(token)) ?? null,
        name: normalizeVar(stripHTML(name)) ?? null,
        loginName: normalizeVar(stripHTML(loginName)) ?? null,
        nickname: null,
        icon: normalizeVar(stripHTML(icon)) != null ? icon : null,
        banner: normalizeVar(stripHTML(banner)) != null ? banner : null,
        aboutme: normalizeVar(stripHTML(aboutme)) !== undefined  ? aboutme : null,
        status: normalizeVar(stripHTML(status)) !== undefined ? status : null,
        country_code: normalizeVar(stripHTML(country_code)) ?? null,
        publicKey: normalizeVar(stripHTML(publicKey)) ?? null,
        joined: joined ?? null,
        isOnline: 1,
        lastOnline: lastOnline ?? null,
        isBanned: 0,
        isMuted: 0,
        password: normalizeVar(stripHTML(password)) ?? null,
        isVerifiedKey: isVerifiedKey ?? false,
        onboarding: onboarding ?? null,
    }

    await cleanMemberData(serverconfig.servermembers[id])
    saveMemberToDB(id, serverconfig.servermembers[id]);
}

export async function cleanMemberData(member){
    // base 64 too bad
    if (member?.icon?.includes("data:image")) member.icon = null;
    if (member?.banner?.includes("data:image")) member.banner = null;

    if(member?.icon) member.icon = normalizeVar(member.icon);
    if(member?.banner) member.banner = normalizeVar(member.banner);
    if(member?.name) member.name = normalizeVar(member.name);

    // set public key and verify it
    if (member?.publicKey != null) {
        let memberServerPublicKey = serverconfig.servermembers[member.id].publicKey

        // check if its valid and change the flag
        if ((await hasVerifiedKey(member.id)) === false && !memberServerPublicKey) {
            // otherwise make the client verify their ownership of the key.
            // key wont be used until its verified
            emitBasedOnMemberId(member.id, "verifyPublicKey");
        }
        else {
            member.isVerifiedKey = true
        }
    }

    // some other sanitizing
    if (member?.name) member.name = stripHTML(truncateText(normalizeVar(member.name), 25), async (tag, node, data) => {
        if(tag === "script") await autobanXSS(member.id);
    });
    if (member?.status) member.status = stripHTML(truncateText(normalizeVar(member.status), async (tag, node, data) => {
        if(tag === "script") await autobanXSS(member.id);
    }), 50);

    if (member?.aboutme) member.aboutme = truncateText(sanitizeHTML(normalizeVar(member.aboutme), async (tag, node, data) => {
        if(tag === "script") await autobanXSS(member.id);
    }), 500);

    member.onboarding = stripHTML(normalizeVar(member.onboarding)) === "true";
    member.password = stripHTML(normalizeVar(member.password)) || null;
}

export async function updateMember(member) {
    if(!member?.id) {
        throw "Member id is missing when updating member."
    }
    if (!member?.id in serverconfig.servermembers) {
        throw "Member does not exist and therefore it cannot be updates."
    }

    await cleanMemberData(member)

    if(member?.token !== undefined) serverconfig.servermembers[member?.id].token = stripHTML(member?.token);
    if(member?.name !== undefined && normalizeVar(member?.name)?.length > 0) serverconfig.servermembers[member?.id].name = stripHTML(normalizeVar(member?.name));
    if(member?.loginName !== undefined  && normalizeVar(member?.name)?.length > 0) serverconfig.servermembers[member?.id].loginName = stripHTML(member?.loginName);
    if(member?.icon !== undefined) serverconfig.servermembers[member?.id].icon = stripHTML(normalizeVar(member?.icon));
    if(member?.banner !== undefined) serverconfig.servermembers[member?.id].banner = stripHTML(normalizeVar(member?.banner));
    if(member?.aboutme !== undefined) serverconfig.servermembers[member?.id].aboutme = sanitizeHTML(normalizeVar(member?.aboutme), false);
    if(member?.nickname !== undefined) serverconfig.servermembers[member?.id].nickname = stripHTML(member?.nickname);
    if(member?.status !== undefined) serverconfig.servermembers[member?.id].status = stripHTML(normalizeVar(member?.status));
    if(member?.country_code !== undefined) serverconfig.servermembers[member?.id].country_code = stripHTML(member?.country_code, false);
    if(member?.publicKey !== undefined) serverconfig.servermembers[member?.id].publicKey = stripHTML(member?.publicKey);
    if(member?.isVerifiedKey !== undefined) serverconfig.servermembers[member?.id].isVerifiedKey = member?.isVerifiedKey
    if(member?.lastOnline !== undefined) serverconfig.servermembers[member?.id].lastOnline = Number(stripHTML(member?.lastOnline))
    if(member?.onboarding !== undefined) serverconfig.servermembers[member?.id].onboarding = Boolean(stripHTML(member?.onboarding))
    saveMemberToDB(member?.id, serverconfig.servermembers[member?.id]);
}
