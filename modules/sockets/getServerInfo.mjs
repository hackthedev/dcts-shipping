import {saveConfig, serverconfig, signer, versionCode, xssFilters} from "../../index.mjs";
import {getOnlineMemberCount, hasPermission, resolveGroupByChannelId} from "../functions/chat/main.mjs";
import Logger from "../functions/logger.mjs";
import {
    checkObjectKeys,
    copyObject,
    getCastingMemberObject,
    sendMessageToUser,
    validateMemberId
} from "../functions/main.mjs";

export async function getPublicServerInfoObject(){
    let groupId = resolveGroupByChannelId(serverconfig.serverinfo.defaultChannel);
    let group = null;
    if(groupId !== null){
        group = serverconfig?.groups[groupId];
    }

    return {
        serverinfo: {
            name: serverconfig.serverinfo.name,
            description: serverconfig.serverinfo.description,
            countryCode: serverconfig.serverinfo.countryCode,
            about: serverconfig.serverinfo.home.about || null,
            banner: serverconfig.serverinfo.home.banner_url || null,
            icon: group?.info?.icon || null,
            slots: {
                online: getOnlineMemberCount(),
                limit: serverconfig.serverinfo.slots.limit,
                reserved: serverconfig.serverinfo.slots.reserved,
            },
            defaultChannel: serverconfig.serverinfo.defaultChannel,
            uploadFileTypes: serverconfig.serverinfo.uploadFileTypes,
            messageLoadLimit: serverconfig.serverinfo.messageLoadLimit,
            voip: serverconfig.serverinfo.livekit.enabled,
            sqlEnabled: serverconfig.serverinfo.sql.enabled,
            registration: serverconfig.serverinfo.registration.enabled,
            instance: {
                contact: serverconfig.serverinfo.instance.contact
            },
            version: versionCode,
            public_key: await signer.getPublicKey()
        }
    };
}

export default (io) => (socket) => {
    // socket.on code here
    socket.on("getServerInfo", async function (member, response) {
        if (validateMemberId(member?.id, socket,  member?.token) === true
        ) {

            var serverInfoObj = await getPublicServerInfoObject();

            if (hasPermission(member.id, "manageServer")) {
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
        if (validateMemberId(member?.id, socket,  member?.token) === true
        ) {
            if (hasPermission(member.id, "manageServer")) {
                if(member?.serverinfo?.name != null) serverconfig.serverinfo.name = member.serverinfo.name;
                if(member?.serverinfo?.description != null) serverconfig.serverinfo.description = member.serverinfo.description;
                if(member?.serverinfo?.countryCode != null) serverconfig.serverinfo.countryCode = member.serverinfo.countryCode;

                if(member?.serverinfo?.uploadFileTypes != null) serverconfig.serverinfo.uploadFileTypes = member.serverinfo.uploadFileTypes;
                if(member?.serverinfo?.defaultChannel != null) serverconfig.serverinfo.defaultChannel = member.serverinfo.defaultChannel;

                if(member?.serverinfo?.registration?.enabled != null) serverconfig.serverinfo.registration.enabled = member.serverinfo.registration.enabled;
                if(member?.serverinfo?.discovery?.enabled != null) serverconfig.serverinfo.discovery.enabled = member.serverinfo.discovery.enabled;
                if(member?.serverinfo?.discovery?.defaultStatus != null) serverconfig.serverinfo.discovery.defaultStatus = member.serverinfo.discovery.defaultStatus;

                if(member?.serverinfo?.instance?.contact?.email != null) serverconfig.serverinfo.instance.contact.email = member.serverinfo.instance.contact.email;
                if(member?.serverinfo?.instance?.contact?.website != null) serverconfig.serverinfo.instance.contact.website = member.serverinfo.instance.contact.website;
                if(member?.serverinfo?.instance?.contact?.reddit != null) serverconfig.serverinfo.instance.contact.reddit = member.serverinfo.instance.contact.reddit;
                if(member?.serverinfo?.instance?.contact?.discord != null) serverconfig.serverinfo.instance.contact.discord = member.serverinfo.instance.contact.discord;
                if(member?.serverinfo?.instance?.contact?.github != null) serverconfig.serverinfo.instance.contact.github = member.serverinfo.instance.contact.github;
                if(member?.serverinfo?.instance?.contact?.owner?.name != null) serverconfig.serverinfo.instance.contact.owner.name = member.serverinfo.instance.contact.owner.name;
                if(member?.serverinfo?.instance?.contact?.signal != null) serverconfig.serverinfo.instance.contact.signal = member.serverinfo.instance.contact.signal;

                if(member?.serverinfo?.maxUploadStorage != null) serverconfig.serverinfo.maxUploadStorage = member.serverinfo.maxUploadStorage;
                if(member?.serverinfo?.rateLimit != null) serverconfig.serverinfo.rateLimit = member.serverinfo.rateLimit;
                if(member?.serverinfo?.dropInterval != null) serverconfig.serverinfo.dropInterval = member.serverinfo.dropInterval;

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
