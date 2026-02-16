let connectedVcChannel = 0;
let isInVc = false;
let isDeafened = false;
let lastScreenStream = null;
let lastUserStream = null;

let lastScreenOwner = null;
let lastScreenCreatedAt = 0;
let screenStartTs = {};
let screenStreams = {};
let pipLastStream = null;

let fsMuteCache = new Map();

async function setVcVolume(mid, isScreen, percent){
    const p = Math.max(0, Math.min(400, Number(percent) || 0));
    voip.setVolume(mid, isScreen, p);

    const key = `${mid}:${isScreen ? "screen" : "user"}`;
    if (fsMuteCache.has(key)) fsMuteCache.delete(key);

    const audioId = `audio-global-${mid}${isScreen ? '-screen' : ''}`;
    const el = document.getElementById(audioId);

    if (el) {
        el.muted = true;
        el.volume = 0;
        await voip.ensureAudioCtx().catch(()=>{});
        await voip.attachAudioEl(mid, isScreen, el).catch(()=>{});
    }
}

async function hookVcAudio(mid, isScreen, audioEl){
    audioEl.muted = true;
    audioEl.volume = 0;
    await voip.ensureAudioCtx().catch(()=>{});
    await voip.attachAudioEl(mid, isScreen, audioEl).catch(()=>{});
    voip.setVolume(mid, isScreen, voip.getVolume(mid, isScreen));
}


function pickLatestActiveScreenshare() {
    let bestId = null;
    let bestTs = 0;

    for (const [mid, ts] of Object.entries(screenStartTs)) {
        if (!ts) continue;
        if (!screenStreams[mid]) continue;
        if (ts > bestTs) {
            bestTs = ts;
            bestId = mid;
        }
    }

    if (bestId) {
        lastScreenOwner = bestId;
        lastScreenCreatedAt = bestTs;
        lastScreenStream = screenStreams[bestId];
    } else {
        lastScreenOwner = null;
        lastScreenCreatedAt = 0;
        lastScreenStream = null;
    }
}

function rebuildVcUiFromTracks(){
    if(!voip?.participants) return;

    voip.participants.forEach((p, memberId) => {
        if(!memberId) return;

        if(p.videoTrack){
            const card = getOrCreateUserCard(memberId, false);
            const video = card?.querySelector("video");
            if(video){
                p.videoTrack.attach(video);
                video.muted = true;
                video.style.display = "block";
                video.play().catch(()=>{});
                const mst = p.videoTrack.mediaStreamTrack;
                if(mst) lastUserStream = new MediaStream([mst]);
            }
        }

        if(p.screenTrack){
            const card = getOrCreateUserCard(memberId, true);
            const video = card?.querySelector("video");
            if(video){
                p.screenTrack.attach(video);
                video.muted = true;
                video.style.display = "block";
                video.play().catch(()=>{});
                const mst = p.screenTrack.mediaStreamTrack;
                if(mst){
                    screenStreams[memberId] = new MediaStream([mst]);
                    const ts = screenStartTs[memberId] || 0;
                    if(ts >= lastScreenCreatedAt){
                        lastScreenCreatedAt = ts || Date.now();
                        lastScreenOwner = memberId;
                        lastScreenStream = screenStreams[memberId];
                    }
                }
            }
        }

        if(p.audioTrack){
            const audioId = `audio-global-${memberId}`;
            document.getElementById(audioId)?.remove();
            const audio = p.audioTrack.attach();
            audio.id = audioId;
            audio.autoplay = true;
            audio.setAttribute("data-member-id", memberId);
            audio.muted = isDeafened || memberId === UserManager.getID();
            document.body.appendChild(audio);
            hookVcAudio(memberId, false, audio);
        }

        if(p.screenAudioTrack){
            const audioId = `audio-global-${memberId}-screen`;
            document.getElementById(audioId)?.remove();
            const audio = p.screenAudioTrack.attach();
            audio.id = audioId;
            audio.autoplay = true;
            audio.setAttribute("data-member-id", memberId);
            audio.muted = isDeafened || memberId === UserManager.getID();
            document.body.appendChild(audio);
            hookVcAudio(memberId, true, audio);
        }
    });
}

document.addEventListener("DOMContentLoaded", async event => {

    initGlobalPip();
    setInterval(checkPipVisibility, 500);

    voip.onJoin = (username) => {
        if (username === UserManager.getID()) {
            setProfileQaIndicatorStatusText({
                text: `Talking in`,
                channel: document.querySelector('#channelname')?.innerText,
                color: "#23a55a"
            });

            isDeafened = false;

            updateUiButtons();
        }

        socket.emit("notifyVcMemberJoined", {
            id: UserManager.getID(),
            token: UserManager.getToken(),
            channelId: UserManager.getChannel(),
            memberId: username
        });
    };

    voip.onLeave = (participantId) => {
        document.querySelectorAll(`[data-member-id="${participantId}"]`).forEach(e => e.remove());
        document.querySelectorAll(`audio[id^="audio-global-${participantId}"]`).forEach(a => a.remove());

        voip.detachAudio(participantId, false);
        voip.detachAudio(participantId, true);

        delete screenStartTs[participantId];
        delete screenStreams[participantId];
        if(participantId === lastScreenOwner){
            pickLatestActiveScreenshare();
        }

        emitVcMemberLeft(participantId);
    };



    voip.onTrackSubscribed = (track, participantId, isScreen) => {
        getOrCreateUserCard(participantId, isScreen === true);

        if(track.kind === "audio"){
            const audioId = `audio-global-${participantId}${isScreen ? '-screen' : ''}`;
            document.getElementById(audioId)?.remove();

            const audio = track.attach();
            audio.id = audioId;
            audio.autoplay = true;
            audio.setAttribute("data-member-id", participantId);
            audio.muted = isDeafened || participantId === UserManager.getID();
            document.body.appendChild(audio);

            hookVcAudio(participantId, isScreen === true, audio);
            return;
        }

        if(track.kind === "video"){
            const card = getOrCreateUserCard(participantId, isScreen === true);
            const video = card?.querySelector("video");
            if(!video) return;

            track.attach(video);
            video.muted = true;
            video.style.display = "block";
            video.play().catch(()=>{});

            const mst = track.mediaStreamTrack;
            if(mst){
                const s = new MediaStream([mst]);

                if(isScreen){
                    screenStreams[participantId] = s;

                    const ts = screenStartTs[participantId] || Date.now();
                    if(ts >= lastScreenCreatedAt){
                        lastScreenCreatedAt = ts;
                        lastScreenOwner = participantId;
                        lastScreenStream = s;
                    }
                } else {
                    lastUserStream = s;
                }
            }
        }
    };



    voip.onScreenshareBegin = (participantId) => {
        if (participantId === UserManager.getID()) return;
        screenStartTs[participantId] = Date.now();
    };

    voip.onScreenshareEnd = (participantId) => {
        document.querySelectorAll(`.vc-card[data-member-id="${participantId}"][data-type="screen"]`).forEach(e => e.remove());
        document.querySelectorAll(`audio[id^="audio-global-${participantId}-screen"]`).forEach(a => a.remove());

        voip.detachAudio(participantId, true);

        delete screenStartTs[participantId];
        delete screenStreams[participantId];

        if (participantId === lastScreenOwner) {
            pickLatestActiveScreenshare();
        }

        checkPipVisibility();
    };


    voip.onSpeaking = (participantId) => {
        highlightUser(participantId);
    };

    socket.on('vcMemberJoined', async function (response) {
        let mid = response?.memberId;
        let cid = response?.channelId;
        if (!mid || !cid) return;

        addVcMemberToChannel(cid, mid);

        if (isInVc && String(connectedVcChannel) === String(cid)) {
            getOrCreateUserCard(mid, false);
        }
    });

    socket.on('vcMemberLeft', async function (response) {
        let mid = response?.memberId;
        let cid = response?.channelId;

        removeVcMemberFromChannel(cid, mid);

        if (mid) {
            document.querySelectorAll(`.vc-card[data-member-id="${mid}"]`).forEach(e => e.remove());
            document.querySelectorAll(`audio[id^="audio-global-${mid}"]`).forEach(e => e.remove());

            voip.detachAudio(mid, false);
            voip.detachAudio(mid, true);

            checkPipVisibility();
        }
    });
});

function getStreamContainer() {
    return document.getElementById("vc-grid");
}

function getOrCreateUserCard(memberId, isScreen = false) {
    let grid = document.getElementById("vc-grid");
    if (!grid) return null;

    let type = isScreen ? "screen" : "user";
    let cardId = `vc-card-${memberId}-${type}`;
    let card = document.getElementById(cardId);
    if (card) return card;

    const vol = voip?.getVolume ? voip.getVolume(memberId, isScreen) : 100;

    let html = `
      <div class="vc-card ${isScreen ? "screen-only" : ""}"
           id="${cardId}"
           data-member-id="${memberId}"
           data-type="${type}"
           onclick="openFullscreen('${memberId}', ${isScreen})">
    
        ${isScreen ? "" : `
          <div class="avatar-container">
            <img class="vc-avatar" src="/img/default_icon.png" data-member-id="${memberId}">
          </div>
        `}
    
        <video autoplay playsinline muted style="display:none;"></video>
    
        <div class="vc-volwrap"
             onmousedown="event.stopPropagation()"
             onclick="event.stopPropagation()">
          <input class="vc-vol" type="range" min="0" max="400" value="${vol}"
            oninput="
              setVcVolume('${memberId}', ${isScreen}, this.value);
              this.nextElementSibling.innerText = this.value + '%';
            ">
          <div class="vc-volpct">${vol}%</div>
        </div>
    
           ${isScreen ? `
              <div class="username" data-member-id="${memberId}">
                <span class="uname">User ${memberId}</span>
                <span class="vc-badge">&bullet; Screen</span>
              </div>
        ` : `
              <div class="username" data-member-id="${memberId}">
                <span class="uname">User ${memberId}</span>
              </div>
        `}
      </div>
    `;


    grid.insertAdjacentHTML("beforeend", html);
    card = document.getElementById(cardId);

    ChatManager.resolveMember(memberId).then(member => {
        if (!card || !document.body.contains(card)) return;
        if (member) {
            const avatar = card.querySelector(".vc-avatar");
            const uname = card.querySelector(".username .uname");
            if (avatar) avatar.src = member.icon || "/img/default_icon.png";
            if (uname) uname.innerText = member.name;
        }
    });

    return card;
}


async function setupVC(roomId) {
    if (!roomId) return;

    const channelIcons = document.getElementById("channelname-icons");
    let contentContainer = document.getElementById("content");

    channelIcons.innerHTML = "";

    contentContainer.innerHTML = `
        <div class="vc-wrapper" id="vc-wrapper">
            <div class="vc-grid" id="vc-grid"></div>
            
            <div id="vc-fullscreen">
                <video autoplay playsinline></video>
                <div class="fs-controls">
                    <button class="vc-btn" onclick="toggleFullscreenMute(this)">🔊</button>
                    <button class="vc-btn danger" onclick="closeFullscreen()">✖</button>
                </div>
            </div>

            <div class="vc-controls">
                <button class="vc-btn" onclick="toggleScreenshare()" title="Share Screen">🖥️</button>
                <button class="vc-btn" onclick="toggleMic()" id="btn-mic" title="Mic">🎙️</button>
                <button class="vc-btn" onclick="toggleDeafen()" id="btn-deafen" title="Deafen">🎧</button>
                <button class="vc-btn danger disconnect" onclick="leaveVC()" title="Disconnect">📞</button>
            </div>
        </div>
    `;

    updateUiButtons();

    if (!isInVc) {
        setProfileQaIndicatorStatusText({text: "Connecting...", color: "darkorange"});
        voip.joinRoom(roomId, UserManager.getID(), UserManager.getID(), UserManager.getChannel());
        connectedVcChannel = roomId;
        isInVc = true;
        toggleProfileQaIndicator(true);

        getOrCreateUserCard(UserManager.getID());

        setTimeout(() => {
            isDeafened = false;
            updateUiButtons();
            rebuildVcUiFromTracks();
        }, 150);
    } else {
        getOrCreateUserCard(UserManager.getID());

        let vcMembers = await getVCMembers(UserManager.getChannel());
        if (vcMembers?.members) {
            vcMembers.members.forEach(m => getOrCreateUserCard(m));
        }

        rebuildVcUiFromTracks();

        setProfileQaIndicatorStatusText({
            text: `Talking in`,
            channel: document.querySelector('#channelname')?.innerText || "Voice",
            color: "#23a55a"
        });

        updateUiButtons();
    }

    setTimeout(() => {
        let w = document.querySelector(".vc-wrapper");
        if (w) w.style.opacity = "1";
    }, 50);
}


function updateUiButtons() {
    const isMuted = voip && typeof voip.isMuted === "function" ? voip.isMuted() : false;

    const micBtn = document.getElementById("btn-mic");
    const deafBtn = document.getElementById("btn-deafen");
    const pipMic = document.getElementById("pip-mic");
    const pipDeaf = document.getElementById("pip-deafen");
    const channelIconMic = document.querySelector("#channelname-icons .muteMic.icon");

    if (channelIconMic) channelIconMic.classList.toggle("muted", isMuted);

    if (micBtn) {
        if (isDeafened) {
            micBtn.className = "vc-btn deafened";
            micBtn.innerHTML = "🚫";
        } else if (isMuted) {
            micBtn.className = "vc-btn danger";
            micBtn.innerHTML = "🔇";
        } else {
            micBtn.className = "vc-btn";
            micBtn.innerHTML = "🎙️";
        }
    }

    if (deafBtn) deafBtn.className = isDeafened ? "vc-btn danger" : "vc-btn";

    if (pipMic) {
        if (isDeafened) {
            pipMic.className = "vc-pip-btn danger";
            pipMic.innerHTML = "🚫";
        } else if (isMuted) {
            pipMic.className = "vc-pip-btn danger";
            pipMic.innerHTML = "🔇";
        } else {
            pipMic.className = "vc-pip-btn";
            pipMic.innerHTML = "🎙️";
        }
    }

    if (pipDeaf) pipDeaf.className = isDeafened ? "vc-pip-btn danger" : "vc-pip-btn";
}

function checkPipVisibility() {
    if (!isInVc) {
        let pip = document.getElementById("vc-pip-overlay");
        if (pip) pip.style.display = "none";
        return;
    }

    let grid = document.getElementById("vc-grid");
    let currentChannel = UserManager.getChannel();
    let isDifferentChannel = String(currentChannel) !== String(connectedVcChannel);

    let shouldShow = !grid || isDifferentChannel;
    togglePip(shouldShow);
}

function togglePip(show) {
    const pip = document.getElementById("vc-pip-overlay");
    if(!pip) return;

    pip.style.display = show ? "flex" : "none";
    if(!show){
        pipLastStream = null;
        return;
    }

    let stream = lastScreenStream || lastUserStream || null;

    if(!stream){
        const audio = document.querySelector("audio[id^='audio-global-']");
        if(audio?.srcObject) stream = audio.srcObject;
    }

    if(stream === pipLastStream) return;
    pipLastStream = stream;

    const pipContent = document.getElementById("vc-pip-content");
    pipContent.innerHTML = "";

    if(!stream){
        pipContent.innerHTML = `<div style="color:#aaa;font-weight:bold;">Voice Active</div>`;
        return;
    }

    const v = document.createElement("video");
    v.srcObject = stream;
    v.autoplay = true;
    v.muted = true;
    v.playsInline = true;
    pipContent.appendChild(v);
    v.play().catch(()=>{});

    updateUiButtons();
}

function initGlobalPip() {
    let old = document.getElementById("vc-pip-overlay");
    if (old) old.remove();

    let html = `
        <div id="vc-pip-overlay">
            <div id="vc-pip-header">Active Call</div>
            <div id="vc-pip-content"></div>
            <div class="vc-pip-actions">
                <button class="vc-pip-btn" onclick="toggleMic()" id="pip-mic">🎙️</button>
                <button class="vc-pip-btn" onclick="toggleDeafen()" id="pip-deafen">🎧</button>
                <button class="vc-pip-btn danger" onclick="leaveVC()">✖</button>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML("beforeend", html);
    makePipDraggable();
}

function makePipDraggable() {
    const el = document.getElementById("vc-pip-overlay");
    const header = document.getElementById("vc-pip-header");
    if (!el || !header) return;

    let startX = 0, startY = 0, startLeft = 0, startTop = 0;

    header.onmousedown = (e) => {
        e.preventDefault();

        const r = el.getBoundingClientRect();
        startX = e.clientX;
        startY = e.clientY;
        startLeft = r.left;
        startTop = r.top;

        document.body.style.userSelect = "none";
        el.style.height = el.getBoundingClientRect().height + "px";

        const onMove = (e) => {
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;

            const w = el.offsetWidth;
            const h = el.offsetHeight;

            let left = startLeft + dx;
            let top = startTop + dy;

            const maxLeft = window.innerWidth - w;
            const maxTop = window.innerHeight - h;

            if(left < 0) left = 0;
            if(top < 0) top = 0;
            if(left > maxLeft) left = maxLeft;
            if(top > maxTop) top = maxTop;

            el.style.left = left + "px";
            el.style.top = top + "px";
            el.style.right = "auto";
            el.style.bottom = "auto";
        };


        const onUp = () => {
            document.body.style.userSelect = "";
            el.style.height = "";
            document.removeEventListener("mousemove", onMove);
            document.removeEventListener("mouseup", onUp);
        };

        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onUp);
    };
}


async function toggleMic() {
    if (isDeafened) return;
    if (!voip || typeof voip.toggleMic !== "function") return;

    await voip.toggleMic();

    updateUiButtons();
    requestAnimationFrame(updateUiButtons);
    setTimeout(updateUiButtons, 50);
}


async function toggleDeafen() {
    isDeafened = !isDeafened;
    if(isDeafened) await voip.muteMic()
    if(!isDeafened) await voip.unmuteMic()

    document.querySelectorAll("audio[id^='audio-global-']").forEach(a => a.muted = isDeafened);
    updateUiButtons();
}

function leaveVC() {
    voip.leaveRoom();
    emitVcMemberLeft(UserManager.getID(), connectedVcChannel);
    isInVc = false;
    isDeafened = false;
    toggleProfileQaIndicator(false);
    document.getElementById("content").innerHTML = "";
    document.getElementById("channelname-icons").innerHTML = "";
    let pip = document.getElementById("vc-pip-overlay");
    if (pip) pip.style.display = "none";
    document.querySelectorAll("audio[id^='audio-global-']").forEach(el => el.remove());

    voip.detachAudio(UserManager.getID(), false);
    voip.detachAudio(UserManager.getID(), true);
}


async function toggleScreenshare() {
    if (voip.isScreensharing) {
        await voip.stopScreenshare();
        return;
    }

    customPrompts.showPrompt("Stream Settings", `
       <div style="margin:20px 0;">
            <div class="prompt-form-group">
                <label class="prompt-label">Resolution</label>
                <select id="res" class="prompt-select">
                    <option value="1280x720">720p</option>
                    <option value="1920x1080" selected>1080p</option>
                    <option value="2560x1440">2K (1440p)</option>
                    <option value="3840x2160">4K (2160p)</option>
                </select>
            </div>
            <div class="prompt-form-group">
                <label class="prompt-label">FPS</label>
                <select id="fps" class="prompt-select">
                    <option value="30">30</option>
                    <option value="60" selected>60</option>
                    <option value="120">120</option>
                </select>
            </div>
            <div class="prompt-form-group">
                <label class="prompt-label">Bitrate</label>
                <select id="bit" class="prompt-select">
                    <option value="3000000">3 Mbit</option>
                    <option value="8000000" selected>8 Mbit</option>
                    <option value="12000000">12 Mbit</option>
                    <option value="20000000">20 Mbit</option>
                    <option value="35000000">35 Mbit</option>
                    <option value="50000000">50 Mbit</option>
                </select>
            </div>
        </div>
    `, async () => {
        voip.setStreamSettings({
            resolution: document.getElementById("res").value,
            frameRate: parseInt(document.getElementById("fps").value),
            maxBitrate: parseInt(document.getElementById("bit").value),
        });

        try {
            await voip.shareScreen(true);
        } catch (e) {
            console.error(e);
        }
    }, ["Start", null], false, 400);
}

function highlightUser(participantId) {
    document.querySelectorAll(`.vc-card[data-member-id="${participantId}"]`).forEach(card => {
        card.classList.add("speaking");
        setTimeout(() => card.classList.remove("speaking"), 1000);
    });
    let profileImg = document.querySelector("#profile-qa-img");
    if (profileImg) {
        profileImg.classList.add("speaking");
        setTimeout(() => profileImg.classList.remove("speaking"), 1000);
    }
}

function openFullscreen(memberId, isScreen) {
    let type = isScreen ? "screen" : "user";
    let video = document.querySelector(`.vc-card[data-member-id="${memberId}"][data-type="${type}"] video`);
    if (!video || !video.srcObject) return;
    let fs = document.getElementById("vc-fullscreen");
    if (!fs) return;

    fs.querySelector("video").srcObject = video.srcObject;
    fs.style.display = "flex";
    fs.setAttribute("data-target", memberId);
    fs.setAttribute("data-type", type);

    const btn = fs.querySelector(".fs-controls .vc-btn");
    if (btn) btn.innerHTML = "🔊";
}

function closeFullscreen() {
    let fs = document.getElementById("vc-fullscreen");
    if (fs) {
        fs.style.display = "none";
        fs.querySelector("video").srcObject = null;
    }
}

function toggleFullscreenMute(btn) {
    let fs = document.getElementById("vc-fullscreen");
    if (!fs) return;

    const mid = fs.getAttribute("data-target");
    const type = fs.getAttribute("data-type") || "user";
    const isScreen = type === "screen";
    if (!mid) return;

    const key = `${mid}:${isScreen ? "screen" : "user"}`;

    if (!fsMuteCache.has(key)) {
        fsMuteCache.set(key, voip.getVolume(mid, isScreen));
        voip.setVolume(mid, isScreen, 0);
        btn.innerHTML = "🔇";
    } else {
        const prev = fsMuteCache.get(key);
        fsMuteCache.delete(key);
        voip.setVolume(mid, isScreen, prev == null ? 100 : prev);
        btn.innerHTML = "🔊";
    }
}

async function getVCMembers(channelId) {
    return new Promise((resolve) => {
        socket.emit('getVcChannelMembers', {
            id: UserManager.getID(),
            token: UserManager.getToken(),
            channelId
        }, (r) => resolve(r));
    });
}

function setProfileQaIndicatorStatusText({text, channel, color}) {
    let st = document.querySelector("#vcStatusText");
    let ct = document.querySelector("#vcStatusChannelname");
    let ind = document.querySelector("#profile-qa .row.voip");
    if (st) st.innerText = text;
    if (ct) ct.innerText = channel;
    if (ind && color) ind.style.backgroundColor = color;
}

function toggleProfileQaIndicator(show) {
    let el = document.querySelector("#profile-qa .row.voip");
    if (el) show ? el.classList.remove("invisible") : el.classList.add("invisible");
}

function emitVcMemberLeft(mid, cid) {
    socket.emit("notifyVcMemberLeft", {
        id: UserManager.getID(),
        token: UserManager.getToken(),
        channelId: cid || UserManager.getChannel(),
        memberId: mid
    });
}

async function addVcMemberToChannel(cid, mid) {
    let check = checkVcMemberChannel(cid, mid);
    if (!check.status) return;
    let m = await ChatManager.resolveMember(mid);
    if (!m) return;
    if (!check.element.querySelector(`li[data-member-id='${m.id}']`)) {
        check.element.insertAdjacentHTML("beforeend", `<li class="participant" data-member-id="${m.id}"><img class="avatar" src="${m.icon || '/img/default_icon.png'}">${m.name}</li>`);
        check.element.style.display = "flex";
    }
}

function removeVcMemberFromChannel(cid, mid) {
    let check = checkVcMemberChannel(cid, mid);
    if (!check.status) return;
    check.element.querySelector(`li[data-member-id='${mid}']`)?.remove();
    if (check.element.querySelectorAll("li").length === 0) check.element.style.display = "none";
}

function checkVcMemberChannel(cid, mid) {
    let container = document.querySelector(`#channellist li[data-channel-id="${cid}"] .participants`);
    return {element: container, status: !!container};
}