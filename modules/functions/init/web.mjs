import path from "path";
import {serverconfig} from "./config.mjs";
//import {versionCode} from "../../../index.mjs";
import {generateId} from "../main.mjs";
import {resolveCategoryByChannelId, resolveGroupByChannelId} from "../chat/main.mjs";
import ExpressStarter from "@hackthedev/express-starter";
export let webPort = process.env.PORT || serverconfig?.serverinfo?.port;

export let starter = null;
export let app = null;
export let express = null;
export let server = null;

export async function initWebserver(onStarted = null){
    starter = new ExpressStarter()
    starter.registerErrorHandlers(); // avoid crashing and enable error logging

    starter.registerTemplateMiddleware({
        publicWebDir: path.join(process.cwd(), "public"),
        getPlaceholders: async (req) => {
            const { channel } = req.query;

            let group = resolveGroupByChannelId(channel)
            let category = resolveCategoryByChannelId(channel)

            return [
                ["server.home.banner_url", () => serverconfig?.serverinfo?.home?.banner_url],
                ["server.home.title", () => serverconfig?.serverinfo?.home?.title],
                ["server.home.subtitle", () => serverconfig?.serverinfo?.home?.subtitle],
                ["server.home.about", () => serverconfig?.serverinfo?.home?.about],

                // vc
                ["livekit.url", () => `${process.env.LIVEKIT_URL || serverconfig.serverinfo.livekit.url}`],

                //["version", () => versionCode],
                ["random", () => generateId(20)],
                ["default_theme", () => serverconfig?.serverinfo?.defaultTheme || "default.css"],

                ["meta.page.title", () => getMetaTitle(group, category, channel)],
                ["meta.page.description", () => getMetaDescription(group, category, channel)],
                ["server.name", () => serverconfig?.serverinfo?.name || "No Server Name found"],
                ["group", () => serverconfig?.groups?.[group]?.info?.name || "No Group Provided"],
                ["category", () => serverconfig?.groups?.[group]?.channels.categories[category].info.name || "No Category Provided"],
                ["channel", () => serverconfig?.groups?.[group]?.channels?.categories?.[category]?.channel?.[channel]?.name || "No Channel Provided"],
            ]
        }
    }); // cool template engine

    // important for api and everything
    starter.app.use((req, res, next) => {
        const origin = req.headers.origin;

        res.header("Access-Control-Allow-Origin", "*");
        res.header("Vary", "Origin");
        res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
        res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
        res.header("Access-Control-Max-Age", "86400");
        res.set("Cache-Control", "no-store");

        if (req.method === "OPTIONS") {
            return res.sendStatus(204);
        }

        next();
    });

    app = starter.app;
    express = starter.express;
    server = starter.server;

    starter.app.use(
        starter.express.static(
            path.join(process.cwd(), "public")
        )
    );

    starter.startHttpServer(webPort)
}


function getMetaTitle(groupId, categoryId, channelId) {
    try {
        let channelName = serverconfig.groups[groupId].channels.categories[categoryId].channel[channelId].name;
        return `Chat ${ channelName ? `in #${channelName} » ${serverconfig.serverinfo.name}` : `on ${serverconfig.serverinfo.name}`}`;
    } catch {
        return `Join the conversation on ${serverconfig.serverinfo.name}`;
    }
}

function getMetaDescription(groupId, categoryId, channelId) {

    if (groupId !== null && categoryId !== null && channelId !== null) {
        // get channel specific description
        return getChannelSpecificDescription(groupId, categoryId, channelId);
    }

    if (groupId !== null && categoryId === null && channelId === null) {
        // get category specific description
        return getCategorySpecificDescription(groupId, categoryId, channelId);
    }

    if (groupId !== null && categoryId === null && channelId === null) {
        // get group specific description
        return getGroupSpecificDescription(groupId, categoryId, channelId);
    }

    return "Join now and chat with others!";
}

function getChannelSpecificDescription(groupId, categoryId, channelId) {
    try {
        return `Join the conversation on ${serverconfig.serverinfo.name} and chat in #${serverconfig.groups[groupId].channels.categories[categoryId].channel[channelId].name}`;
    } catch {
        return `Join the conversation on ${serverconfig.serverinfo.name}`;
    }
}

function getCategorySpecificDescription(groupId, categoryId) {
    try {
        return `Check out #${serverconfig.groups[groupId].channels.categories[categoryId].info.name} on ${serverconfig.serverinfo.name}`;
    } catch {
        return `Join the conversation on ${serverconfig.serverinfo.name}`;
    }
}

function getGroupSpecificDescription(groupId, categoryId) {
    try {
        return `Check out ${serverconfig.groups[groupId].info.name} on ${serverconfig.serverinfo.name}`;
    } catch {
        return `Join the conversation on ${serverconfig.serverinfo.name}`;
    }
}