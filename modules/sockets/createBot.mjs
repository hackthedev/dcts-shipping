import fs from "fs";
import path from "path";
import { saveConfig, serverconfig, xssFilters } from "../../index.mjs";
import { hasPermission } from "../functions/chat/main.mjs";
import Logger from "../functions/logger.mjs";
import { generateId, validateMemberId } from "../functions/main.mjs";
import { saveMemberToDB } from "../functions/mysql/helper.mjs";

const UPLOAD_DIR = "./public/uploads";
const MIME_TO_EXT = { "image/png": "png", "image/jpeg": "jpg", "image/jpg": "jpg", "image/gif": "gif", "image/webp": "webp" };

function persistBotIconFromDataUrl(botId, dataUrl) {
    if (!dataUrl || typeof dataUrl !== "string" || !dataUrl.startsWith("data:image")) return null;
    const match = dataUrl.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!match) return null;
    const mime = `image/${match[1].toLowerCase()}`;
    const ext = MIME_TO_EXT[mime] || "png";
    const base64 = match[2];
    if (!base64) return null;
    try {
        const buf = Buffer.from(base64, "base64");
        fs.mkdirSync(UPLOAD_DIR, { recursive: true });
        const filename = `bot_${botId}.${ext}`;
        const filepath = path.join(UPLOAD_DIR, filename);
        fs.writeFileSync(filepath, buf);
        return `/uploads/${filename}`;
    } catch (e) {
        Logger.debug("persistBotIconFromDataUrl", e);
        return null;
    }
}

export default (io) => (socket) => {
    socket.on('createBot', async function (member, response) {
        if (validateMemberId(member.id, socket, member.token) === true &&
            serverconfig.servermembers[member.id].token === member.token) {

            if (!hasPermission(member.id, "manageRoles")) {
                response({ type: "error", error: "Missing permissions" });
                return;
            }

            try {
                const botId = generateId(12);
                const botToken = generateId(48);

                let icon = "/img/default_icon.png";
                if (member.icon) {
                    const cleaned = xssFilters.inHTMLData(member.icon);
                    if (cleaned.startsWith("data:image")) {
                        const persisted = persistBotIconFromDataUrl(botId, cleaned);
                        if (persisted) icon = persisted;
                    } else {
                        icon = cleaned;
                    }
                }

                const newBot = {
                    id: botId,
                    token: botToken,
                    loginName: xssFilters.inHTMLData(member.name || `Bot_${generateId(4)}`),
                    name: xssFilters.inHTMLData(member.name || "New Bot"),
                    nickname: null,
                    status: "Bot",
                    aboutme: "I am a bot.",
                    icon,
                    banner: "",
                    joined: new Date().getTime(),
                    isOnline: 0,
                    lastOnline: new Date().getTime(),
                    isBanned: 0,
                    isMuted: 0,
                    password: null, // Bots don't login via password
                    publicKey: "",
                    isVerifiedKey: false,
                    isBot: true,
                    onboarding: true
                };

                serverconfig.servermembers[botId] = newBot;

                // add to default role for perms and member list
                if (serverconfig.serverroles["0"] && !serverconfig.serverroles["0"].members.includes(botId)) {
                    serverconfig.serverroles["0"].members.push(botId);
                }

                await saveConfig(serverconfig);
                await saveMemberToDB(botId, newBot);

                response({ type: "success", bot: { id: botId, token: botToken, name: newBot.name, icon: newBot.icon } });
            } catch (e) {
                Logger.error("Couldnt create bot");
                Logger.error(e);
                response({ type: "error", error: "Server Error" });
            }
        }
    });
}
