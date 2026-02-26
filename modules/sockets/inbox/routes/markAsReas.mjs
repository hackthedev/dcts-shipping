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
