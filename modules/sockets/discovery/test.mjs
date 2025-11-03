import {app, serverconfig, versionCode} from "../../../index.mjs";
import {getOnlineMemberCount, resolveGroupByChannelId} from "../../functions/chat/main.mjs";
import Logger from "../../functions/logger.mjs";
import {rateLimit} from "../../functions/ratelimit.mjs";
import express from "express";

const pingLimiter = rateLimit({
    windowMs: 60_000,
    ipLimit: 1500,
    sigLimit: 120000,
    trustProxy: true
});


app.use((req, res, next) => {
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

app.get("/discover", pingLimiter, express.json(), (req, res) => {
    res.set("Cache-Control", "no-store");

    try {

        if (serverconfig.serverinfo?.discovery?.enabled === true) {

            let groupId = resolveGroupByChannelId(serverconfig.serverinfo.defaultChannel);
            let group = null;
            if(groupId !== null){
                group = serverconfig.groups[groupId];
            }

            res.json({
                serverinfo: {
                    name: serverconfig.serverinfo.name || null,
                    about: serverconfig.serverinfo.home.about || null,
                    banner: serverconfig.serverinfo.home.banner_url || null,
                    icon: group?.info?.icon || null,
                    slots: {
                        online: getOnlineMemberCount(),
                        limit: serverconfig.serverinfo.slots.limit,
                        reserved: serverconfig.serverinfo.slots.reserved,
                    },
                    registration: serverconfig.serverinfo.registration.enabled,
                    tenor: serverconfig.serverinfo.tenor.enabled,
                    uploadFileTypes: serverconfig.serverinfo.uploadFileTypes,
                    turn: serverconfig.serverinfo.turn.enabled,
                    version: versionCode
                }
            })

            return;
        }
    } catch (e) {
        Logger.error(e);
        res.json({error: "Internal server error"})
    }

    res.json({error: "Discovery is not enabled on this server"});
});

// will break if removed
export default (io) => (socket) => {
}
