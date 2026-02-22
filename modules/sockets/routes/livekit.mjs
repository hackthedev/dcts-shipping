import fetch from "node-fetch";
import {app, fs, serverconfig} from "../../../index.mjs";
import {getCache, setCache} from "../../functions/ip-cache.mjs";
import JSONTools from "@hackthedev/json-tools";
import Logger from "@hackthedev/terminal-logger";
import yaml from "js-yaml";
import {AccessToken, WebhookReceiver} from "livekit-server-sdk";
import {hasPermission} from "../../functions/chat/main.mjs";
import express from "express";
import path from "path";


const livekitPath = process.env.LIVEKIT_YAML_PATH || path.join(path.resolve(), "livekit", "livekit.yaml");

if (!fs.existsSync(livekitPath)) {
    Logger.error(`LiveKit config file not found at: ${livekitPath}`);
    process.exit(0);
}

const fileContents = fs.readFileSync(livekitPath, "utf8");
const data = yaml.load(fileContents);
const firstEntry = Object.entries(data.keys || {})[0];

const API_KEY = firstEntry?.[0] || serverconfig.serverinfo.livekit.key;
const API_SECRET = firstEntry?.[1] || serverconfig.serverinfo.livekit.secret;

const webhookReceiver = new WebhookReceiver(API_KEY, API_SECRET);

app.post("/token", async (req, res) => {
    const {roomName, participantName, memberId, channelId} = req.body;

    if (!roomName || !participantName) {
        res
            .status(400)
            .json({error: "roomName and participantName are required"});
        return;
    }

    if (!hasPermission(memberId, "useVOIP", channelId)) {
        res.status(403).json({error: "You're not allowed to chat here"});
        return;
    }

    const at = new AccessToken(API_KEY, API_SECRET, {
        identity: participantName,
    });
    at.addGrant({roomJoin: true, room: roomName});
    const token = await at.toJwt();

    res.json({token});
});

app.post("/livekit/webhook", express.raw({type: "*/*"}), async (req, res) => {
    try {
        const event = await webhookReceiver.receive(
            req.body,
            req.get("Authorization"),
        );
        console.log(event);
    } catch (error) {
        console.error("Error validating webhook event", error);
    }
    res.status(200).send();
});

export default (io) => (socket) => {};
