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
        this.onSpeaking = null;
        this.isScreensharing = false;

        this._micPub = null;

        this._screenPubs = [];
        this._screenTracks = [];

        this.configureUrls();

        this._audioCtx = null;
        this._audioNodes = new Map();
        this._mediaElSources = new WeakMap();
        this._volumes = new Map();
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

        if (this.onScreenshareEnd) this.onScreenshareEnd(participantId);
    }

    async shareScreen(includeAudio = false) {
        if (!this.room?.localParticipant) return;

        const participantId = this.room.localParticipant.identity;

        await this.stopScreenshare().catch(()=>{});

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
                        audioPreset: LivekitClient.AudioPresets.musicHighQuality
                    });
                } else {
                    pub = await this.room.localParticipant.publishTrack(track);
                }
            } catch (e) {
                pub = await this.room.localParticipant.publishTrack(track);
            }


            if (pub) this._screenPubs.push(pub);

            try { this._cleanupDetachedEls(track.detach()); } catch(e) {}

            if (this.onScreenshareBegin) this.onScreenshareBegin(participantId, track);
            if (this.onTrackSubscribed && track.kind === "video") this.onTrackSubscribed(track, participantId, true);

            track.on("ended", () => {
                this.stopScreenshare().catch(()=>{});
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

    async joinRoom(roomName, userName, memberId, channelId) {
        this.room = new LivekitClient.Room({
            publishDefaults: {
                audioPreset: LivekitClient.AudioPresets.musicHighQuality
            },
            audioCaptureDefaults: {
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: false,
                sampleRate: 48000,
                voiceIsolation: false,
            }
        });

        this.room.on(LivekitClient.RoomEvent.TrackSubscribed, (track, publication, participant) => {
            const src = publication?.source ?? track?.source;
            const isScreen =
                src === LivekitClient.Track.Source.ScreenShare ||
                src === LivekitClient.Track.Source.ScreenShareAudio ||
                src === "screen";

            this.storeTrack(participant.identity, track, isScreen);

            if (isScreen && this.onScreenshareBegin) this.onScreenshareBegin(participant.identity, track);
            if (this.onTrackSubscribed) this.onTrackSubscribed(track, participant.identity, isScreen);
        });

        this.room.on(LivekitClient.RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
            const src = publication?.source ?? track?.source;
            const isScreen =
                src === LivekitClient.Track.Source.ScreenShare ||
                src === LivekitClient.Track.Source.ScreenShareAudio ||
                src === "screen";

            this.removeTrack(participant.identity, track, isScreen);

            if (isScreen && this.onScreenshareEnd) this.onScreenshareEnd(participant.identity);
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

            this._micPub = await this.room.localParticipant.setMicrophoneEnabled(true, {
                echoCancellation: true,
                noiseSuppression: true,
                voiceIsolation: true,
                autoGainControl: false
            });

            if (this.onJoin) this.onJoin(userName);
        } catch (e) {
            console.error("Error joining room:", e);
        }
    }

    storeTrack(participantId, track, isScreen = false) {
        if (!this.participants.has(participantId)) this.participants.set(participantId, {});
        const participant = this.participants.get(participantId);

        if (track.kind === "audio") participant.audioTrack = track;
        else if (track.kind === "video" && !isScreen) participant.videoTrack = track;
        else if (track.kind === "video" && isScreen) participant.screenTrack = track;
    }

    removeTrack(participantId, track, isScreen = false) {
        if (!this.participants.has(participantId)) return;
        const participant = this.participants.get(participantId);

        if (track.kind === "audio") participant.audioTrack = null;
        else if (track.kind === "video" && !isScreen) participant.videoTrack = null;
        else if (track.kind === "video" && isScreen) participant.screenTrack = null;
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
        (detachedEls || []).forEach(el => {
            if(!el) return;

            if(el.tagName === "VIDEO"){
                try { el.pause(); } catch(e) {}
                try { el.srcObject = null; } catch(e) {}
                el.style.display = "none";
                return;
            }

            if(el.tagName === "AUDIO"){
                const id = el.id || "";
                if(id.startsWith("audio-global-")){
                    el.remove();
                } else {
                    try { el.pause(); } catch(e) {}
                    try { el.srcObject = null; } catch(e) {}
                }
            }
        });
    }

    _audioKey(mid, isScreen) {
        return `${mid}:${isScreen ? "screen" : "user"}`;
    }

    async ensureAudioCtx() {
        if (!this._audioCtx) this._audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (this._audioCtx.state === "suspended") await this._audioCtx.resume().catch(()=>{});
    }

    setVolume(mid, isScreen, percent) {
        const key = this._audioKey(mid, isScreen);
        const p = Math.max(0, Math.min(400, Number(percent) || 0));
        this._volumes.set(key, p);

        const node = this._audioNodes.get(key);
        if (node?.gain) node.gain.gain.value = p / 100;
    }

    async attachAudioEl(mid, isScreen, audioEl) {
        await this.ensureAudioCtx();

        const key = this._audioKey(mid, isScreen);

        const old = this._audioNodes.get(key);
        if (old?.gain) {
            try { old.gain.disconnect(); } catch(e) {}
        }

        let src = this._mediaElSources.get(audioEl);
        if (!src || src.context !== this._audioCtx) {
            try { src?.disconnect?.(); } catch(e) {}

            if (audioEl?.srcObject instanceof MediaStream) {
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


    detachAudio(mid, isScreen) {
        const key = this._audioKey(mid, isScreen);
        const node = this._audioNodes.get(key);
        if (!node) return;
        try { node.gain.disconnect(); } catch(e) {}
        try { node.src?.disconnect?.(); } catch(e) {}
        this._audioNodes.delete(key);
    }


    getVolume(mid, isScreen) {
        const key = this._audioKey(mid, isScreen);
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
        await this.room.localParticipant.setMicrophoneEnabled(true, {
            echoCancellation: true,
            noiseSuppression: true,
            voiceIsolation: true,
            autoGainControl: false
        }).catch(()=>{});
    }


    isMuted() {
        return !this._micEnabled();
    }

    async toggleMic() {
        if (!this.room?.localParticipant) return;
        const nextEnabled = this.isMuted();
        await this.room.localParticipant.setMicrophoneEnabled(nextEnabled, {
            echoCancellation: true,
            noiseSuppression: true,
            voiceIsolation: true,
            autoGainControl: false
        });
        return nextEnabled;
    }

    async leaveRoom() {
        if (this.room?.localParticipant) {
            if (this.onLeave) this.onLeave(this.room.localParticipant.identity);
            await this.room.disconnect();
        }
    }
}
