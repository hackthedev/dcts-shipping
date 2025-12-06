import {rateLimit} from "../../functions/ratelimit.mjs";
import {app, serverconfig} from "../../../index.mjs";
import {getDiscoveredHosts} from "../../functions/discovery.mjs";
import Logger from "../../functions/logger.mjs";
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

app.get("/servers", pingLimiter, express.json(), async (req, res) => {
    res.set("Cache-Control", "no-store");

    try {
        if (serverconfig.serverinfo?.discovery?.enabled === true) {
            let serverlist = await getDiscoveredHosts();
            res.json({
                servers: serverlist
            })

            return;
        }
    } catch (e) {
        Logger.error(e);
        res.json({error: "Internal server error"})
    }

    res.json({error: "Discovery is not enabled on this server"});
});


export default (io) => (socket) => {
}
