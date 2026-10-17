import {UNCATEGORIZED_ID} from "../../../plugins/dcts-discord-bridge/functions/plugin_onLoad.mjs";
import {normalizeVar} from "../../../modules/sockets/userConnected.mjs";
import {sanitizeHTML, stripHTML} from "../../../modules/functions/sanitizing/functions.mjs";

export default class DCTS {
    static Members = new class{
        Builder = new class {
            constructor() {
                this.data = {
                    id: null,
                    token: null,
                    name: null,
                    loginName: null,
                    nickname: null,
                    icon: null,
                    banner: null,
                    aboutme: null,
                    status: null,
                    country_code: null,
                    publicKey: null,
                    joined: null,
                    isOnline: null,
                    lastOnline: null,
                    isBanned: null,
                    isMuted: null,
                    password: null,
                    isVerifiedKey: null,
                    onboarding: null,
                    type: null,
                }
            }

            setName(name){
                if(!name) throw new Error("Missing name!");
                if(name?.tim()?.length === 0) throw new Error("Name cant be empty!");
                if(name.length > 20) throw new Error("Name cant be longer than 20 characters!");
                this.data.name = stripHTML(name);
            }
        }
    }
    
    static Messages = new class {
        Builder = class {
            constructor(){
                this.data = {
                    messageId: null,
                    channel: null,
                    room: null,
                    message: null,      // content as string. supports html
                    type: null,         // used for plugins. null = default dcts message
                    timestamp: null,    // when the message was created
                    editedAt: null,     // when it was edited
                    author: {
                        id: null,       // author id only!
                    }
                }
            }

            setAuthor(authorId){
                if(!authorId) throw new Error("Author id is required!");
                if(String(authorId)?.length !== 12) throw new Error("Author id length is invalid")
                if(typeof authorId !== "number" && authorId) throw new Error("Author id needs to be a number!");
                this.data.author.id = authorId;
                return this;
            }

            setEditedTimestamp(timestamp = null){
                if(typeof timestamp  !== "number" && timestamp) throw new Error("Timestamp must be a number (unix timestamp)!")
                this.data.editedAt = timestamp;
                return this;
            }

            setCreatedTimestamp(timestamp = new Date().getTime()){
                if(typeof timestamp  !== "number" && timestamp) throw new Error("Timestamp must be a number (unix timestamp)!")
                this.data.timestamp = timestamp;
                return this;
            }

            setType(type = null){
                if(typeof type !== "string" && type) throw new Error("Message type must be a string!")
                this.data.type = type;
                return this;
            }

            setContent(content){
                if(!content) throw new Error("Missing message content!")
                if(content?.trim()?.length === 0) throw new Error("Message cant be empty!")
                this.data.message = sanitizeHTML(content);
                return this;
            }

            setChannel(channelId){
                if(!channelId) throw new Error("Missing channel id!");
                if(typeof channelId !== "string") throw new Error("Channel id must be a string");

                this.data.channel = channelId;
                this.data.room = channelId;
                return this;
            }

            toJSON(){
                return {
                    ...this.data
                };
            }
        }
    }
}