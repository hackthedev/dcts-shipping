class VoIP {
    constructor(livekitUrl = "", applicationServerUrl = "") {
        this.APPLICATION_SERVER_URL = applicationServerUrl;
        this.LIVEKIT_URL = livekitUrl;
        this.room = null;
        this.participants = new Map();
        this.streamSettings = {
            resolution: "1920x1080",
            frameRate: 60,
            maxBitrate: 50_000_000,
        };

        this.onJoin = null;
        this.onLeave = null;
        this.onScreenshareBegin = null;
        this.onScreenshareEnd = null;
        this.onTrackSubscribed = null;
        this.onCameraEnd = null;
        this.onSpeaking = null;
        this._micPub = null;

        this._screenPubs = [];
        this._screenTracks = [];

        // cam shit
        // onlyfriends when?
        this._micPub = null;
        this._camPub = null;

        this.configureUrls();

        this._audioCtx = null;
        this._audioNodes = new Map();
        this._mediaElSources = new WeakMap();
        this._volumes = new Map();
        this._primedMicKey = null;

        if (typeof window !== "undefined") {
            window.addEventListener("micsettingschange", () => {
                this._handleMicSettingsChange().catch((error) => {
                    console.warn("Failed to apply mic settings:", error);
                });
            });
        }
    }

    cleanupAudioElById(audioId, memberId, isScreen) {
        try {
            this.detachAudio(memberId, isScreen);
        } catch (e) {}

        const oldElement = document.getElementById(audioId);
        if (oldElement) {
            oldElement.srcObject = null;
            oldElement.remove();
        }
    }

    async attachAudioTrack(track, participantId, isScreen) {
        // i hate this fucking shit.
        // dont attach your own fucking audio..
        const selfId = this.room?.localParticipant?.identity;
        if (participantId === selfId) return;

        // and if its not a audio track obviously we wont attach it either
        if (track.kind !== "audio") return;

        const audioId = `audio-global-${participantId}${isScreen ? "-screen" : ""}`;
        this.cleanupAudioElById(audioId, participantId, isScreen);

        const audio = track.attach();

        // check for stream else error
        if (!audio.srcObject || !audio.srcObject.getAudioTracks().length) {
            audio.remove();
            return;
        }

        audio.id = audioId;
        audio.autoplay = true;
        audio.setAttribute("data-member-id", participantId);

        document.body.appendChild(audio);
        await this.hookVcAudio(participantId, isScreen, audio);
    }

    async stopScreenshare() {
        if (!this.room?.localParticipant) return;
        const participantId = this.room.localParticipant.identity;

        const pubs = this._screenPubs.length
            ? [...this._screenPubs]
            : Array.from(this.room.localParticipant.trackPublications.values()).filter(pub => {
                const s = pub?.source;
                return s === LivekitClient.Track.Source.ScreenShare || s === LivekitClient.Track.Source.ScreenShareAudio || s === "screen";
            });

        for (const pub of pubs) {
            const track = pub?.track;
            if (track) {
                try { track.mediaStreamTrack?.stop?.(); } catch(e) {}
                try { track.stop?.(); } catch(e) {}
                try { this._cleanupDetachedEls(track.detach()); } catch(e) {}
            }

            try { await this.room.localParticipant.unpublishTrack(pub.trackSid); } catch(e) {}
            try { if (track) await this.room.localParticipant.unpublishTrack(track); } catch(e) {}
        }

        for (const t of this._screenTracks) {
            try { t.mediaStreamTrack?.stop?.(); } catch(e) {}
            try { t.stop?.(); } catch(e) {}
            try { this._cleanupDetachedEls(t.detach()); } catch(e) {}
            try { await this.room.localParticipant.unpublishTrack(t); } catch(e) {}
        }

        this._screenPubs = [];
        this._screenTracks = [];
        this.isScreensharing = false;
        this._lastCtxOk = null;

        if (this.onScreenshareEnd) this.onScreenshareEnd(participantId);
    }

    async shareScreen(includeAudio = false) {
        if (!this.room?.localParticipant) return;

        const participantId = this.room.localParticipant.identity;

        // disable cams just in case
        await this.stopCamera().catch(() => {});
        await this.stopScreenshare().catch(() => {});

        // that shit creates the screenshare track
        let tracks = await this.room.localParticipant.createScreenTracks({
            audio: includeAudio ? {
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: false,
                voiceIsolation: false
            } : false,
            video: {
                resolution: this.streamSettings.resolution,
                frameRate: this.streamSettings.frameRate,
                maxBitrate: this.streamSettings.maxBitrate,
                codec: "h264"
            }
        });

        this._screenTracks = tracks;

        // then we pub the tracks individually
        // amazingly the audioPreset thing turns out to work very well
        for (const track of tracks) {
            let pub;
            try {
                if (track.kind === "video") {
                    pub = await this.room.localParticipant.publishTrack(track, {
                        source: LivekitClient.Track.Source.ScreenShare,
                        audioPreset: LivekitClient.AudioPresets.musicHighQuality
                    });
                } else if (track.kind === "audio") {
                    pub = await this.room.localParticipant.publishTrack(track, {
                        source: LivekitClient.Track.Source.ScreenShareAudio,
                        audioPreset: LivekitClient.AudioPresets.musicHighQuality,
                        dtx: false
                    });
                } else { // fallback
                    pub = await this.room.localParticipant.publishTrack(track);
                }
            } catch (e) { // yet another fallback
                pub = await this.room.localParticipant.publishTrack(track);
            }

            if (pub) this._screenPubs.push(pub);
            try { this._cleanupDetachedEls(track.detach()); } catch(e) {}

            // callbacks
            if (this.onScreenshareBegin) this.onScreenshareBegin(participantId, track);
            if (this.onTrackSubscribed && track.kind === "video") this.onTrackSubscribed(track, participantId, true);

            track.on("ended", () => {
                this.stopScreenshare().catch(() => {});
            });
        }

        this.isScreensharing = true;
    }

    configureUrls() {
        if (!this.APPLICATION_SERVER_URL) this.APPLICATION_SERVER_URL = window.location.origin;
        if (!this.LIVEKIT_URL) throw new TypeError("No LiveKit URL set.");
    }

    _lp() {
        return this.room?.localParticipant || null;
    }

    _micEnabled() {
        const lp = this._lp();
        if (!lp) return false;
        return !!lp.isMicrophoneEnabled;
    }

    _readMicBoolSetting(cookieName, fallback = true) {
        const rawValue = CookieManager.getCookie(cookieName);
        if (rawValue == null || rawValue === "") return fallback;
        return CookieManager.parseBool(rawValue);
    }

    _getMicSettings() {
        const deviceId = CookieManager.getCookie("settings.vc.mic.deviceId") || null;

        return {
            deviceId,
            echoCancellation: this._readMicBoolSetting("settings.vc.mic.echoCancellation", true),
            noiseSuppression: this._readMicBoolSetting("settings.vc.mic.noiseSuppression", true),
        };
    }

    _buildMicCaptureOptions(settings = this._getMicSettings()) {
        const options = {
            echoCancellation: settings.echoCancellation,
            noiseSuppression: settings.noiseSuppression,
            autoGainControl: false,
            channelCount: 1,
            sampleRate: 48000,
        };

        if (settings.deviceId) options.deviceId = { exact: settings.deviceId };

        return options;
    }

    _syncRoomMicDefaults(settings = this._getMicSettings()) {
        if (!this.room?.options) return;

        this.room.options.audioCaptureDefaults = {
            ...this._buildMicCaptureOptions(settings),
            voiceIsolation: settings.noiseSuppression,
        };
    }

    _getMicPrimeKey(settings = this._getMicSettings()) {
        return JSON.stringify({
            deviceId: settings.deviceId || "",
            echoCancellation: !!settings.echoCancellation,
            noiseSuppression: !!settings.noiseSuppression,
        });
    }

    async _primeMicrophone(settings = this._getMicSettings(), force = false) {
        if (!navigator?.mediaDevices?.getUserMedia) return;

        const primeKey = this._getMicPrimeKey(settings);
        if (!force && this._primedMicKey === primeKey) return;

        // Priming the input once here makes PipeWire expose the mic node
        // before LiveKit tries to publish it inside the desktop client.
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: this._buildMicCaptureOptions(settings),
            video: false,
        });

        try {
            stream.getTracks().forEach(track => track.stop());
        } finally {
            this._primedMicKey = primeKey;
        }
    }

    async _applyMicDevice(settings = this._getMicSettings()) {
        this._syncRoomMicDefaults(settings);

        if (!this.room?.localParticipant) return;

        if (settings.deviceId && typeof this.room.switchActiveDevice === "function") {
            await this.room.switchActiveDevice("audioinput", settings.deviceId);
        }
    }

    async _enableMicrophone({ forcePrime = false } = {}) {
        if (!this.room?.localParticipant) return null;

        const settings = this._getMicSettings();

        await this._primeMicrophone(settings, forcePrime);
        await this._applyMicDevice(settings);

        this._micPub = await this.room.localParticipant.setMicrophoneEnabled(true, {
            ...this._buildMicCaptureOptions(settings),
            voiceIsolation: settings.noiseSuppression,
        });

        return this._micPub;
    }

    async _handleMicSettingsChange() {
        const settings = this._getMicSettings();

        this._primedMicKey = null;
        this._syncRoomMicDefaults(settings);

        if (!this.room?.localParticipant) return;

        if (!this._micEnabled()) {
            await this._applyMicDevice(settings);
            return;
        }

        await this._primeMicrophone(settings, true);
        await this._applyMicDevice(settings);
        this._micPub = await this.room.localParticipant.setMicrophoneEnabled(true, {
            ...this._buildMicCaptureOptions(settings),
            voiceIsolation: settings.noiseSuppression,
        });
    }

    async joinRoom(roomName, userName, memberId, channelId) {
        const micSettings = this._getMicSettings();

        this.room = new LivekitClient.Room({
            publishDefaults: {
                audioPreset: LivekitClient.AudioPresets.musicHighQuality
            },
            audioCaptureDefaults: {
                ...this._buildMicCaptureOptions(micSettings),
                voiceIsolation: micSettings.noiseSuppression,
            }
        });


        this.room.on(LivekitClient.RoomEvent.TrackSubscribed, (track, publication, participant) => {
            const src = publication?.source ?? track?.source;

            // check if its a screenshare.
            // should maybe turn that into a function at some point
            const isScreen =
                src === LivekitClient.Track.Source.ScreenShare ||
                src === LivekitClient.Track.Source.ScreenShareAudio ||
                src === "screen";

            this.storeTrack(participant.identity, track, isScreen);

            if (track.kind === "audio") {
                this.attachAudioTrack(track, participant.identity, isScreen);
            }

            // callbacks
            if (isScreen && this.onScreenshareBegin) this.onScreenshareBegin(participant.identity, track);
            if (this.onTrackSubscribed) this.onTrackSubscribed(track, participant.identity, isScreen);
        });


        this.room.on(LivekitClient.RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
            const src = publication?.source ?? track?.source;
            const isScreen =
                src === LivekitClient.Track.Source.ScreenShare ||
                src === LivekitClient.Track.Source.ScreenShareAudio ||
                src === "screen";

            const pid = participant.identity;
            this.removeTrack(pid, track, isScreen);

            if (isScreen && this.onScreenshareEnd) this.onScreenshareEnd(pid);

            // do camera callback
            if (track.kind === "video" && !isScreen && this.onCameraEnd) this.onCameraEnd(pid);

            try { this.detachAudio(pid, isScreen); } catch (e) {}
            if (isScreen) this._volumes.delete(`${pid}:screen`);
        });

        this.room.on(LivekitClient.RoomEvent.ActiveSpeakersChanged, (speakers) => {
            speakers.forEach(participant => {
                const id = participant.identity;
                if (this.onSpeaking) this.onSpeaking(id);
            });
        });

        this.room.on(LivekitClient.RoomEvent.ParticipantDisconnected, (participant) => {
            if (this.onLeave) this.onLeave(participant.identity);
        });

        try {
            const token = await this.getToken(roomName, userName, memberId, channelId);
            await this.room.connect(this.LIVEKIT_URL, token);

            await this._enableMicrophone({ forcePrime: true });

            if (this.onJoin) this.onJoin(userName);
        } catch (e) {
            console.error("Error joining room:", e);
        }
    }

    async startCamera(constraints = {}) {
        if (!this.room?.localParticipant) return;

        // also just in case disable screenshares
        await this.stopScreenshare().catch(() => {});
        await this.stopCamera().catch(() => {});

        this._camPub = await this.room.localParticipant.setCameraEnabled(true, {
            resolution: { width: 1280, height: 720 },
            frameRate: 30,
            ...constraints
        });

        const participantId = this.room.localParticipant.identity;

        // some fucking trickery
        let track = this._camPub?.track;
        if (!track) {
            for (const [, pub] of this.room.localParticipant.trackPublications) {
                if (pub.source === LivekitClient.Track.Source.Camera && pub.track) {
                    track = pub.track;
                    break;
                }
            }
        }

        if (track) {
            this.storeTrack(participantId, track, false);
            if (this.onTrackSubscribed) this.onTrackSubscribed(track, participantId, false);
        }
    }

    async stopCamera() {
        if (!this.room?.localParticipant) return;

        const participantId = this.room.localParticipant.identity;

        const p = this.participants.get(participantId);
        const videoTrack = p?.videoTrack;

        await this.room.localParticipant.setCameraEnabled(false).catch(() => {});
        this._camPub = null;

        if (videoTrack) {
            try { this._cleanupDetachedEls(videoTrack.detach()); } catch(e) {}
        }

        this.removeTrack(participantId, { kind: "video" }, false);
        if (this.onCameraEnd) this.onCameraEnd(participantId);
    }
    isCameraEnabled() {
        const lp = this._lp();
        if (!lp) return false;
        return !!lp.isCameraEnabled;
    }

    async toggleCamera(constraints = {}) {
        if (!this.room?.localParticipant) return;

        if (this.isCameraEnabled()) {
            await this.stopCamera();
        } else {
            await this.startCamera(constraints);
        }

        return this.isCameraEnabled();
    }

    reattachAllAudio() {
        document.querySelectorAll("audio[id^='audio-global-']").forEach(audioElement => {
            const memberId = audioElement.getAttribute("data-member-id");
            const isScreen = memberId.includes("-screen");
            if (memberId) {
                try { this.detachAudio(memberId, isScreen); } catch (e) {}
            }
            audioElement.srcObject = null;
            audioElement.remove();
        });

        if (!this.participants) return;

        this.participants.forEach((participant, memberId) => {
            if (!memberId) return;

            if (participant.audioTrack?.mediaStreamTrack) {
                this.attachAudioTrack(participant.audioTrack, memberId, false);
            }

            if (participant.screenAudioTrack?.mediaStreamTrack) {
                this.attachAudioTrack(participant.screenAudioTrack, memberId, true);
            }
        });
    }

    storeTrack(participantId, track, isScreen = false) {
        if (!this.participants.has(participantId)) this.participants.set(participantId, {});
        const participant = this.participants.get(participantId);

        if (track.kind === "audio" && isScreen) participant.screenAudioTrack = track;
        else if (track.kind === "audio") participant.audioTrack = track;
        else if (track.kind === "video" && isScreen) participant.screenTrack = track;
        else if (track.kind === "video") participant.videoTrack = track;
    }

    removeTrack(participantId, track, isScreen = false) {
        if (!this.participants.has(participantId)) return;
        const participant = this.participants.get(participantId);

        if (track.kind === "audio" && isScreen) participant.screenAudioTrack = null;
        else if (track.kind === "audio") participant.audioTrack = null;
        else if (track.kind === "video" && isScreen) participant.screenTrack = null;
        else if (track.kind === "video") participant.videoTrack = null;
    }

    pauseStream(participantId, type = "video") {
        const participant = this.participants.get(participantId);
        if (!participant) return;

        let track;
        if (type === "video") track = participant.videoTrack;
        else if (type === "audio") track = participant.audioTrack;
        else if (type === "screen") track = participant.screenTrack;

        if (track) track.detach().forEach(el => el.pause());
    }

    resumeStream(participantId, type = "video") {
        const participant = this.participants.get(participantId);
        if (!participant) return;

        let track;
        if (type === "video") track = participant.videoTrack;
        else if (type === "audio") track = participant.audioTrack;
        else if (type === "screen") track = participant.screenTrack;

        if (track) track.detach().forEach(el => el.play());
    }

    setStreamSettings({resolution, frameRate, maxBitrate}) {
        if (resolution) this.streamSettings.resolution = resolution;
        if (frameRate) this.streamSettings.frameRate = frameRate;
        if (maxBitrate) this.streamSettings.maxBitrate = maxBitrate;
    }

    _cleanupDetachedEls(detachedEls){
        // gettin rid of shit here
        (detachedEls || []).forEach(element => {
            if(!element) return;

            if(element.tagName === "VIDEO"){
                try { element.pause(); } catch(e) {}
                try { element.srcObject = null; } catch(e) {}
                element.style.display = "none";
                return;
            }

            if(element.tagName === "AUDIO"){
                const id = el.id || "";
                if(id.startsWith("audio-global-")){
                    element.remove();
                } else {
                    try { element.pause(); } catch(e) {}
                    try { element.srcObject = null; } catch(e) {}
                }
            }
        });
    }

    async hookVcAudio(memberId, isScreen, audioEl) {
        await this.ensureAudioCtx().catch(() => {});
        const ctxOk = this._audioCtx && this._audioCtx.state === "running";

        if (ctxOk) {
            audioEl.muted = true;
            audioEl.volume = 0;

            await this.attachAudioEl(memberId, isScreen, audioEl).catch(err => {
                console.error("Failed to attach audio to WebAudio:", err);
            });

            this.setVolume(memberId, isScreen, this.getVolume(memberId, isScreen));
        } else {
            const isSelf = memberId === UserManager.getID();
            audioEl.muted = isDeafened || isSelf;

            const p = this.getVolume(memberId, isScreen);
            audioEl.volume = Math.max(0, Math.min(1, (Number(p) || 100) / 100));
        }
    }

    async ensureVcAudioRouting() {
        await this.ensureAudioCtx().catch(() => {});
        const ctxOk = this._audioCtx && this._audioCtx.state === "running";

        if (this._lastCtxOk === ctxOk) return;
        this._lastCtxOk = ctxOk;

        document.querySelectorAll("audio[id^='audio-global-']").forEach(a => {
            const memberId = a.getAttribute("data-member-id");
            const isScreen = a.id.includes("-screen");
            if (!memberId) return;
            this.hookVcAudio(memberId, isScreen, a);
        });
    }

    async setVcVolume(memberId, isScreen, percent) {
        const p = Math.max(0, Math.min(400, Number(percent) || 0));
        this.setVolume(memberId, isScreen, p);

        if (isScreen) return;

        const audioId = `audio-global-${memberId}`;
        const audioElement = document.getElementById(audioId);
        if (!audioElement) return;

        await this.ensureAudioCtx().catch(() => {});
        const ctxOk = this._audioCtx && this._audioCtx.state === "running";

        if (!ctxOk) {
            audioElement.volume = Math.max(0, Math.min(1, p / 100));
            audioElement.muted = isDeafened || memberId === UserManager.getID();
        }
    }

    _audioKey(memberId, isScreen) {
        return `${memberId}:${isScreen ? "screen" : "user"}`;
    }

    async ensureAudioCtx() {
        if (!this._audioCtx) this._audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (this._audioCtx.state === "suspended") await this._audioCtx.resume().catch(()=>{});
    }

    setVolume(memberId, isScreen, percent) {
        const key = this._audioKey(memberId, isScreen);
        const p = Math.max(0, Math.min(400, Number(percent) || 0));
        this._volumes.set(key, p);

        const node = this._audioNodes.get(key);
        if (node?.gain) {
            node.gain.gain.value = p / 100;
            return;
        }

        if (isScreen) return;
    }

    async attachAudioEl(memberId, isScreen, audioEl) {
        await this.ensureAudioCtx();

        const key = this._audioKey(memberId, isScreen);

        const old = this._audioNodes.get(key);
        if (old?.gain) {
            try { old.gain.disconnect(); } catch(e) {}
        }

        // lets avoid empty streams, else kms
        let src = this._mediaElSources.get(audioEl);
        if (!src || src.context !== this._audioCtx) {
            try { src?.disconnect?.(); } catch(e) {}

            if (audioEl?.srcObject instanceof MediaStream) {
                if (!audioEl.srcObject.getAudioTracks().length) return;
                src = this._audioCtx.createMediaStreamSource(audioEl.srcObject);
            } else {
                src = this._audioCtx.createMediaElementSource(audioEl);
            }

            this._mediaElSources.set(audioEl, src);
        }

        const gain = this._audioCtx.createGain();
        const p = this._volumes.get(key);
        gain.gain.value = (p == null ? 100 : p) / 100;

        src.connect(gain);
        gain.connect(this._audioCtx.destination);

        this._audioNodes.set(key, { src, gain, el: audioEl });
    }

    detachAudio(memberId, isScreen) {
        const key = this._audioKey(memberId, isScreen);
        const node = this._audioNodes.get(key);
        if (!node) return;

        try { node.gain.disconnect(); } catch(e) {}
        try { node.src?.disconnect?.(); } catch(e) {}

        this._audioNodes.delete(key);
        this._volumes.delete(key);
    }

    getVolume(memberId, isScreen) {
        const key = this._audioKey(memberId, isScreen);
        return this._volumes.get(key) ?? 100;
    }


    async getToken(roomName, participantName, memberId, channelId) {
        const response = await fetch(this.APPLICATION_SERVER_URL + "/token", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({roomName, participantName, memberId, channelId}),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Failed to get token: ${error.errorMessage}`);
        }

        const token = await response.json();
        return token.token;
    }

    async muteMic() {
        if (!this.room?.localParticipant) return;
        await this.room.localParticipant.setMicrophoneEnabled(false).catch(()=>{});
    }

    async unmuteMic() {
        if (!this.room?.localParticipant) return;
        await this._enableMicrophone().catch(()=>{});
    }


    isMuted() {
        return !this._micEnabled();
    }

    async toggleMic() {
        if (!this.room?.localParticipant) return;
        const nextEnabled = this.isMuted();
        if (nextEnabled) await this._enableMicrophone();
        else await this.room.localParticipant.setMicrophoneEnabled(false);
        return nextEnabled;
    }

    async leaveRoom() {
        if (this.room?.localParticipant) {
            if (this.onLeave) this.onLeave(this.room.localParticipant.identity);
            await this.room.disconnect();
        }
    }
}
