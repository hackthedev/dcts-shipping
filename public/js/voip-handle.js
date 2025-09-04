// VC STUFF
let voip;
let stopScreenSharing;    // function to stop screen share

let ssQuality = {
    maxWidth: 1280,   // 720p
    maxHeight: 720,
    fps: 30,
    maxBitrate: 900_000 // 900 kbps
};

(function injectVCStyles() {
    if (document.getElementById("vc-styles")) return;
    const css = `
        #participantsGrid{
            display:flex; flex-wrap:wrap; gap:12px; margin-bottom:14px;
        }
        .participant{
            width:120px; min-width:120px; text-align:center; background:#171A1D;
            border:1px solid #171A1D; border-radius:10px; padding:10px 8px; position:relative;
        }
        .participant .avatar{
            width:64px; height:64px; border-radius:50%; margin:0 auto 6px;
            background:#222 center/cover no-repeat;
            outline:2px solid transparent; transition:outline-color .15s ease, box-shadow .15s ease;
            box-shadow:0 0 0 rgba(114,137,218,0);
        }
        .participant .name{
            font-size:12px; color:#ddd; word-break:break-word;
        }
        .participant.talking .avatar{
            outline-color:#ff4747;
            box-shadow:0 0 12px rgba(255,71,71,.55);
        }
        .participant .mic-ind{
            position:absolute; right:6px; bottom:6px; width:10px; height:10px; border-radius:50%;
            background:#6b7280; 
            display: none;
        }
        .participant.talking .mic-ind{ background:#22c55e; }

        /* Screenshare Quality UI */
        .ss-qual-btn{ background-image:url("/img/settings.png"); }
        .ss-qual-btn.icon{ width:24px !important; height:24px !important; background-size:cover; cursor:pointer; margin-left:6px; }
        .ss-qual-panel{
            position:absolute; z-index:1000; top:38px; right:0;
            background:#171A1D; color:#fff; border:1px solid #333; border-radius:8px;
            padding:10px; width:260px; box-shadow:0 6px 20px rgba(0,0,0,.35); display:none;
        }
        .ss-qual-panel.open{ display:block; }
        .ss-qual-row{ display:flex; align-items:center; justify-content:space-between; margin:6px 0; gap:8px; }
        .ss-qual-panel select, .ss-qual-panel input{ width:120px; }
        .ss-qual-actions{ display:flex; justify-content:space-between; margin-top:8px; }
        .ss-qual-note{ opacity:.7; font-size:12px; margin-top:6px; }
        `;
    const style = document.createElement("style");
    style.id = "vc-styles";
    style.textContent = css;
    document.head.appendChild(style);
})();

function mountScreenQualityUI() {
    const bar = document.getElementById("channelname-icons");
    if (!bar) return;

    // Wrapper (Positionierung relativ)
    //if (!bar.style.position) bar.style.position = "relative";

    // sharescreen icon for quality
    let btn = bar.querySelector(".ss-qual-btn");
    if (!btn) {
        btn = document.createElement("div");
        btn.className = "ss-qual-btn icon";
        btn.title = "Screenshare Quality";
        bar.appendChild(btn);
    }

    // settings panel for ss
    let panel = document.getElementById("ssQualPanel");
    if (!panel) {
        panel = document.createElement("div");
        panel.id = "ssQualPanel";
        panel.className = "ss-qual-panel";
        panel.innerHTML = `
            <div class="ss-qual-row">
                <label>Resolution</label>
                <select id="ssResSel">
                <option value="source">Source (Auto)</option>
                <option value="1920x1080">1080p</option>
                <option value="1280x720" selected>720p</option>
                <option value="960x540">540p</option>
                <option value="640x360">360p</option>
                <option value="320x240">240p</option>
                <option value="256x144">144p</option>
                </select>
            </div>
            <div class="ss-qual-row">
                <label>FPS</label>
                <select id="ssFpsSel">
                <option value="60">60</option>
                <option value="30" selected>30</option>
                <option value="24">24</option>
                <option value="15">15</option>
                </select>
            </div>
            <div class="ss-qual-row">
                <label>Bitrate</label>
                <select id="ssBrSel">
                <option value="auto">Auto</option>
                <option value="300000">300 kbps</option>
                <option value="600000">600 kbps</option>
                <option value="900000" selected>900 kbps</option>
                <option value="1500000">1.5 Mbps</option>
                <option value="2500000">2.5 Mbps</option>
                <option value="5000000">5 Mbps</option>
                <option value="10000000">10 Mbps</option>
                <option value="15000000">15 Mbps</option>
                </select>
            </div>
            <div class="ss-qual-actions">
                <button id="ssApply">Apply</button>
                <button id="ssCloseBtn">Close</button>
            </div>
            <div class="ss-qual-note">Changes will apply instantly during screensharing</div>
            `;


        bar.appendChild(panel);

        // Events
        const resSel = panel.querySelector("#ssResSel");
        const fpsSel = panel.querySelector("#ssFpsSel");
        const brSel = panel.querySelector("#ssBrSel");

        const parseRes = (val) => {
            if (val === "source") return { w: null, h: null };
            const [w, h] = val.split("x").map(n => parseInt(n, 10));
            return { w, h };
        };

        const apply = async () => {
            const { w, h } = parseRes(resSel.value);
            const fps = parseInt(fpsSel.value, 10);
            const br = brSel.value === "auto" ? null : parseInt(brSel.value, 10);

            // settings
            ssQuality = {
                maxWidth: w || ssQuality.maxWidth,
                maxHeight: h || ssQuality.maxHeight,
                fps: fps,
                maxBitrate: br ?? ssQuality.maxBitrate
            };

            // if sharing, change settings live
            try {
                if (voip?.isScreenSharing && voip.isScreenSharing()) {
                    await voip.setScreenQuality({
                        maxWidth: ssQuality.maxWidth,
                        maxHeight: ssQuality.maxHeight,
                        fps: ssQuality.fps,
                        maxBitrate: ssQuality.maxBitrate
                    });
                }
            } catch { }

            panel.classList.remove("open");
        };

        panel.querySelector("#ssApply").addEventListener("click", apply);
        panel.querySelector("#ssCloseBtn").addEventListener("click", () => panel.classList.remove("open"));
    }

    // Toggle Panel
    btn.onclick = () => {
        const already = panel.classList.contains("open");
        document.querySelectorAll(".ss-qual-panel.open").forEach(p => p.classList.remove("open"));
        if (!already) panel.classList.add("open");
    };

    // close panel if clicked away
    document.addEventListener("click", (e) => {
        if (!panel.contains(e.target) && e.target !== btn) {
            panel.classList.remove("open");
        }
    });
}

async function leaveVC() {
    // stop screensharing if on
    try {
        if (typeof stopScreenSharing === "function") {
            stopScreenSharing();
            stopScreenSharing = null;
        }
    } catch { }

    // disable vad etc
    if (voip) {
        try { voip.disableVAD?.(); } catch { }
        try { voip.onTrack = null; voip.onPeerLeft = null; } catch { }
        try {
            // get rid of events
            voip.socket?.off?.("peers");
            voip.socket?.off?.("peer-joined");
            voip.socket?.off?.("peer-left");
        } catch { }
        try { await voip.leaveRoom(); } catch { }
    }

    // cleanup ui
    try {
        document.getElementById("ssModal")?.classList.remove("open");
        const big = document.getElementById("ssBig");
        if (big) { try { big.pause(); } catch { } big.srcObject = null; }
    } catch { }

    // remove dudes and screenshares
    document.getElementById("participantsGrid")?.replaceChildren();
    document.getElementById("screenshareList")?.replaceChildren();

    // remove audio
    document.querySelectorAll('audio[id^="mic-audio-"], audio[id^="ss-audio-"]')
        .forEach(el => el.remove());

    // remove screenshare icons etc
    try { enableScreensharing(false); } catch { }
    document.getElementById("ssQualPanel")?.remove();
}

// everything starts here kinda
async function joinVC() {
    const content = document.getElementById("content");
    content.innerHTML = `
    <div id="participantsGrid"></div>

    <div id="screenshareList" style="margin-top:10px;display:flex;gap:10px;flex-wrap:wrap;"></div>

    <div id="vc-user-grid" style="display:flex;flex-wrap:wrap;gap:16px;"></div>

    <div id="ssModal" class="ss-modal">
      <div class="ss-modal-content">
        <button id="ssClose" class="ss-modal-close">Close</button>
        <video id="ssBig" autoplay playsinline controls muted></video>
      </div>
    </div>
  `;

    const participantsGrid = document.getElementById("participantsGrid");
    const screenshareList = document.getElementById("screenshareList");
    const modal = document.getElementById("ssModal");
    const modalClose = document.getElementById("ssClose");
    const bigVideo = document.getElementById("ssBig");

    // use existing socket. else pow issues
    if (!voip) voip = new Voip({ socket: window.socket });
    try { await voip.unlockAudio(); } catch { }

    // get initial people and on update
    voip.socket?.on("peers", ({ peers }) => {
        (peers || []).forEach(id => upsertParticipant(id));
    });
    voip.socket?.on("peer-joined", ({ id, member }) => upsertParticipant(id, member));
    voip.socket?.on("connect", () => upsertParticipant(voip.socket.id));

    if (voip.socket?.id) upsertParticipant(voip.socket.id); //if already connected

    // track handler
    voip.onTrack = ({ id, stream, kind, isScreen }) => {
        // add vc user
        upsertParticipant(id);

        // screenshare preview
        if (isScreen && kind === "video") {
            upsertScreenTile(id, stream);
        }

        // handle audio
        if (kind === "audio") {
            attachHiddenAudio(`mic-audio-${id}`, stream);
        }
    };


    // someone leaves
    voip.onPeerLeft = ({ id }) => {
        removeParticipant(id);
        removeScreenTile(id);
        removeElById(`ss-audio-${id}`);
        removeElById(`mic-audio-${id}`);
    };

    // close video modal with click
    modalClose.onclick = () => {
        bigVideo.pause?.();
        bigVideo.srcObject = null;
        modal.classList.remove("open");
    };
    modal.onclick = (e) => { if (e.target === modal) modalClose.onclick(); };

    // join room
    const roomId = UserManager.getRoom() || "default";
    await voip.joinRoom(roomId, UserManager.getID(), UserManager.getToken());

    // VAD 
    voip.enableVAD({ thresholdDb: -68, minSpeakMs: 120, minSilenceMs: 220, smooth: 0.6 });
    voip.onTalkingStart = (id) => setTalking(id, true);
    voip.onTalkingEnd = (id) => setTalking(id, false);

    // show channel icon
    enableScreensharing();

    // race condition or something, lazy, not important
    setTimeout(() => {
        mountScreenQualityUI();
    }, 50);

    // --- Teilnehmer-Grid ---
    function upsertParticipant(peerId, member) {

        if (typeof (peerId) === "object") {
            //console.log("peerId was object")
            //console.log(peerId)
            member = peerId.member;
            peerId = peerId.id;
        }

        const id = `p-${peerId}`;
        let el = document.getElementById(id);

        // hide people that arent actually here
        if (!member && (peerId !== socket.id)) return;

        if (!el) {
            el = document.createElement("div");
            el.id = id;
            el.className = "participant";
            el.dataset.peerId = peerId;

            // wont work on yourself locally, but its fine for now
            if (member?.id) {
                el.setAttribute("member-id", `m-${member.id}`);
                el.classList.add("vc-admin-actions")
            }

            // cleaner stuff
            const myId = voip?.selfId || voip?.socket?.id || window.socket?.id;
            const isSelf = peerId === myId;

            const avatar = isSelf
                ? UserManager.getPFP()
                : (member?.icon || "/img/default_pfp.png");

            const name = member?.name ??
                (isSelf ? UserManager.getUsername() : peerId);

            // make classname for admin context menu later
            const nameClass = member?.id ? `name voip-client user-${member.id}` : "name";

            el.innerHTML = `
                <div class="avatar" style="background-image:url('${avatar}')"></div>
                <div class="${nameClass}">${name}</div>
                <div class="mic-ind"></div>
                `;


            participantsGrid.appendChild(el);
        }
        return el;
    }

    function removeParticipant(peerId) {
        removeElById(`p-${peerId}`);
    }

    function upsertScreenTile(peerId, stream) {
        const tileId = `ss-tile-${peerId}`;
        let tile = document.getElementById(tileId);

        if (!tile) {
            tile = document.createElement("div");
            tile.id = tileId;
            tile.className = "ss-tile";
            tile.style.cssText = "position:relative; width:240px;";
            tile.innerHTML = `
                <video id="ss-vid-${peerId}" autoplay playsinline muted style="width:100%;border-radius:8px;display:block;"></video>
                <div class="ss-label" style="
                position:absolute;left:8px;bottom:8px;
                background:rgba(0,0,0,.55);color:#fff;padding:2px 6px;border-radius:6px;font-size:12px;">
                ${displayName(peerId)}
                </div>
            `;
            screenshareList.appendChild(tile);

            // make big on click
            tile.addEventListener("click", () => {
                const srcVid = document.getElementById(`ss-vid-${peerId}`);
                bigVideo.srcObject = srcVid?.srcObject || stream;
                modal.classList.add("open");
                bigVideo.play?.();
            });
        }

        const v = tile.querySelector("video");
        if (v.srcObject !== stream) v.srcObject = stream;
        v.play?.().catch(() => { });
    }
    function removeScreenTile(peerId) { removeElById(`ss-tile-${peerId}`); }

    function attachHiddenAudio(id, stream) {
        let el = document.getElementById(id);
        if (!el) {
            el = document.createElement("audio");
            el.id = id;
            el.autoplay = true;
            el.playsInline = true;
            el.style.display = "none";
            document.body.appendChild(el);
        }
        if (el.srcObject !== stream) el.srcObject = stream;
        el.play?.().catch(() => { });
    }

    function removeElById(id) {
        const el = document.getElementById(id);
        if (el) el.remove();
    }

    window.__vc_upsertParticipant = upsertParticipant;
}

function displayName(id) {
    return voip?.roster?.get(id)?.name || id;
}

async function enableScreensharing(mode) {
    const channelIcons = document.getElementById("channelname-icons");

    // add icons
    if (!channelIcons.querySelector(".screenshare") && !mode) {
        channelIcons.insertAdjacentHTML("beforeend", `<div class="screenshare icon"></div><div onclick="voip.toggleMicMute(this)" class="muteMic icon"></div>`);

        mountScreenQualityUI();

        channelIcons.querySelector(".screenshare").addEventListener("click", async () => {
            if (!stopScreenSharing) {
                // start ss with current settings
                document.getElementById("ssQualPanel")?.querySelector("#ssApply")?.click();

                stopScreenSharing = await voip.shareScreen({
                    audio: true,
                    fps: ssQuality.fps,
                    maxWidth: ssQuality.maxWidth,
                    maxHeight: ssQuality.maxHeight,
                    maxBitrate: ssQuality.maxBitrate
                });

                // preview
                const localStream = voip.getLocalScreenStream();
                (function upsert(peerId, stream) {
                    const tileId = `ss-tile-${peerId}`;
                    let tile = document.getElementById(tileId);
                    const screenshareList = document.getElementById("screenshareList");
                    if (!tile) {
                        tile = document.createElement("div");
                        tile.id = tileId;
                        tile.className = "ss-tile";
                        tile.innerHTML = `
                            <video id="ss-vid-${peerId}" autoplay playsinline muted></video>
                            <div class="ss-label">${peerId == socket.id ? UserManager.getUsername() : peerId}</div>
                            `;
                        screenshareList.appendChild(tile);
                    }
                    const v = tile.querySelector("video");
                    v.srcObject = stream;
                    v.play?.().catch(() => { });
                })(voip.selfId || voip.socket?.id, localStream);

                // cleanup on end
                const vTrack = localStream?.getVideoTracks?.()[0];
                vTrack?.addEventListener("ended", () => {
                    const el = document.getElementById(`ss-tile-${voip.selfId || voip.socket?.id}`);
                    el?.remove();
                    stopScreenSharing?.();
                    stopScreenSharing = null;
                });

                // stream playback issues on start
                setTimeout(() => {
                    document.getElementById("ssQualPanel")?.querySelector("#ssApply")?.click();
                }, 50);
            } else {
                // Stop
                stopScreenSharing();
                stopScreenSharing = null;
                const el = document.getElementById(`ss-tile-${voip.selfId || voip.socket?.id}`);
                el?.remove();
            }
        });
    }

    // get rid of icons
    if (mode === false && channelIcons.querySelector(".screenshare")) {
        channelIcons.querySelector(".screenshare").remove();
        channelIcons.querySelector(".ss-qual-btn").remove();
    }
}

// VAD highlight
function setTalking(peerId, on) {

    let p = document.getElementById(`p-${peerId}`);
    if (!p && typeof window.__vc_upsertParticipant === "function") {
        p = window.__vc_upsertParticipant(peerId);
    }
    if (p) p.classList.toggle("talking", !!on);


    const ss = document.getElementById(`ss-tile-${peerId}`);
    if (ss) ss.classList.toggle("talking", !!on);

    // pfp corner bottom left
    if (voip && (peerId === voip.selfId || peerId === voip.socket?.id)) {
        document.getElementById("profile-qa-img")?.classList.toggle("talking", !!on);
    }

    // other avatars
    if (!p) {
        const alt = (
            document.querySelector(`[data-peer-id="${peerId}"]`) ||
            document.getElementById(`user-avatar-${peerId}`) ||
            document.getElementById(`member-${peerId}`)
        );
        alt?.classList.toggle("talking", !!on);
    }
}


function findTalkingTarget(peerId) {
    // local
    if (voip && (peerId === voip.selfId || peerId === voip.socket?.id)) {
        return document.getElementById("profile-qa-img");
    }
    // remote
    return (
        document.querySelector(`[data-peer-id="${peerId}"]`) ||
        document.getElementById(`user-avatar-${peerId}`) ||
        document.getElementById(`member-${peerId}`) ||
        document.getElementById(`ss-tile-${peerId}`) ||
        ensurePeerChip(peerId)
    );
}
function ensurePeerChip(peerId) {
    const id = `peer-chip-${peerId}`;
    let chip = document.getElementById(id);
    if (chip) return chip;
    const grid = document.getElementById("vc-user-grid");
    if (!grid) return null;
    chip = document.createElement("div");
    chip.id = id;
    chip.className = "peer-chip";
    chip.dataset.peerId = peerId;
    chip.innerHTML = `<div class="avatar"></div><div class="name">${peerId}</div>`;
    grid.appendChild(chip);
    return chip;
}
