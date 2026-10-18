import {saveMemberToDB} from "./mysql/helper.mjs";
import {sanitizeHTML, stripHTML} from "./sanitizing/functions.mjs";
import {normalizeVar} from "../sockets/userConnected.mjs";
import {hasVerifiedKey} from "./chat/main.mjs";
import {autoAnonymizeMember, emitBasedOnMemberId} from "./main.mjs";
import {autobanXSS} from "./sanitizing/actions.mjs";
import {truncateText} from "../sockets/userConnected.mjs";
import {serverconfig} from "./init/config.mjs";
import {queryDatabase} from "./mysql/mysql.mjs";
import DCTS from "../../sdk/v1/backend/dcts_sdk.mjs";

export async function createMember({
                                       id,
                                       token,
                                       name,
                                       loginName,
                                       icon,
                                       banner,
                                       aboutme,
                                       status,
                                       country_code,
                                       publicKey,
                                       joined,
                                       lastOnline,
                                       password,
                                       isVerifiedKey,
                                       onboarding,
                                        type
                                   } = {}) {
    if (!id) throw new Error("Member id is missing when creating member.")
    if (!token) throw new Error("Member token is missing when creating member.")
    if (!password) throw new Error("Member password is missing when creating member.")
    if (!loginName) throw new Error("Member loginName is missing when creating member.")

    let newMember = new DCTS.Members.Builder()
        .setId(id)
        .setToken(token)
        .setName(name)
        .setLoginName(loginName)
        .setIcon(icon)
        .setBanner(banner)
        .setAbout(aboutme)
        .setStatus(status)
        .setCountryCode(country_code)
        .setPublicKey(publicKey)
        .setJoined(joined)
        .setLastOnline(lastOnline)
        .setBanner(false)
        .setMuted(false)
        .setVerifiedKey(isVerifiedKey)
        .setOnboarding(onboarding)
        .setType(type)

    await newMember.setPassword(password);
    await newMember.save();
}

export async function cleanMemberData(member) {
    // base 64 too bad
    if (member?.icon?.includes("data:image")) member.icon = null;
    if (member?.banner?.includes("data:image")) member.banner = null;

    if (member?.icon) member.icon = normalizeVar(member.icon);
    if (member?.banner) member.banner = normalizeVar(member.banner);
    if (member?.name) member.name = normalizeVar(member.name);

    // set public key and verify it
    if (member?.publicKey != null && serverconfig.servermembers[member.id]) {
        let memberServerPublicKey = serverconfig.servermembers[member.id]?.publicKey

        // check if its valid and change the flag
        if ((await hasVerifiedKey(member.id)) === false && !memberServerPublicKey) {
            // otherwise make the client verify their ownership of the key.
            // key wont be used until its verified
            emitBasedOnMemberId(member.id, "verifyPublicKey");
        }
    }

    // some other sanitizing
    if (member?.name) member.name = stripHTML(truncateText(normalizeVar(member.name), 20), async (tag, node, data) => {
        if (tag === "script") await autobanXSS(member.id);
    });
    if (member?.status) member.status = stripHTML(truncateText(normalizeVar(member.status), 50), async (tag, node, data) => {
        if (tag === "script") await autobanXSS(member.id);
    });

    if (member?.aboutme) member.aboutme = sanitizeHTML(truncateText(normalizeVar(member.aboutme), 1000), async (tag, node, data) => {
        if (tag === "script") await autobanXSS(member.id);
    });

    member.onboarding = stripHTML(normalizeVar(member.onboarding)) === "true";
    member.password = stripHTML(normalizeVar(member.password)) || null;
}

export async function updateMember(member) {
    if (!member?.id) {
        throw "Member id is missing when updating member."
    }
    if (!member?.id in serverconfig.servermembers) {
        throw "Member does not exist and therefore it cannot be updates."
    }

    await cleanMemberData(member)
    if (member?.token !== undefined) serverconfig.servermembers[member?.id].token = stripHTML(member?.token);
    if (member?.name !== undefined && normalizeVar(member?.name)?.length > 0) serverconfig.servermembers[member?.id].name = stripHTML(normalizeVar(member?.name));
    if (member?.loginName !== undefined && normalizeVar(member?.name)?.length > 0) serverconfig.servermembers[member?.id].loginName = stripHTML(member?.loginName);
    if (member?.icon !== undefined) serverconfig.servermembers[member?.id].icon = stripHTML(normalizeVar(member?.icon));
    if (member?.banner !== undefined) serverconfig.servermembers[member?.id].banner = stripHTML(normalizeVar(member?.banner));
    if (member?.aboutme !== undefined) serverconfig.servermembers[member?.id].aboutme = sanitizeHTML(normalizeVar(member?.aboutme), false);
    if (member?.status !== undefined) serverconfig.servermembers[member?.id].status = stripHTML(normalizeVar(member?.status));
    if (member?.country_code !== undefined) serverconfig.servermembers[member?.id].country_code = stripHTML(member?.country_code, false);
    if (member?.publicKey !== undefined) serverconfig.servermembers[member?.id].publicKey = stripHTML(member?.publicKey);
    if (member?.isVerifiedKey !== undefined) serverconfig.servermembers[member?.id].isVerifiedKey = member?.isVerifiedKey
    if (member?.lastOnline !== undefined) serverconfig.servermembers[member?.id].lastOnline = Number(stripHTML(member?.lastOnline))
    if (member?.onboarding !== undefined) serverconfig.servermembers[member?.id].onboarding = Boolean(stripHTML(member?.onboarding))
    if (member?.card !== undefined) serverconfig.servermembers[member?.id].card = stripHTML(normalizeVar(member?.card))
    saveMemberToDB(member?.id, serverconfig.servermembers[member?.id]);
}


export async function getMemberAccountById(identifier, issuerId = null){
    if(!identifier) throw new Error("Missing identifier!");

    // look in ram
    let accountObj = Object.values(serverconfig.servermembers).find(member => member.id === identifier || member.publicKey === identifier);
    if(accountObj) return await autoAnonymizeMember(issuerId, accountObj);

    // if not in ram check database
    let accountRow = await queryDatabase(`SELECT * FROM members WHERE id = ? OR publicKey = ? OR loginName = ?`, [identifier, identifier, identifier]);
    if(accountRow?.length === 0) return null;
    return accountRow[0];
}