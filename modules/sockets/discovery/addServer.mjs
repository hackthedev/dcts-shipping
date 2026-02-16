import {rateLimit} from "../../functions/ratelimit.mjs";
import {app, serverconfig} from "../../../index.mjs";
import {checkHostDiscovery, discoverHosts, getDiscoveredHosts} from "../../functions/discovery.mjs";
import Logger from "../../functions/logger.mjs";
import express from "express";

const pingLimiter = rateLimit({
    windowMs: 60_000,
    ipLimit: 10,
    sigLimit: 50,
    trustProxy: true
});

app.post("/servers/add/:address", pingLimiter, express.json(), async (req, res) => {
    const {address} = req.params;
    if(!address){
        return res.status(400).json({error: "Missing server address"});
    }

    console.log("Received submitted server: ", address)
    checkHostDiscovery(address)
    return res.status(200).json({success: true});
});



export default (io) => (socket) => {
}
