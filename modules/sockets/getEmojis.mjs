import { fs, serverconfig } from "../../index.mjs";
import Logger from "../functions/logger.mjs";
import { validateMemberId } from "../functions/main.mjs";
import path from "path";
const EMOJI_CONFIG_PATH = "./configs/emojis.json";
import {Emoji} from "../functions/Emoji.mjs"
import {getFileHash} from "./routes/upload.mjs";

function checkEmojiConfig(){
    const dir = path.dirname(EMOJI_CONFIG_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    if (!fs.existsSync(EMOJI_CONFIG_PATH))
        fs.writeFileSync(EMOJI_CONFIG_PATH, "{}");
}
export function getEmojiConfig(filename = null) {
    checkEmojiConfig();

    const data = JSON.parse(fs.readFileSync(EMOJI_CONFIG_PATH, "utf8") || "{}");
    if (filename) return data[filename] || null;
    return data;
}

export function setEmojiConfig(filename, newData = {}) {
    checkEmojiConfig();

    const config = JSON.parse(fs.readFileSync(EMOJI_CONFIG_PATH, "utf8") || "{}");

    config[filename] = { ...(config[filename] || {}), ...newData };
    fs.writeFileSync(EMOJI_CONFIG_PATH, JSON.stringify(config, null, 4));

    return config[filename];
}

export default (io) => (socket) => {
    socket.on("getEmojis", async function (member, response) {
        if (
            validateMemberId(member?.id, socket, member?.token) === true
        ) {
            try {
                const emojiList = fs
                    .readdirSync("./public/emojis")
                    .sort((a, b) => {
                        const aStat = fs.statSync(`./public/emojis/${a}`);
                        const bStat = fs.statSync(`./public/emojis/${b}`);
                        return (
                            new Date(bStat.birthtime).getTime() -
                            new Date(aStat.birthtime).getTime()
                        );
                    });

                const result = [];

                for (const file of emojiList) {
                    let emojiHash = file?.split("_")[0];

                    // we dont have a emoji hash so we modify the file then
                    if(emojiHash?.length !== 64) emojiHash = null;
                    if(!emojiHash){
                        emojiHash = getFileHash(`./public/emojis/${file}`);
                        fs.renameSync(`./public/emojis/${file}`, `./public/emojis/${emojiHash}_${file}`);
                    }

                    let emojiData = getEmojiConfig(emojiHash);
                    let emoji = new Emoji(file)

                    emoji.setUploader(member.id)
                        .setName(file.split("_")[1]?.split(".")[0] || file.split(".")[0])

                    setEmojiConfig(emojiHash, emoji.object);

                    result.push(emoji.object);
                }


                if (result.length > 0) {
                    response({
                        type: "success",
                        data: result,
                        msg: "Successfully received emoji configurations"
                    });
                } else {
                    response({
                        type: "error",
                        data: null,
                        msg: "No emojis found"
                    });
                }
            } catch (e) {
                Logger.error("Could not get emojis");
                Logger.error(e);
            }
        }
    });
};
