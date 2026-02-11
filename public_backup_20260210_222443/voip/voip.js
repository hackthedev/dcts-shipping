// voip.js
class Voip {
    constructor({socket, socketUrl, rtcConfig, ioOptions} = {}) {

        if (socket) {
            this.socket = socket;
        } else {
            if (typeof io !== "function") throw new Error("socket.io client missing");
            this.socket = io(socketUrl || location.origin, {
                transports: ["websocket"],
                ...(ioOptions || {}),
            });
        }

        this.selfId = this.socket.id || null;
        this.socket.on("connect", () => {
            this.selfId = this.socket.id;
            console.log("[SOCK] connected", this.selfId);
        });
        this.socket.on("connect_error", (e) =>
            console.log("[SOCK] connect_error", e.message)
        );

        // --- ICE/RTC Config ---
        this.rtcConfig = {
            iceServers: [
                {
                    urls: "stun:stun.l.google.com:19302"
                }
            ],
            iceTransportPolicy: "all",
            iceCandidatePoolSize: 2,
            bundlePolicy: "max-bundle",
        };

        // VAD Hooks
        this.onTalking = null;
        this.onTalkingStart = null;
        this.onTalkingEnd = null;

        // VAD
        this._audioCtx = null;
        this._vad = {
            enabled: false,
            opts: null,
            analyzers: new Map(),
            states: new Map(),
            timer: null,
        };

        this.room = null;
        this.peers = new Map();


        this._sendersByTag = {
            mic: new Map(),    // RTCRtpSender (Mic)
            screen: new Map(), // RTCRtpSender (Screenshare-Video)
        };

        this.localMicTrack = null;
        this.localScreenTrack = null;
        this.localScreenAudioTrack = null;

        // Mix-Object (WebAudio)
        this._mix = null; // { dest, mixedTrack, micSrc?, scrSrc?, micGain, scrGain }

        // Remote-Tracking
        this._remoteScreenStreamIds = new Map();
        this._pendingAudio = new Map();

        // Hooks
        this.onTrack = null;
        this.onPeerLeft = null;
        this.onScreenFrame = null;

        this.roster = new Map();

        // Socket Events
        this.socket.on("peers", ({peers}) => {
            //console.log("[SOCK] peers", peers);
            (peers || []).forEach((p) => {
                if (p && typeof p === "object" && p.member) {
                    this.roster.set(p.id, p.member);
                }
            });
            const ids = (peers || []).map((p) => (typeof p === "string" ? p : p.id));
            this._handlePeers(ids);
        });

        this.socket.on("peer-joined", ({id, member}) => {
            //console.log("[SOCK] peer-joined", id, member);
            if (member) this.roster.set(id, member);
            this._onPeerJoined(id);
        });

        this.socket.on("peer-left", ({id}) => {
            //console.log("[SOCK] peer-left", id);
            this._onPeerLeft(id);
        });

        this.socket.on("signal", (p) => {
            //console.log("[SOCK] signal from", p.from || "(srv)");
            this._onSignal(p);
        });
    }

    _getKindForTag(tag) {
        return tag === "screen" ? "video" : "audio";
    }

    _icePromise = null;

    async _ensureIce() {
        if (!this._icePromise) {
            this._icePromise = fetch(`/ice?u=${encodeURIComponent(UserManager.getID())}`, {credentials: "include"})
                .then(r => r.json())
                .then(({iceServers}) => {
                    if (Array.isArray(iceServers) && iceServers.length) {
                        this.rtcConfig.iceServers = [
                            {urls: "stun:stun.l.google.com:19302"},
                            ...iceServers
                        ];
                    }
                })
                .catch(() => {
                }); // STUN-only fallback
        }
        return this._icePromise;
    }


    async _ensureSenderFor(pc, tag) {
        const map = this._sendersByTag[tag];
        if (map.has(pc)) {

            const sender = map.get(pc);
            const tx = pc.getTransceivers?.().find(t => t.sender === sender);
            try {
                if (tx && tx.direction !== "sendonly") tx.direction = "sendonly";
            } catch {
            }
            return sender;
        }

        const kind = this._getKindForTag(tag);

        const existing = pc.getTransceivers?.().find(t =>
            t.sender && t.sender.track?.kind === kind || (!t.sender.track && t.receiver.track?.kind === kind)
        ) || pc.getTransceivers?.().find(t => t.sender && t.mid && t.sender.track == null && kind === "audio" && tag !== "screen"); // robust, optional

        let tx;
        if (existing) {
            tx = existing;
            try {
                tx.direction = "sendonly";
            } catch {
            }
        } else {

            try {
                tx = pc.addTransceiver(kind, {direction: "sendonly"});
            } catch {
                tx = pc.addTransceiver(kind);
                try {
                    tx.direction = "sendonly";
                } catch {
                }
            }
        }

        const sender = tx.sender;
        map.set(pc, sender);
        return sender;
    }


    async _addOrReplaceTaggedTrack(track, tag) {
        for (const [, st] of this.peers) {
            const pc = st.pc;
            const sender = await this._ensureSenderFor(pc, tag);
            try {
                await sender.replaceTrack(track);
            } catch {
            }
        }
    }

    async _clearTag(tag) {
        const map = this._sendersByTag[tag];
        for (const [, st] of this.peers) {
            const pc = st.pc;
            const sender = map.get(pc);
            if (!sender) continue;

            try {
                await sender.replaceTrack(null);
            } catch {
            }

            const tx = pc.getTransceivers?.().find(t => t.sender === sender);
            try {
                if (tx) tx.direction = "inactive";
            } catch {
            }
        }
    }


    // VAD
    enableVAD(opts = {}) {
        if (this._vad.enabled) return;
        const defaults = {
            thresholdDb: -70,
            minSpeakMs: 50,
            minSilenceMs: 250,
            intervalMs: 80,
            smooth: 0.7,
        };
        this._vad.opts = {...defaults, ...opts};
        this._vad.enabled = true;

        const ctx = this._ensureAudioCtx();
        ctx.resume?.().catch(() => {
        });

        if (this.localMicTrack)
            this._attachVADForTrack("self", this.localMicTrack, "mic");


        this._vad.timer = setInterval(
            () => this._pollVAD(),
            this._vad.opts.intervalMs
        );
    }

    disableVAD() {
        if (!this._vad.enabled) return;
        this._vad.enabled = false;
        clearInterval(this._vad.timer);
        this._vad.timer = null;
        for (const [, obj] of this._vad.analyzers) {
            try {
                obj.src.disconnect();
            } catch {
            }
        }
        this._vad.analyzers.clear();
        this._vad.states.clear();
    }

    getSelfId() {
        if (this.socket?.id) return Promise.resolve(this.socket.id);
        return new Promise((res) =>
            this.socket.once("connect", () => res(this.socket.id))
        );
    }


    async _getCleanMicTrack(deviceId) {
        const base = {
            echoCancellation: CookieManager.getCookie("settings.vc.mic.echoCancellation") || true,
            noiseSuppression: CookieManager.getCookie("settings.vc.mic.noiseSuppression") || true,
            autoGainControl: false,
            // Safari
            voiceIsolation: true,

            channelCount: 1,
            sampleRate: 48000,
            sampleSize: 16,
            latency: 0
        };

        const audio = deviceId
            ? {...base, deviceId: {exact: deviceId}}
            : {...base};


        const stream = await navigator.mediaDevices.getUserMedia({audio, video: false});
        const track = stream.getAudioTracks()[0];
        if (!track) throw new Error("Kein Audio-Track");


        try {
            await track.applyConstraints({
                echoCancellation: CookieManager.getCookie("settings.vc.mic.echoCancellation") || true,
                noiseSuppression: CookieManager.getCookie("settings.vc.mic.noiseSuppression") || true,
                autoGainControl: false,
                channelCount: 1,
                sampleRate: 48000
            });
        } catch {
        }


        try {
            track.contentHint = "speech";
        } catch {
        }

        return track;
    }


    async joinRoom(roomName, id, token) {
        console.log("[VOIP BROWSER SECURE]", window.isSecureContext ? "YES" : "NO");

        try {
            if (!this.localMicTrack) {
                this.localMicTrack = await this._getCleanMicTrack();
                if (this._vad.enabled) {
                    this._attachVADForTrack("self", this.localMicTrack, "mic");
                }
            }
        } catch (e) {
            console.log("[gUM] fail:", e.name, e.message);
        }

        if (!roomName) throw new Error("roomName fehlt");
        this.room = roomName;
        this.socket.emit("join", {room: roomName, roomName, id, token});
    }


    leaveRoom() {

        try {
            if (this.room) {
                this.socket.emit("leave", {room: this.room, roomName: this.room});
            }
        } catch {
        }


        for (const [, st] of this.peers) {
            try {
                st.pc.close();
            } catch {
            }
            if (st && st._statsIv) {
                clearInterval(st._statsIv);
                st._statsIv = null;
            }
        }
        this.peers.clear();


        try {
            for (const m of Object.values(this._sendersByTag)) m.clear();
        } catch {
        }


        if (this.localMicTrack) {
            try {
                this.localMicTrack.stop();
            } catch {
            }
            this.localMicTrack = null;
        }
        this._stopScreenShare();
        this.disableVAD?.();

        try {
            for (const [, p] of Array.from(this._pendingAudio.entries())) clearTimeout(p.timer);
            this._pendingAudio.clear();
            this._remoteScreenStreamIds.clear();
        } catch {
        }

        this.room = null;
    }


    async listMics() {
        try {
            if (!this.localMicTrack) {
                try {
                    const s = await navigator.mediaDevices.getUserMedia({audio: true});
                    s.getTracks().forEach((t) => t.stop());
                } catch {
                }
            }
            const devs = await navigator.mediaDevices.enumerateDevices();
            return devs
                .filter((d) => d.kind === "audioinput")
                .map((d) => ({deviceId: d.deviceId, label: d.label || "Microphone"}));
        } catch {
            return [];
        }
    }

    async unlockAudio() {
        const ctx = this._ensureAudioCtx();
        if (ctx && ctx.state !== "running") {
            try {
                await ctx.resume();
            } catch {
            }
        }
    }

    async setMic(deviceId) {
        const newTrack = await this._getCleanMicTrack(deviceId);

        const old = this.localMicTrack;
        this.localMicTrack = newTrack;

        if (this._mix) {
            await this._rebuildMix();
        } else {
            await this._addOrReplaceTaggedTrack(this.localMicTrack, "mic");
            await this._tuneAudioSendersForTrack(this.localMicTrack, {
                maxBitrate: 128000,
                dtx: false
            });
            if (this._prioritizeAudioSenderForTrack) {
                await this._prioritizeAudioSenderForTrack(this.localMicTrack, {
                    maxBitrate: 128000,
                    dtx: false
                });
            }
        }

        if (old) try {
            old.stop();
        } catch {
        }

        if (this._vad.enabled) {
            this._attachVADForTrack("self", this.localMicTrack, "mic");
        }

        await this._renegotiateAll();
    }

    async setScreenQuality({maxWidth, maxHeight, fps, maxBitrate, scaleDown} = {}) {
        const v = this.localScreenTrack;
        if (!v) return;

        try {
            const cons = {};
            if (maxWidth) cons.width = {max: maxWidth};
            if (maxHeight) cons.height = {max: maxHeight};
            if (fps) cons.frameRate = {max: fps};
            if (Object.keys(cons).length) await v.applyConstraints(cons);
        } catch {
        }

        await this._tuneVideoSendersForTrack(v, {
            maxBitrate: maxBitrate ?? undefined,
            framerate: fps ?? undefined,
            scaleDown: scaleDown ?? undefined,
        });

        try {
            await this._renegotiateAll();
        } catch {
        }
    }

    async shareScreen({
                          audio = true,
                          onFrame = null,
                          frameType = "dataURL",
                          fps = 60,
                          maxWidth = 1920,
                          maxHeight = 1080,
                          maxBitrate = 900_000,
                          scaleDown = null,
                      } = {}) {
        if (!this.room) throw new Error("Erst joinRoom() aufrufen");

        const stream = await navigator.mediaDevices.getDisplayMedia({
            video: {
                width: {ideal: Math.min(maxWidth, 1920)},
                height: {ideal: Math.min(maxHeight, 1080)},
                frameRate: {ideal: Math.min(30, fps || 30), max: Math.min(30, fps || 30)},
            },
            audio,
        });
        this._screenStream = stream;

        const v = stream.getVideoTracks()[0];
        try {
            await v.applyConstraints({
                width: {max: maxWidth},
                height: {max: maxHeight},
                frameRate: {max: Math.min(30, fps || 30)},
            });
        } catch {
        }
        try {
            if (v) v.contentHint = "detail";
        } catch {
        }

        this.localScreenTrack = v;
        await this._addOrReplaceTaggedTrack(v, "screen");
        await this._preferScreenCodecs(v, ["video/AV1", "video/VP9", "video/VP8"]);

        this.localScreenAudioTrack = null;
        if (audio) {
            const a = stream.getAudioTracks()[0] || null;
            if (a) {
                try {
                    a.contentHint = "music";
                } catch {
                }
                try {
                    await a.applyConstraints({
                        echoCancellation: false,
                        noiseSuppression: false,
                        autoGainControl: false,
                        channelCount: 2,
                        sampleRate: 48000,
                    });
                } catch {
                }
                this.localScreenAudioTrack = a;
            }
        }

        await this._rebuildMix();
        await this._tuneVideoSendersForTrack(v, {
            maxBitrate,
            framerate: Math.min(30, fps || 30),
            scaleDown,
        });

        if (onFrame) this._startScreenCaptureLoop({onFrame, frameType, fps});

        v.addEventListener("ended", () => this._stopScreenShare());
        await this._renegotiateAll();
        return () => {
            this._stopScreenShare().catch(() => {
            });
        };
    }

    _ensureAudioCtx() {
        if (!this._audioCtx) {
            const AC = window.AudioContext || window.webkitAudioContext;
            this._audioCtx = new AC();
        }
        return this._audioCtx;
    }

    async _rebuildMix() {
        if (this._mix) {
            try {
                this._mix.mixedTrack.stop();
            } catch {
            }
            this._mix = null;
        }

        const ctx = this._ensureAudioCtx();

        if (!this.localScreenAudioTrack && this.localMicTrack) {
            await this._addOrReplaceTaggedTrack(this.localMicTrack, "mic");

            await this._tuneAudioSendersForTrack(this.localMicTrack, {
                maxBitrate: parseInt(CookieManager.getCookie("settings.vc.mic.bitrate")) || 192000,
                dtx: false
            });
            if (this._prioritizeAudioSenderForTrack) {
                await this._prioritizeAudioSenderForTrack(this.localMicTrack, {
                    maxBitrate: parseInt(CookieManager.getCookie("settings.vc.mic.bitrate")) || 192000,
                    dtx: false
                });
            }
            await this._renegotiateAll().catch(() => {
            });
            return;
        }

        if (!this.localMicTrack && !this.localScreenAudioTrack) {
            await this._addOrReplaceTaggedTrack(null, "mic");
            await this._renegotiateAll().catch(() => {
            });
            return;
        }

        const dest = ctx.createMediaStreamDestination();

        // input gain
        const micGain = ctx.createGain();
        micGain.gain.value = 1.0;
        const scrGain = ctx.createGain();
        scrGain.gain.value = 1.0;

        // limiter
        const comp = ctx.createDynamicsCompressor();
        comp.threshold.value = -10;
        comp.knee.value = 6;
        comp.ratio.value = 12;
        comp.attack.value = 0.001;
        comp.release.value = 0.06;


        // make up gain
        const makeup = ctx.createGain();
        makeup.gain.value = 1.25;

        // mix sources
        let micSrc = null, scrSrc = null;
        if (this.localMicTrack) {
            const ms = new MediaStream([this.localMicTrack]);
            micSrc = ctx.createMediaStreamSource(ms);
            micSrc.connect(micGain).connect(comp);
        }
        if (this.localScreenAudioTrack) {
            const ss = new MediaStream([this.localScreenAudioTrack]);
            scrSrc = ctx.createMediaStreamSource(ss);
            scrSrc.connect(scrGain).connect(comp);
        }

        comp.connect(makeup).connect(dest);

        const mixedTrack = dest.stream.getAudioTracks()[0];
        try {
            mixedTrack.contentHint = "music";
        } catch {
        }

        this._mix = {dest, mixedTrack, micSrc, scrSrc, micGain, scrGain};

        await this._addOrReplaceTaggedTrack(mixedTrack, "mic");
        await this._tuneAudioSendersForTrack(mixedTrack, {
            maxBitrate: parseInt(CookieManager.getCookie("settings.vc.mic.bitrate")) || 192000,
            dtx: false
        });
        if (this._prioritizeAudioSenderForTrack) {
            await this._prioritizeAudioSenderForTrack(mixedTrack, {
                maxBitrate: parseInt(CookieManager.getCookie("settings.vc.mic.bitrate")) || 192000,
                dtx: false
            });
        }

        await this._renegotiateAll().catch(() => {
        });
    }


    mungeOpusForReliableAudio(sdp, {
        stereo = true,
        maxAverageBitrate = 192000,
        cbr = 1,
        useinbandfec = 1,
        usedtx = 0,
        ptime = 20
    } = {}) {

        return sdp.replace(/(m=audio[\s\S]*?)(?=m=|$)/g, (mSection) => {

            const ptMatch = mSection.match(/a=rtpmap:(\d+)\s+opus\/48000\/2/i);
            if (!ptMatch) return mSection;
            const pt = ptMatch[1];

            const reFmtp = new RegExp(`a=fmtp:${pt} .*\r?\n`, 'i');
            const newParams = [
                `stereo=${stereo ? 1 : 0}`,
                `sprop-stereo=${stereo ? 1 : 0}`,
                `maxaveragebitrate=${maxAverageBitrate}`,
                `cbr=${cbr}`,
                `useinbandfec=${useinbandfec}`,
                `usedtx=${usedtx}`,
                `ptime=${ptime}`
            ].join(';');

            if (reFmtp.test(mSection)) {
                return mSection.replace(reFmtp, (line) => {
                    const hasParams = line.includes(' ');
                    const base = hasParams ? line.trim().replace(/\r?\n$/, '') : `a=fmtp:${pt}`;

                    return `a=fmtp:${pt} ${newParams}\r\n`;
                });
            } else {

                return mSection.replace(
                    new RegExp(`a=rtpmap:${pt}.*\r?\n`, 'i'),
                    (rtpmap) => `${rtpmap}a=fmtp:${pt} ${newParams}\r\n`
                );
            }
        });
    }


    async _stopScreenShare() {
        this._stopFrameLoop();

        if (this.localScreenTrack) {
            try {
                this.localScreenTrack.stop();
            } catch {
            }
            this.localScreenTrack = null;
        }
        if (this.localScreenAudioTrack) {
            try {
                this.localScreenAudioTrack.stop();
            } catch {
            }
            this.localScreenAudioTrack = null;
        }
        if (this._screenStream) {
            try {
                this._screenStream.getTracks().forEach((t) => t.stop());
            } catch {
            }
            this._screenStream = null;
        }

        // stop mix and use mic only
        if (this._mix) {
            try {
                this._mix.mixedTrack.stop();
            } catch {
            }
            this._mix = null;
        }
        if (this.localMicTrack) {
            await this._addOrReplaceTaggedTrack(this.localMicTrack, "mic");
        } else {
            await this._addOrReplaceTaggedTrack(null, "mic");
        }

        // empy video
        await this._clearTag("screen");

        this._renegotiateAll().catch(() => {
        });
    }

    async _tuneAudioSendersForTrack(track, {maxBitrate = 128000, dtx = false} = {}) {
        for (const [, st] of this.peers) {
            const pc = st.pc;
            const senders = pc.getSenders().filter((s) => s.track === track);
            for (const sender of senders) {
                try {
                    const p = sender.getParameters() || {};
                    p.encodings = p.encodings && p.encodings.length ? p.encodings : [{}];
                    if (maxBitrate) p.encodings[0].maxBitrate = Math.floor(maxBitrate);
                    if (typeof dtx === "boolean") p.encodings[0].dtx = false;
                    await sender.setParameters(p);
                } catch (e) {
                    console.warn("setParameters(audio) failed", e);
                }
            }
        }
    }

    isScreenSharing() {
        return !!this.localScreenTrack;
    }

    getLocalScreenStream() {
        return this._screenStream || null;
    }

    // internal signaling rtc
    async _handlePeers(ids) {
        for (const id of ids) await this._ensurePeer(id, true, true);
    }

    async _onPeerJoined(id) {
        await this._ensurePeer(id, false, true);
    }

    _onPeerLeft(id) {
        const st = this.peers.get(id);
        if (st) {
            try {
                st.pc.close();
            } catch {
            }
            this.peers.delete(id);

            // cleanup
            for (const map of Object.values(this._sendersByTag)) {
                map.delete(st.pc);
            }

            if (st._statsIv) {
                clearInterval(st._statsIv);
                st._statsIv = null;
            }
        }
        // disconnect VAD of peer
        this._updateVADForPeerLeave(id);
        this.onPeerLeft && this.onPeerLeft({id});

        // buffer for screens etc
        this._remoteScreenStreamIds.delete(id);
        for (const [sid, p] of Array.from(this._pendingAudio.entries())) {
            if (p.peerId === id) {
                clearTimeout(p.timer);
                this._pendingAudio.delete(sid);
            }
        }
    }

    async _ensurePeer(id, polite, isCaller) {
        // get ICE
        if (this.peers.has(id)) return this.peers.get(id);
        await this._ensureIce();

        const pc = new RTCPeerConnection(this.rtcConfig);


        // always receive
        try {
            pc.addTransceiver("audio", {direction: "recvonly"});
        } catch {
        }
        try {
            pc.addTransceiver("video", {direction: "recvonly"});
        } catch {
        }

        const state = {
            pc,
            polite,
            makingOffer: false,
            ignoreOffer: false,
            isSettingRemoteAnswerPending: false,
            pendingCandidates: []
        };
        this.peers.set(id, state);
        //console.log("[RTC ] create PC for", id);

        pc.addEventListener("icecandidateerror", (ev) =>
            console.log(`[ICE✖][${id}]`, ev.errorCode, ev.errorText)
        );

        pc.onicecandidate = (e) => {
            if (e.candidate) {
                this._sendSignal(id, {candidate: e.candidate});
            } else {
                //console.log(`[ICE↗][${id}] cand: end`);
            }
        };

        pc.onconnectionstatechange = () => {
            const s = pc.connectionState;
            if (s === "closed" || s === "failed") {
                const st = this.peers.get(id);
                if (st && st._statsIv) {
                    clearInterval(st._statsIv);
                    st._statsIv = null;
                }
            }
        };

        pc.oniceconnectionstatechange = () => {
            const s = pc.iceConnectionState;
            if (s === "closed" || s === "failed") {
                const st = this.peers.get(id);
                if (st && st._statsIv) {
                    clearInterval(st._statsIv);
                    st._statsIv = null;
                }
            }
        };


        // handle tracks
        if (this._mix?.mixedTrack) {
            await this._addOrReplaceTaggedTrack(this._mix.mixedTrack, "mic");
        } else if (this.localMicTrack) {
            await this._addOrReplaceTaggedTrack(this.localMicTrack, "mic");
        }
        if (this.localScreenTrack) {
            await this._addOrReplaceTaggedTrack(this.localScreenTrack, "screen");
        }

        pc.ontrack = (ev) => {
            const stream = ev.streams[0] || new MediaStream([ev.track]);
            const kind = ev.track.kind;

            const emit = (isScreenFinal) => {
                try {
                    if (kind === "video") ev.track.contentHint = "detail";
                    if (kind === "audio") ev.track.contentHint = isScreenFinal ? "music" : "speech";
                } catch {
                }
                if (kind === "audio" && !isScreenFinal) {
                    // VAD vor mic
                    this._attachVADForTrack(id, ev.track, "mic");
                }
                this.onTrack && this.onTrack({id, stream, kind, isScreen: isScreenFinal});
            };

            // VIDEO: use as screen
            if (kind === "video") {
                let set = this._remoteScreenStreamIds.get(id);
                if (!set) {
                    set = new Set();
                    this._remoteScreenStreamIds.set(id, set);
                }
                set.add(stream.id);
                emit(true);
                // evtl. gepuffertes Audio freigeben (nur relevant, falls man klassifizieren würde)
                const pending = this._pendingAudio.get(stream.id);
                if (pending) {
                    clearTimeout(pending.timer);
                    this._pendingAudio.delete(stream.id);
                    pending.flushAsScreen?.();
                }
                return;
            }

            // AUDIO: use as mic
            if (kind === "audio") {
                emit(false);
            }
        };

        pc.onnegotiationneeded = async () => {
            try {
                state.makingOffer = true;
                const offer = await pc.createOffer();
                const munged = {
                    type: offer.type,
                    sdp: this.mungeOpusForReliableAudio(offer.sdp, {
                        stereo: true,
                        maxAverageBitrate: parseInt(CookieManager.getCookie("settings.vc.mic.bitrate")) || 192000,
                        cbr: 1,
                        useinbandfec: 1,
                        usedtx: 0,
                        ptime: 20
                    })
                };
                await pc.setLocalDescription(munged);
                this._sendSignal(id, {description: pc.localDescription});


                console.log(`[NEGO ][${id}] sent`, pc.localDescription?.type);
            } finally {
                state.makingOffer = false;
            }
        };

        if (isCaller) {
            setTimeout(async () => {
                try {
                    await pc.setLocalDescription();
                    this._sendSignal(id, {description: pc.localDescription});
                    //console.log(`[NEGO ][${id}] initial offer`);
                } catch (e) {
                    console.log(`[NEGO ][${id}] initial failed`, e);
                }
            }, 0);
        }

        // Stats optional
        state._statsIv = setInterval(() => this._logSelectedPair(pc, id), 2000);
        return state;
    }

    async _preferScreenCodecs(track, codecOrder = ["video/AV1", "video/VP9", "video/VP8"]) {
        if (!track) return;
        for (const [, st] of this.peers) {
            const pc = st.pc;
            const tx = pc.getTransceivers?.().find((t) => t.sender?.track === track);
            if (!tx || !tx.setCodecPreferences) continue;

            const caps = RTCRtpSender.getCapabilities("video");
            if (!caps?.codecs?.length) continue;

            const want = [];
            for (const mime of codecOrder) {
                const lower = mime.toLowerCase();
                want.push(...caps.codecs.filter((c) => c.mimeType?.toLowerCase() === lower));
            }
            const rest = caps.codecs.filter((c) => !want.includes(c));
            try {
                tx.setCodecPreferences([...want, ...rest]);
            } catch {
            }
        }
    }

    async _logSelectedPair(pc, id) {
        try {
            // Vorab: PC-Zustand prüfen – bei "closed/failed" sofort raus
            if (!pc) return;
            const cs = pc.connectionState;
            const ics = pc.iceConnectionState;
            if (cs === "closed" || cs === "failed" || ics === "closed" || ics === "failed") {
                const st = this.peers.get(id);
                if (st && st._statsIv) {
                    clearInterval(st._statsIv);
                    st._statsIv = null;
                }
                return;
            }

            const stats = await pc.getStats();
            let pair, local, remote;
            stats.forEach(r => {
                if (r.type === "candidate-pair" && r.selected) pair = r;
            });

            if (!pair) {
                return;
            }
            local = stats.get(pair.localCandidateId);
            remote = stats.get(pair.remoteCandidateId);

        } catch (e) {

            const msg = (e && (e.name || e.message)) ? (e.name + ": " + e.message) : String(e);
            if (msg.includes("no longer usable") || e?.name === "InvalidStateError") {
                const st = this.peers.get(id);
                if (st && st._statsIv) {
                    clearInterval(st._statsIv);
                    st._statsIv = null;
                }
                return;
            }

            console.log(`[PAIR][${id}] stats error`, e);
        }
    }


    async _onSignal({from, data}) {
        const st = await this._ensurePeer(from, true, false);
        const pc = st.pc;

        if (data.description) {
            const d = data.description;

            // Glare handling (perfect-negotiation pattern)
            const ready =
                !st.makingOffer &&
                (pc.signalingState === "stable" || st.isSettingRemoteAnswerPending);
            const offerCollision = d.type === "offer" && !ready;
            st.ignoreOffer = !st.polite && offerCollision;
            if (st.ignoreOffer) return;

            st.isSettingRemoteAnswerPending = d.type === "answer";
            try {
                await pc.setRemoteDescription(d);
            } catch (e) {
                // Remote SDP not acceptable (e.g. rolled back) → just bail
                return;
            } finally {
                if (d.type === "answer") st.isSettingRemoteAnswerPending = false;
            }

            // Drain any buffered ICE candidates now that we have an SDP
            while (st.pendingCandidates.length) {
                try {
                    await pc.addIceCandidate(st.pendingCandidates.shift());
                } catch (e) {
                    console.log("addIceCandidate (drain) failed", e);
                }
            }

            // If we received an offer, answer it
            if (d.type === "offer") {
                try {
                    const answer = await pc.createAnswer();
                    const munged = {
                        type: answer.type,
                        sdp: this.mungeOpusForReliableAudio(answer.sdp, {
                            stereo: true,
                            maxAverageBitrate: parseInt(CookieManager.getCookie("settings.vc.mic.bitrate")) || 192000,
                            cbr: 1,
                            useinbandfec: 1,
                            usedtx: 0,
                            ptime: 20
                        })
                    };
                    await pc.setLocalDescription(munged);
                    this._sendSignal(from, {description: pc.localDescription});
                } catch (e) {
                    console.log("setLocalDescription (answer) failed", e);
                }
                return;
            }

            return;
        }

        if (data.candidate) {
            const cand = data.candidate;
            if (pc.remoteDescription) {
                try {
                    await pc.addIceCandidate(cand);
                } catch (e) {
                    if (!st.ignoreOffer) console.log("addIceCandidate failed", e);
                }
            } else {
                // Buffer until remoteDescription is set
                st.pendingCandidates.push(cand);
            }
        }
    }

    toggleMicMute(element) {
        // falls es nichts zu muten gibt, abbrechen
        if (!this.localMicTrack && !(this._mix && this._mix.micGain)) return false;

        // aktuellen Status ermitteln
        const gainVal = this._mix?.micGain?.gain?.value;
        const mixMuted = typeof gainVal === "number" ? gainVal <= 0 : false;
        const trackMuted = this.localMicTrack ? this.localMicTrack.enabled === false : false;
        const currentlyMuted = mixMuted || trackMuted;

        const nextMuted = !currentlyMuted;

        // Track ein-/ausschalten
        try {
            if (this.localMicTrack) this.localMicTrack.enabled = !nextMuted;
        } catch {
        }

        // Nur den Mic-Anteil im Mix muten (Screenshare-Audio bleibt an)
        try {
            if (this._mix?.micGain) this._mix.micGain.gain.value = nextMuted ? 0 : 1;
        } catch {
        }

        // VAD sofort beruhigen, wenn gemutet, damit keine Talking-Indikatoren hängen bleiben
        try {
            if (nextMuted && this._vad?.enabled) {
                const key = "self:mic";
                const st = this._vad.states.get(key);
                if (st) {
                    st.speaking = false;
                    st.lastAbove = 0;
                    st.lastBelow = performance.now?.() || Date.now();
                    this.onTalkingEnd && this.onTalkingEnd(this.selfId || this.socket?.id || "self");
                    this._vad.states.set(key, st);
                }
            }
        } catch {
        }

        if(element){
            if (nextMuted) element.classList.add("muted")
            if (!nextMuted) element.classList.remove("muted")
        }

        // true = jetzt gemutet, false = jetzt ungemutet
        return nextMuted;
    };

    async _prioritizeAudioSenderForTrack(track, {
        maxBitrate = 192000, dtx = false
    } = {}) {
        if (!track) return;
        try {
            track.contentHint = "music";
        } catch {
        }

        for (const [, st] of this.peers) {
            const pc = st.pc;
            const sender = pc.getSenders().find(s => s.track === track);
            if (!sender) continue;

            try {
                const p = sender.getParameters() || {};
                p.encodings = p.encodings?.length ? p.encodings : [{}];
                p.encodings[0].maxBitrate = Math.floor(maxBitrate);
                p.encodings[0].dtx = false;
                // Manche Browser unterstützen das (harmlos, wenn ignoriert):
                try {
                    p.encodings[0].priority = "high";
                } catch {
                }
                await sender.setParameters(p);
            } catch (e) {
                console.warn("setParameters(prioritize audio) failed", e);
            }
        }
    }


    async _renegotiateAll() {
        for (const [id, st] of this.peers) {
            const pc = st.pc;
            try {
                const offer = await pc.createOffer();
                const munged = {
                    type: offer.type,
                    sdp: this.mungeOpusForReliableAudio(offer.sdp, {
                        stereo: true,
                        maxAverageBitrate: parseInt(CookieManager.getCookie("settings.vc.mic.bitrate")) || 192000,
                        cbr: 1,
                        useinbandfec: 1,
                        usedtx: 0,
                        ptime: 20
                    })
                };
                await pc.setLocalDescription(munged);
                this._sendSignal(id, {description: pc.localDescription});

            } catch {
            }
        }
    }

    async _tuneVideoSendersForTrack(
        track,
        {maxBitrate = 900_000, framerate = 30, scaleDown = 1.0, svc = false} = {}
    ) {
        if (!track) return;
        for (const [, st] of this.peers) {
            const pc = st.pc;
            const sender = pc.getSenders().find((s) => s.track === track);
            if (!sender) continue;
            try {
                const p = sender.getParameters() || {};
                p.degradationPreference = "balanced";
                p.encodings = [
                    {
                        maxBitrate,
                        maxFramerate: framerate,
                        scaleResolutionDownBy: scaleDown,
                        ...(svc ? {scalabilityMode: "L1T3"} : {}),
                    },
                ];
                await sender.setParameters(p);
            } catch {
            }
        }
    }

    _sendSignal(to, data) {
        this.socket.emit("signal", {to, data});
    }

    _addOrReplaceTrack(track, tag) {
        return this._addOrReplaceTaggedTrack(track, tag);
    }

    _removeTrack(_track) {
        // deprecated
    }

    _classify(track) {
        if (track.kind === "audio" && (track.label || "").toLowerCase().includes("display"))
            return "screen-audio";
        if (track.kind === "audio") return "mic";
        return "screen";
    }

    // Screen-Preview Loop
    _startScreenCaptureLoop({onFrame, frameType = "dataURL", fps = 60}) {
        this._stopFrameLoop();

        const video = document.createElement("video");
        video.autoplay = true;
        video.playsInline = true;
        video.muted = true;
        video.srcObject = this._screenStream;
        this._screenVideoEl = video;

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d", {willReadFrequently: true});
        this._screenCanvas = canvas;

        const cb =
            typeof onFrame === "function" ? onFrame : this.onScreenFrame || null;
        const useIC =
            "ImageCapture" in window &&
            this.localScreenTrack &&
            this.localScreenTrack.readyState === "live";

        const start = async () => {
            try {
                await video.play();
            } catch {
            }
            if (useIC) {
                const ic = new ImageCapture(this.localScreenTrack);
                const iv = setInterval(async () => {
                    if (!this._screenCapturer) return;
                    try {
                        const bmp = await ic.grabFrame();
                        if (!cb) return;
                        if (frameType === "bitmap" && "createImageBitmap" in window) cb(bmp);
                        else {
                            canvas.width = bmp.width;
                            canvas.height = bmp.height;
                            ctx.drawImage(bmp, 0, 0);
                            cb(canvas.toDataURL("image/webp"));
                        }
                    } catch {
                    }
                }, Math.max(1000 / (fps || 10), 50));
                this._screenCapturer = {type: "interval", iv};
                return;
            }

            const draw = () => {
                if (!this._screenVideoEl) return;
                const vw = video.videoWidth,
                    vh = video.videoHeight;
                if (vw && vh) {
                    if (canvas.width !== vw || canvas.height !== vh) {
                        canvas.width = vw;
                        canvas.height = vh;
                    }
                    ctx.drawImage(video, 0, 0, vw, vh);
                    if (cb) {
                        if (frameType === "bitmap" && "createImageBitmap" in window) {
                            createImageBitmap(canvas).then((bmp) => cb(bmp));
                        } else cb(canvas.toDataURL("image/webp"));
                    }
                }
            };

            if ("requestVideoFrameCallback" in HTMLVideoElement.prototype) {
                const loop = () => {
                    if (!this._screenVideoEl) return;
                    draw();
                    video.requestVideoFrameCallback(loop);
                };
                video.requestVideoFrameCallback(loop);
                this._screenCapturer = {type: "rvfc"};
            } else {
                const iv = setInterval(draw, Math.max(1000 / (fps || 10), 50));
                this._screenCapturer = {type: "interval", iv};
            }
        };

        if (video.readyState >= 2) start();
        else video.addEventListener("loadeddata", start, {once: true});
    }

    _stopFrameLoop() {
        if (this._screenCapturer) {
            if (this._screenCapturer.type === "interval" && this._screenCapturer.iv)
                clearInterval(this._screenCapturer.iv);
            this._screenCapturer = null;
        }
        this._screenCanvas = null;
        this._screenVideoEl = null;
    }

    // VAD – intern
    _vadKey(peerId, tag) {
        return `${peerId}:${tag}`;
    }

    _attachVADForTrack(peerId, track, tag) {
        if (!this._vad.enabled || !track || track.kind !== "audio") return;
        const key = this._vadKey(peerId, tag);

        this._detachVAD(key);

        const ctx = this._ensureAudioCtx();
        const stream = new MediaStream([track]);
        const src = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 1024;
        analyser.smoothingTimeConstant = 0;

        src.connect(analyser); // NICHT zur destination verbinden

        this._vad.analyzers.set(key, {stream, src, analyser});
        this._vad.states.set(key, {
            speaking: false,
            levelDb: -100,
            lastAbove: 0,
            lastBelow: 0,
        });
    }

    _detachVAD(key) {
        const obj = this._vad.analyzers.get(key);
        if (obj) {
            try {
                obj.src.disconnect();
            } catch {
            }
            this._vad.analyzers.delete(key);
        }
        this._vad.states.delete(key);
    }

    _updateVADForPeerLeave(peerId) {
        for (const key of Array.from(this._vad.analyzers.keys())) {
            if (key.startsWith(peerId + ":")) this._detachVAD(key);
        }
    }

    _rmsDb(analyser) {
        const buf = new Float32Array(analyser.fftSize);
        analyser.getFloatTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
        const rms = Math.sqrt(sum / buf.length) || 1e-8;
        return 20 * Math.log10(rms);
    }

    _emitPeerId(rawId) {
        return rawId === "self" ? this.selfId || "self" : rawId;
    }

    _pollVAD() {
        if (!this._vad.enabled) return;
        const now = performance.now();
        const {thresholdDb, minSpeakMs, minSilenceMs, smooth} = this._vad.opts;

        for (const [key, obj] of this._vad.analyzers) {
            const st =
                this._vad.states.get(key) || {
                    speaking: false,
                    levelDb: -100,
                    lastAbove: 0,
                    lastBelow: 0,
                };
            const inst = this._rmsDb(obj.analyser);
            st.levelDb = smooth * st.levelDb + (1 - smooth) * inst;

            if (st.levelDb >= thresholdDb) {
                if (!st.lastAbove) st.lastAbove = now;
                st.lastBelow = 0;
                if (!st.speaking && now - st.lastAbove >= minSpeakMs) {
                    st.speaking = true;
                    const peerId = this._emitPeerId(key.split(":")[0]);
                    this.onTalkingStart && this.onTalkingStart(peerId);
                }
            } else {
                if (!st.lastBelow) st.lastBelow = now;
                st.lastAbove = 0;
                if (st.speaking && now - st.lastBelow >= minSilenceMs) {
                    st.speaking = false;
                    const peerId = this._emitPeerId(key.split(":")[0]);
                    this.onTalkingEnd && this.onTalkingEnd(peerId);
                }
            }
            this._vad.states.set(key, st);
        }

        // all mic dudes only
        const speakingIds = new Set();
        for (const [key, st] of this._vad.states) {
            const [pid, tag] = key.split(":");
            if (st.speaking && tag === "mic") speakingIds.add(this._emitPeerId(pid));
        }
        this.onTalking && this.onTalking(Array.from(speakingIds));
    }
}
