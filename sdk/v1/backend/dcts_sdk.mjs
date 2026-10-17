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

            static validators = {
                name: [value => typeof value === "string" && value.trim().length > 0 && value.length <= 20, "Name must be a string and max 20 char. long"]
            }

            #check(key, value) {
                const validator = this.constructor.validators[key];
                if (!validator) throw new Error(`Unknown key: ${key}`);

                const [check, error] = validator;
                if (!check(value)) throw new Error(error ?? `Invalid value for ${key}`);
            }

            setValue(key, value, allowHTML = false) {
                this.#check(key, value);
                this.data[key] = allowHTML ? sanitizeHTML(value) : stripHTML(value);
                return this;
            }

            validate() {
                const errors = [];

                for (const [key, [check, error]] of Object.entries(this.constructor.validators)) {
                    if (!check(this.data[key])) {
                        errors.push(error ?? `Invalid value for ${key}`);
                    }
                }

                return {
                    valid: errors.length === 0,
                    errors
                };
            }

            setOnboarding(boolean){
                return this.setValue("onboarding", !!boolean);
            }

            setVerifiedKey(boolean){
                return this.setValue("isVerifiedKey", !!boolean);
            }

            setMuted(boolean){
                return this.setValue("isMuted", !!boolean);
            }

            setBanned(boolean){
                return this.setValue("isBanned", !!boolean);
            }

            setLastOnline(timestamp){
                return this.setValue("lastOnline", timestamp);
            }

            setJoined(timestamp){
                return this.setValue("joined", timestamp);
            }

            setCountryCode(code){
                return this.setValue("country_code", code);
            }

            setLoginName(content){
                return this.setValue("loginName", content);
            }

            setId(id){
                return this.setValue("id", id);
            }

            setToken(token){
                return this.setValue("token", token);
            }

            setPublicKey(publicKey) {
                return this.setValue("publicKey", publicKey);
            }

            setStatus(content) {
                return this.setValue("status", content);
            }

            setAbout(content) {
                return this.setValue("aboutme", content);
            }

            async setPassword(password) {
                this.#check("password", password);
                this.data.password = await DCTS.Tools.Cryptography.hashPassword(password);
                return this;
            }

            setCard(url = null) {
                return this.setValue("card", url);
            }

            setBanner(url = null) {
                return this.setValue("banner", url);
            }

            setIcon(url = "/img/default_pfp.png") {
                return this.setValue("icon", url);
            }

            setName(content){
                return this.setValue("name", content);
            }

            toJSON(){
                return {
                    ...structuredClone(this.data)
                };
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
                this.data.editedAt = timestamp === null ? null : Number(stripHTML(timestamp));
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