import {saveConfig, serverconfig, signer, versionCode, xssFilters} from "../../index.mjs";
import {getOnlineMemberCount, hasPermission, resolveGroupByChannelId} from "../functions/chat/main.mjs";
import Logger from "../functions/logger.mjs";
import {
    checkObjectKeys,
    copyObject,
    getCastingMemberObject, sanitizeInput,
    sendMessageToUser,
    validateMemberId
} from "../functions/main.mjs";
import {sanitizeHTML, stripHTML} from "../functions/sanitizing/functions.mjs";

export async function getPublicServerInfoObject(){
    let groupId = resolveGroupByChannelId(serverconfig.serverinfo.defaultChannel);
    let group = null;
    if(groupId !== null){
        group = serverconfig?.groups[groupId];
    }

    return {
        serverinfo: {
            name: serverconfig.serverinfo.name,
            home: serverconfig.serverinfo.home,
            description: serverconfig.serverinfo.description,
            countryCode: serverconfig.serverinfo.countryCode,
            icon: group?.info?.icon || null,
            slots: {
                online: await getOnlineMemberCount(),
                limit: serverconfig.serverinfo.slots.limit,
                reserved: serverconfig.serverinfo.slots.reserved,
            },
            defaultChannel: serverconfig.serverinfo.defaultChannel,
            uploadFileTypes: serverconfig.serverinfo.uploadFileTypes,
            messageLoadLimit: serverconfig.serverinfo.messageLoadLimit,
            voip: serverconfig.serverinfo.livekit.enabled,
            registration: serverconfig.serverinfo.registration.enabled,
            instance: {
                contact: serverconfig.serverinfo.instance.contact
            },
            version: versionCode,
            public_key: await signer.getPublicKey()
        }
    };
}

function updateServerInfoProperty(property){
    if(property !== undefined) serverconfig.serverinfo.name = property
}

export default (io) => (socket) => {
    // socket.on code here
    socket.on("getServerInfo", async function (member, response) {
        if (await validateMemberId(member?.id, socket,  member?.token) === true
        ) {
            let serverInfoObj = await getPublicServerInfoObject();

            if (await hasPermission(member.id, "manageServer")) {
                // add more objects here
                serverInfoObj.serverinfo.useCloudflareImageCDN = serverconfig.serverinfo.useCloudflareImageCDN
                serverInfoObj.serverinfo.cfAccountId = serverconfig.serverinfo.cfAccountId
                serverInfoObj.serverinfo.cfAccountToken = serverconfig.serverinfo.cfAccountToken
                serverInfoObj.serverinfo.cfHash = serverconfig.serverinfo.cfHash
                serverInfoObj.serverinfo.maxUploadStorage = serverconfig.serverinfo.maxUploadStorage
                serverInfoObj.serverinfo.rateLimit = serverconfig.serverinfo.rateLimit
                serverInfoObj.serverinfo.dropInterval = serverconfig.serverinfo.dropInterval
                serverInfoObj.serverinfo.messageLoadLimit = serverconfig.serverinfo.messageLoadLimit

                serverInfoObj.serverinfo.moderation = serverconfig.serverinfo.moderation
                serverInfoObj.serverinfo.registration = serverconfig.serverinfo.registration
                serverInfoObj.serverinfo.login = serverconfig.serverinfo.login
                serverInfoObj.serverinfo.discovery = serverconfig.serverinfo.discovery
            }

            response(serverInfoObj);
        }
        else {
            Logger.warn("ID or Token was invalid while requesting server information");
            Logger.warn(`ID: ${member.id}`);
            Logger.warn(`Token: ${member.token}`);
        }
    });

    socket.on("saveServerInfo", async function (member, response) {
        if (await validateMemberId(member?.id, socket,  member?.token) === true
        ) {
            if (await hasPermission(member.id, "manageServer")) {
                if(member?.serverinfo?.name !== undefined) serverconfig.serverinfo.name = sanitizeHTML(member.serverinfo.name);
                if(member?.serverinfo?.description !== undefined) serverconfig.serverinfo.description = sanitizeHTML(member.serverinfo.description);
                if(member?.serverinfo?.countryCode !== undefined) serverconfig.serverinfo.countryCode = stripHTML(member.serverinfo.countryCode);

                if(member?.serverinfo?.uploadFileTypes !== undefined) serverconfig.serverinfo.uploadFileTypes = stripHTML(member.serverinfo.uploadFileTypes);
                if(member?.serverinfo?.defaultChannel !== undefined) serverconfig.serverinfo.defaultChannel = stripHTML(member.serverinfo.defaultChannel);
                if(member?.serverinfo?.registration?.enabled !== undefined) serverconfig.serverinfo.registration.enabled = stripHTML(member.serverinfo.registration.enabled);
                if(member?.serverinfo?.discovery?.enabled !== undefined) serverconfig.serverinfo.discovery.enabled = stripHTML(member.serverinfo.discovery.enabled);
                if(member?.serverinfo?.discovery?.defaultStatus !== undefined) serverconfig.serverinfo.discovery.defaultStatus = stripHTML(member.serverinfo.discovery.defaultStatus);

                if(member?.serverinfo?.instance?.contact?.email !== undefined) serverconfig.serverinfo.instance.contact.email = stripHTML(member.serverinfo.instance.contact.email);
                if(member?.serverinfo?.instance?.contact?.website !== undefined) serverconfig.serverinfo.instance.contact.website = stripHTML(member.serverinfo.instance.contact.website);
                if(member?.serverinfo?.instance?.contact?.reddit !== undefined) serverconfig.serverinfo.instance.contact.reddit = stripHTML(member.serverinfo.instance.contact.reddit);
                if(member?.serverinfo?.instance?.contact?.discord !== undefined) serverconfig.serverinfo.instance.contact.discord = stripHTML(member.serverinfo.instance.contact.discord);
                if(member?.serverinfo?.instance?.contact?.github !== undefined) serverconfig.serverinfo.instance.contact.github = stripHTML(member.serverinfo.instance.contact.github);
                if(member?.serverinfo?.instance?.contact?.owner?.name !== undefined) serverconfig.serverinfo.instance.contact.owner.name = stripHTML(member.serverinfo.instance.contact.owner.name);
                if(member?.serverinfo?.instance?.contact?.signal !== undefined) serverconfig.serverinfo.instance.contact.signal = stripHTML(member.serverinfo.instance.contact.signal);

                if(member?.serverinfo?.maxUploadStorage !== undefined) serverconfig.serverinfo.maxUploadStorage = stripHTML(member.serverinfo.maxUploadStorage);
                if(member?.serverinfo?.rateLimit !== undefined) serverconfig.serverinfo.rateLimit = stripHTML(member.serverinfo.rateLimit);
                if(member?.serverinfo?.dropInterval !== undefined) serverconfig.serverinfo.dropInterval = stripHTML(member.serverinfo.dropInterval);

                // new rate limit settings
                if(member?.serverinfo?.moderation?.ratelimit?.actions?.user_slowmode !== undefined) serverconfig.serverinfo.moderation.ratelimit.actions.user_slowmode = stripHTML(member.serverinfo.moderation.ratelimit.actions.user_slowmode);
                if(member?.serverinfo?.moderation?.ratelimit?.actions?.user_slowmode_duration !== undefined) serverconfig.serverinfo.moderation.ratelimit.actions.user_slowmode_duration = stripHTML(member.serverinfo.moderation.ratelimit.actions.user_slowmode_duration);
                if(member?.serverinfo?.moderation?.ratelimit?.actions?.ratelimit !== undefined) serverconfig.serverinfo.moderation.ratelimit.actions.ratelimit = stripHTML(member.serverinfo.moderation.ratelimit.actions.ratelimit);
                if(member?.serverinfo?.moderation?.ratelimit?.record_history !== undefined) serverconfig.serverinfo.moderation.ratelimit.record_history = stripHTML(member.serverinfo.moderation.ratelimit.record_history);

                // some other mod settings
                if(member?.serverinfo?.moderation?.bans?.memberListHideBanned !== undefined) serverconfig.serverinfo.moderation.bans.memberListHideBanned = stripHTML(member.serverinfo.moderation.bans.memberListHideBanned);
                if(member?.serverinfo?.moderation?.bans?.ipBanDuration !== undefined) serverconfig.serverinfo.moderation.bans.ipBanDuration = stripHTML(member.serverinfo.moderation.bans.ipBanDuration);

                // server home
                if (member?.serverinfo?.home?.banner_url) serverconfig.serverinfo.home.banner_url = stripHTML(member.serverinfo.home.banner_url);
                if (member?.serverinfo?.home?.title) serverconfig.serverinfo.home.title = sanitizeHTML(member.serverinfo.home.title);
                if (member?.serverinfo?.home?.subtitle) serverconfig.serverinfo.home.subtitle = sanitizeHTML(member.serverinfo.home.subtitle);
                if (member?.serverinfo?.home?.about) serverconfig.serverinfo.home.about = sanitizeHTML(member.serverinfo.home.about);


                await saveConfig(serverconfig);
                return response({error: null})
            }

            response({ error: "You dont have permissions for that"});
        }
        else {
            Logger.warn("ID or Token was invalid while requesting server information");
            Logger.warn(`ID: ${member.id}`);
            Logger.warn(`Token: ${member.token}`);
        }
    });
}
