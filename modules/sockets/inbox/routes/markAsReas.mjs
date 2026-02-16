import {rateLimit} from "../../../functions/ratelimit.mjs";
import {app, serverconfig} from "../../../../index.mjs";
import {getDiscoveredHosts} from "../../../functions/discovery.mjs";
import Logger from "../../../functions/logger.mjs";
import express from "express";
import {validateMemberId} from "../../../functions/main.mjs";
import {markInboxMessageAsRead} from "../../../functions/mysql/helper.mjs";

const pingLimiter = rateLimit({
    windowMs: 60_000,
    ipLimit: 100,
    sigLimit: 120_000,
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

app.post("/inbox/:inboxId/read", pingLimiter, async (req, res) => {
    const {id, token} = req.body;
    const {inboxId} = req.params;

    if(!serverconfig?.servermembers[id]) return res.status(404).json( { error: "Member not found" });
    if(serverconfig.servermembers[id].token !== token) return res.status(403).json( { error: "Member token incorrect" });

    try {
        await markInboxMessageAsRead(id, inboxId)
        return res.status(200).json({
            error: null
        })
    } catch (e) {
        Logger.error(e);
        res.json({error: "Internal server error"})
    }

    res.json({error: "Discovery is not enabled on this server"});
});


export default (io) => (socket) => {
}
