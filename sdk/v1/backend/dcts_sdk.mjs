import {sanitizeHTML, stripHTML} from "../../../modules/functions/sanitizing/functions.mjs";
import argon2 from "argon2";
import {getMemberAccountById} from "../../../modules/functions/member.mjs";
import {saveMemberToDB} from "../../../modules/functions/mysql/helper.mjs";
import {saveConfig, serverconfig} from "../../../modules/functions/init/config.mjs";
import {addBan, removeBan} from "../../../modules/functions/ban-system/helpers.mjs";
import {sendMessageToUser} from "../../../modules/functions/main.mjs";
import {io} from "../../../modules/functions/init/sockets.mjs";
import {getNewDate} from "../../../modules/functions/chat/main.mjs";
import {addMute, removeMute} from "../../../modules/functions/mute-system/helpers.mjs";
import {signer} from "../../../modules/functions/init/general.mjs";

export default class DCTS {
    static Tools = new class {
        Sockets = new class {
            getSocketFromMemberId(memberId) {
                if (!memberId) throw new Error("No member id provided")
                return [...io.sockets.sockets.values()].find(socket => socket.memberId === memberId)?.memberId ?? null;
            }
        }
        Media = new class {
            getInternalUrl(url) {
                if (!url) throw new Error("Missing url parameter");

                const host = serverconfig?.serverinfo?.app?.url?.dcts;
                if (!host) throw new Error("Missing host parameter in config! (serverinfo.app.url.dcts)");

                const cleanUrl = String(url).trim();
                const base = host.includes("://") ? host : `http://${host}`;

                if (!cleanUrl.includes("://")) {
                    return cleanUrl.startsWith("/") ? cleanUrl : `/${cleanUrl}`;
                }

                const parsed = new URL(cleanUrl);
                const allowed = new URL(base);

                if (parsed.host !== allowed.host) return cleanUrl;

                return `${parsed.pathname}${parsed.search}${parsed.hash}`;
            }

            getExternalUrl(url) {
                if (!url) throw new Error("Missing url parameter");

                const host = serverconfig?.serverinfo?.app?.url?.dcts;
                if (!host) throw new Error("Missing host parameter in config! (serverinfo.app.url.dcts)");

                const cleanUrl = String(url).trim();
                if (cleanUrl.includes("://")) return cleanUrl;

                const base = host.includes("://") ? host : `http://${host}`;
                return new URL(this.getInternalUrl(cleanUrl), base).href;
            }
        }

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

        get(obj, path) {
            let current = obj;

            for (const part of path.split(".")) {
                current = current?.[part];
            }

            return current;
        }

        set(obj, path, value) {
            const parts = path.split(".");
            const last = parts.pop();
            let target = obj;

            for (const part of parts) {
                if (typeof target[part] !== "object" || target[part] === null) target[part] = {};
                target = target[part];
            }

            target[last] = value;
        }
    }

    static BaseBuilder = class {
        check(key, value) {
            const validator = this.constructor.validators[key];
            if (!validator) throw new Error(`Unknown key: ${key}`);

            const [check, error] = validator;
            if (!check(value)) throw new Error(error ?? `Invalid value for ${key}`);
        }

        setValue(key, value, allowHTML = false) {
            this.check(key, value);

            const clean = typeof value === "string"
                ? (allowHTML ? sanitizeHTML(value) : stripHTML(value))
                : value;

            DCTS.Tools.set(this.data, key, clean);
            return this;
        }

        validate() {
            const errors = [];

            for (const [key, [check, error]] of Object.entries(this.constructor.validators)) {
                if (!check(DCTS.Tools.get(this.data, key))) errors.push(error ?? `Invalid value for ${key}`);
            }

            return {valid: errors.length === 0, errors};
        }

        toJSON() {
            return structuredClone(this.data);
        }
    }

    static Members = new class {
        Builder = class extends DCTS.BaseBuilder {
            static validators = {
                name: [value => typeof value === "string" && value.trim().length > 0 && value.length <= 20, "Name must be a string and max 20 char. long"],
                id: [value => typeof value === "string" && value.trim().length > 0, "Id must be a string"],
                token: [value => typeof value === "string" && value.trim().length === 48, "token must be a 48 character long string"],
                loginName: [value => typeof value === "string" && value.trim().length > 0, "login name must be a string and non empty"],
                icon: [value => (typeof value === "string" && value.trim().length > 0) || value == null, "Icon url must be a string or null"],
                banner: [value => (typeof value === "string" && value.trim().length > 0) || value == null, "Banner url must be a string or null"],
                card: [value => (typeof value === "string" && value.trim().length > 0) || value == null, "Card url must be a string or null"],
                aboutme: [value => (typeof value === "string") || value === null, "Aboutme must be a string or null"],
                status: [value => (typeof value === "string") || value === null, "Status must be a string or null"],
                country_code: [value => (typeof value === "string" && value.trim().length <= 3) || value == null, "Country code must be a string or null and 2 characters long"],
                publicKey: [value => (typeof value === "string" && value.trim().length > 0) || value == null, "Public key must be a string or null"],
                joined: [value => (typeof value === "number") || value == null, "Timestamp must be a unix timestamp number"],
                lastOnline: [value => (typeof value === "number") || value == null, "Timestamp must be a unix timestamp number"],
                isBanned: [value => typeof value === "boolean", "Value must be a boolean"],
                isMuted: [value => typeof value === "boolean", "Value must be a boolean"],
                isVerifiedKey: [value => typeof value === "boolean", "Value must be a boolean"],
                onboarding: [value => typeof value === "boolean", "Value must be a boolean"],
                password: [value => typeof value === "string", "Password must be a string"],
                type: [value => (typeof value === "string") || value == null, "Type must be a string"],
            }

            constructor(customData = {}) {
                super();
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

            disconnect(reason = null) {
                let socketId = DCTS.Tools.Sockets.getSocketFromMemberId(this.data.id);
                if (!socketId) return {error: `No socket found with id ${this.data?.id}}`};

                try {
                    sendMessageToUser(socketId, {
                        title: "You've been disconnected",
                        message: reason ? `Reason:<br>${reason}` : "",
                        buttons: {
                            "0": {
                                text: "Ok",
                                events: "onclick='closeModal()'"
                            }
                        },
                        type: "error",
                        displayTime: 600000,
                        wasDisconnected: true
                    });

                    io.sockets.sockets.get(socketId).disconnect();
                } catch (ex) {
                    return {error: ex}
                }

                return {error: null};
            }

            async unmute(...identifiers) {
                identifiers = identifiers.filter(id => id !== undefined && id !== null);
                if(identifiers?.length === 0) throw new Error("Identifier is required");
                let result = await removeMute(...identifiers);
                io.emit("updateMemberList");
                return result;
            }

            async mute({
                           issuerMemberId = "system",
                           duration = "perma",
                           reason = ""
                       }) {

                let muteResult = null;
                if(this.data.publicKey){
                    muteResult = await addMute({
                        identifier: signer.normalizePublicKey(this.data.publicKey),
                        issuerId: issuerMemberId,
                        duration,
                        reason,
                    })
                }
                else if(this.data.id){
                    muteResult = addMute({
                        identifier: this.data.id,
                        issuerId: issuerMemberId,
                        duration,
                        reason,
                    })
                }
                else{
                    throw new Error("Neighter a member id or public key was found")
                }

                this.save();
                io.emit("updateMemberList");
                return muteResult;
            }

            async save() {
                if (!this.data.id) throw new Error("missing member id!")
                if (!this.data.token) throw new Error("missing member token!")
                if (!this.data.loginName) throw new Error("missing login name!")

                await saveMemberToDB(this.data.id, this.data);

                serverconfig.servermembers[this.data.id] ??= {};
                serverconfig.servermembers[this.data.id] = {
                    ...serverconfig.servermembers[this.data.id],
                    ...this.data
                }

                return true;
            }

            async unban(identifier) {
                let result = null;
                if (this.data.publicKey) {
                    result = await removeBan(identifier)
                }
                if (this.data.id) {
                    result = await removeBan(identifier)
                }

                return result;
            }

            async ban({bannedBy = "system", reason = "", until = -1}) {
                let result = null;
                if (this.data.publicKey) {
                    result = await addBan({
                        identifier: this.data.publicKey,
                        bannedBy,
                        reason,
                        until
                    })
                }
                if (this.data.id) {
                    result = await addBan({
                        identifier: this.data.id,
                        bannedBy,
                        reason,
                        until
                    })
                }

                return result;
            }

            setOnboarding(boolean) {
                return this.setValue("onboarding", !!boolean);
            }

            setVerifiedKey(boolean) {
                return this.setValue("isVerifiedKey", !!boolean);
            }

            setBanned(boolean) {
                return this.setValue("isBanned", !!boolean);
            }

            setLastOnline(timestamp) {
                return this.setValue("lastOnline", timestamp);
            }

            setJoined(timestamp) {
                return this.setValue("joined", timestamp);
            }

            setCountryCode(code) {
                return this.setValue("country_code", code);
            }

            setLoginName(content) {
                return this.setValue("loginName", content);
            }

            setId(id) {
                return this.setValue("id", id);
            }

            setToken(token) {
                return this.setValue("token", token);
            }

            setPublicKey(publicKey) {
                return this.setValue("publicKey", publicKey);
            }

            setStatus(content) {
                return this.setValue("status", content);
            }

            setAbout(content) {
                return this.setValue("aboutme", content, true);
            }

            async setPassword(password) {
                this.check("password", password);
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

            setName(content) {
                return this.setValue("name", content);
            }

            setType(content) {
                return this.setValue("type", content);
            }
        }

        async load(identifier, issuerId = null) {
            if (!identifier) throw new Error("Missing identifier!");
            let account = await getMemberAccountById(identifier, issuerId)
            if (account) this.data = {...account}
            return new this.Builder(account);
        }
    }

    static Messages = new class {
        Builder = class extends DCTS.BaseBuilder {
            static validators = {
                messageId: [value => (typeof value === "string" && value.trim().length > 0) || value === null, "Message id must be a string or null"],
                channel: [value => typeof value === "string" && value.trim().length > 0, "Channel id must be a non empty string"],
                room: [value => typeof value === "string" && value.trim().length > 0, "Room id must be a non empty string"],
                message: [value => typeof value === "string" && value.trim().length > 0, "Message must be a non empty string"],
                type: [value => (typeof value === "string" && value.trim().length > 0) || value === null, "Message type must be a string or null"],
                timestamp: [value => typeof value === "number", "Timestamp must be a unix timestamp number"],
                editedAt: [value => typeof value === "number" || value === null, "Timestamp must be a unix timestamp number or null"],
                "author.id": [value => typeof value === "string" && value.length === 12, "Author id must be a string with 12 characters"],
            }

            constructor(customData = {}) {
                super();
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

            setAuthor(authorId) {
                return this.setValue("author.id", authorId);
            }

            setEditedTimestamp(timestamp = null) {
                return this.setValue("editedAt", timestamp);
            }

            setCreatedTimestamp(timestamp = Date.now()) {
                return this.setValue("timestamp", timestamp);
            }

            setType(type = null) {
                return this.setValue("type", type);
            }

            setContent(content) {
                return this.setValue("message", content, true);
            }

            setChannel(channelId) {
                this.setValue("channel", channelId);
                return this.setValue("room", channelId);
            }
        }
    }
}