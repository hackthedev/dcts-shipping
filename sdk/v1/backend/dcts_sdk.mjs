import {sanitizeHTML, stripHTML} from "../../../modules/functions/sanitizing/functions.mjs";
import argon2 from "argon2";

export default class DCTS {
    static Tools = new class{
        Cryptography = new class {
            async hashPassword(password) {
                if (typeof password !== "string" || !password) throw new Error("Invalid password!");

                return await argon2.hash(password, {
                    type: argon2.argon2id,
                    memoryCost: 19456,
                    timeCost: 2,
                    parallelism: 1
                });
            }

            async verifyPassword(password, hash) {
                if (!password || !hash) return false;

                try {
                    return await argon2.verify(hash, password);
                } catch {
                    return false;
                }
            }
        }
    }

    static Members = new class{
        Builder = class {
            constructor(customData = {}) {
                this.data = {
                    id: null,
                    token: null,
                    loginName: null,
                    name: null,         // display name
                    //
                    icon: "/img/default_pfp.png",
                    banner: null,       // profile banner
                    card: null,         // member list image
                    //
                    aboutme: null,      // supports html
                    status: null,
                    //
                    country_code: null,
                    publicKey: null,
                    //
                    joined: null,
                    lastOnline: null,
                    isBanned: false,
                    isMuted: false,
                    isVerifiedKey: false,
                    onboarding: false,
                    //
                    password: null,
                    type: null,
                    ...customData
                }
            }

            setOnboarding(boolean){
                if(!boolean) throw new Error("Missing boolean");
                if(typeof boolean !== "boolean") throw new Error("Only boolean is supported");
                this.data.onboarding = !!boolean;
            }

            setVerifiedKey(boolean){
                if(!boolean) throw new Error("Missing boolean");
                if(typeof boolean !== "boolean") throw new Error("Only boolean is supported");
                this.data.isVerifiedKey = !!boolean;
            }

            setMuted(boolean){
                if(!boolean) throw new Error("Missing boolean");
                if(typeof boolean !== "boolean") throw new Error("Only boolean is supported");
                this.data.isMuted = !!boolean;
            }

            setBanned(boolean){
                if(!boolean) throw new Error("Missing boolean");
                if(typeof boolean !== "boolean") throw new Error("Only boolean is supported");
                this.data.isBanned = !!boolean;
            }

            setLastOnline(timestamp){
                if(!timestamp) throw new Error("Missing timestamp");
                if(typeof timestamp !== "number") throw new Error("Timestamp must be a number!");
                this.data.lastOnline = Number(stripHTML(timestamp));
                return this;
            }

            setJoined(timestamp){
                if(!timestamp) throw new Error("Missing timestamp");
                if(typeof timestamp !== "number") throw new Error("Timestamp must be a number!");
                this.data.joined = Number(stripHTML(timestamp));
                return this;
            }

            setCountryCode(code){
                if(code && typeof code !== "string") throw new Error("Country code needs to be a string!")
                if(code && code.trim().length !== 2) throw new Error("Country code needs to be 2 letters")
                this.data.country_code = stripHTML(code);
                return this;
            }

            setLoginName(content){
                if(!content) throw new Error("Missing Login name!");
                if(typeof content !== "string") throw new Error("Login name must be string!");
                if(content.trim().length === 0) throw new Error("Login name is empty!");
                this.data.loginName = stripHTML(content);
                return this;
            }

            setId(id){
                if(!id) throw new Error("Missing ID!");
                if(typeof id !== "string") throw new Error("ID must be a string!");
                if(id.trim().length !== 12) throw new Error("Invalid ID length (12)!");
                this.data.id = stripHTML(id);
                return this;
            }

            setToken(token){
                if(!token) throw new Error("Invalid token!");
                if(typeof token !== "string") throw new Error("Token must be a string!")
                if(token && token.trim().length === 0) throw new Error("Token cannot be empty!")
                if(token.length !== 64) throw new Error("Invalid token length! (64)");
                this.data.token = stripHTML(token);
                return this;
            }

            setPublicKey(publicKey) {
                if(publicKey && publicKey.trim().length === 0) throw new Error("Invalid publicKey!");
                this.data.publicKey = stripHTML(publicKey);
                return this;
            }

            setStatus(content) {
                if(content && typeof content !== "string") throw new Error("Status needs to be a string!");
                if(content && content?.trim()?.length === 0) throw new Error("Status cannot be empty! Use null to unset.");
                this.data.status = sanitizeHTML(content);
                return this;
            }

            setAbout(content) {
                if(content && typeof content !== "string") throw new Error("About needs to be a string!");
                if(content && content?.trim()?.length === 0) throw new Error("About cannot be empty! Use null to unset.");
                this.data.aboutme = sanitizeHTML(content);
                return this;
            }

            async setPassword(password){
                if(password && typeof password !== "string") throw new Error("Password needs to be a string!");
                if(!password) throw new Error("Password cannot be null");
                if(password?.trim()?.length === 0) throw new Error("Password cannot be empty");

                let hash = await DCTS.Tools.Cryptography.hashPassword(password);
                this.data.password = stripHTML(hash);
                return this;
            }

            setCard(url = null) {
                if(url && typeof url !== "string") throw new Error("URL needs to be a string!");
                if(url && url?.trim()?.length === 0) throw new Error("Url cannot be empty!");
                this.data.card = stripHTML(url);
                return this;
            }

            setBanner(url = null) {
                if(url && typeof url !== "string") throw new Error("URL needs to be a string!");
                if(url && url?.trim()?.length === 0) throw new Error("Url cannot be empty!");
                this.data.banner = stripHTML(url);
                return this;
            }

            setIcon(url = "/img/default_pfp.png") {
                if(!url) throw new Error("Missing URL!");
                if(url && typeof url !== "string") throw new Error("URL needs to be a string!");
                if(url?.trim()?.length === 0) throw new Error("Url cannot be empty!");
                this.data.icon = stripHTML(url);
                return this;
            }

            setName(name){
                if(!name) throw new Error("Missing name!");
                if(name && typeof name !== "string") throw new Error("Name needs to be a string!");
                if(name?.tim()?.length === 0) throw new Error("Name cant be empty!");
                if(name.length > 20) throw new Error("Name cant be longer than 20 characters!");
                this.data.name = stripHTML(name);
                return this;
            }
        }
    }

    static Messages = new class {
        Builder = class {
            constructor(customData = {}){
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
                    },
                    ...customData
                }
            }

            setAuthor(authorId){
                if(!authorId) throw new Error("Author id is required!");
                if(String(authorId)?.length !== 12) throw new Error("Author id length is invalid")
                if(typeof authorId !== "string" && authorId) throw new Error("Author id needs to be a string!");
                this.data.author.id = stripHTML(authorId);
                return this;
            }

            setEditedTimestamp(timestamp = null){
                if(typeof timestamp  !== "number" && timestamp) throw new Error("Timestamp must be a number (unix timestamp)!")
                this.data.editedAt = Number(stripHTML(timestamp));
                return this;
            }

            setCreatedTimestamp(timestamp = new Date().getTime()){
                if(typeof timestamp  !== "number" && timestamp) throw new Error("Timestamp must be a number (unix timestamp)!")
                this.data.timestamp = Number(stripHTML(timestamp));
                return this;
            }

            setType(type = null){
                if(typeof type !== "string" && type) throw new Error("Message type must be a string!")
                this.data.type = stripHTML(type);
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

                this.data.channel = stripHTML(channelId);
                this.data.room = stripHTML(channelId);
                return this;
            }

            toJSON(){
                return {
                    ...structuredClone(this.data)
                };
            }
        }
    }
}