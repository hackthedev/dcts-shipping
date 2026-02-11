export class Emoji {
    constructor(filename) {
        // init all the shit so we always have a complete object at least.
        // doesnt matter if some shit is null
        this.filename = filename;
        this.name = null;
        this.uploader = null;
        this.user_reaction = null;
        this.userReactionLimit = null;
        this.allowedRoles = [];
        this.group = null;
        this.group_icon = null;
        this.audio = {
            src: null,
            volume: null,
            random_pitch: null,
        };
    }

    setName(value) {
        this.name = value || "";
        return this;
    }

    setUploader(value) {
        this.uploader = value  || "";
        return this;
    }

    setUserReaction(value) {
        this.user_reaction = !!value || false;
        return this;
    }

    setUserReactionLimit(value) {
        this.userReactionLimit = value || 0;
        return this;
    }

    setAllowedRoles(value) {
        this.allowedRoles = value || [];
        return this;
    }

    setGroup(value) {
        this.group = value;
        return this;
    }

    setGroupIcon(src) {
        this.group_icon = src;
        return this;
    }

    setAudioSource(value) {
        this.audio.src = value;
        return this;
    }

    setAudioVolume(value) {
        this.audio.volume = value;
        return this;
    }

    enableRandomAudioPitch(value) {
        this.audio.random_pitch = !!value;
        return this;
    }

    #toPlain(obj) {
        const result = {};

        for (const [key, value] of Object.entries(obj)) {
            if (typeof value === "function") continue;

            if (value && typeof value === "object" && !Array.isArray(value)) {
                result[key] = this.#toPlain(value);
            } else {
                result[key] = value;
            }
        }

        return result;
    }

    get object() {
        return this.#toPlain(this)
    }

    toJSON() {
        return this.object;
    }

    toString() {
        return JSON.stringify(this.object, null, 4);
    }
}
