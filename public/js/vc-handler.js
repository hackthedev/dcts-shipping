document.addEventListener("DOMContentLoaded", async event => {
    voip.onJoin = (username) => {
        console.log(`${username} joined`);
    };

    voip.onLeave = (participantId) => {
        console.log(`${participantId} Left the room`);

        let streamContainer = getStreamContainer();
        let elements = streamContainer?.parentNode?.querySelectorAll(`[data-member-id="${participantId}"]`)
        elements.forEach(element => {
            element?.remove();
        })
    };

    voip.onTrackSubscribed = (track, participantId, isScreen) => {
        let streamsContainer = getStreamContainer();
        const mediaEl = track.attach();
        mediaEl.autoplay = true;
        mediaEl.controls = true;
        mediaEl.setAttribute("data-member-id", participantId);

        // some fucking magic that i prob wont remember next day
        if (isScreen) {
            let videoEl = mediaEl.querySelector(`video[data-member-id="${participantId}"]`);
            if (!videoEl) {
                videoEl = document.createElement("video");
            }
            videoEl.srcObject = new MediaStream([track.mediaStreamTrack]);
            videoEl.autoplay = true;
            videoEl.controls = true;
            videoEl.setAttribute("data-member-id", participantId);

            streamsContainer.appendChild(mediaEl);
            addVcMember(participantId)
            return;
        }

        streamsContainer.appendChild(mediaEl);
        addVcMember(participantId)
    };

    voip.onScreenshareBegin = (participantId, track) => {
        console.log(`${participantId} started a screenshare`)

        // super fucking magic line
        if (participantId === UserManager.getID()) return;

        let container = document.querySelector(".vc-row.screenshares")

        // handle display logic for screensharing etc... at this point
        // im super confused and also know whats happening.
        // in other words: im freestyling like crazy but it works.
        let videoEl = container.querySelector(`video[data-member-id="${participantId}"]`);
        if (!videoEl) {
            console.warn("Video element not found!!!!!")
            return;
        }
        videoEl.autoplay = true;
        videoEl.controls = true;

        // add track
        videoEl.srcObject = new MediaStream([track.mediaStreamTrack]);


        // handle screenshare audio now too
        if (track.audioTrack) {
            let audioEl = container.querySelector(`audio[data-member-id="${participantId}"]`);
            if (!audioEl) {
                console.warn("Audio element not found!!!")
                return;
            }

            audioEl.srcObject = new MediaStream([track.audioTrack.mediaStreamTrack]);
            audioEl.autoplay = true;

            videoEl.onpause = () => {
                audioEl.pause();
                audioEl.volume = 0;
                videoEl.muted = true;
            }

            videoEl.onplay = () => {
                audioEl.play();
                audioEl.volume = 1;
                videoEl.muted = false;
            }
        }

        videoEl.muted = false;
        videoEl.play();
    };

    voip.onSpeaking = (participantId) => {
        console.log("highlighting", participantId)
        highlightUser(participantId);
    };


    voip.onScreenshareEnd = (participantId) => {
        console.log(`${participantId} stopped a screenshare`)
        let streamsContainer = getStreamContainer();
        console.log("Screenshare ended:", participantId);
        const container = streamsContainer.querySelector(`video[data-member-id="${participantId}"]`);
        container?.remove();
    };
});

let talking = new Map();
function highlightUser(participantId) {
    let userElement = document.querySelectorAll(`.vc-container .participant[data-member-id="${participantId}"] img`);
    let borderCode = "3px solid red";

    if(userElement){
        userElement.forEach(element => {
            if(element.style.border !== borderCode) element.style.border = borderCode;
            if(element.style.border === borderCode){
                clearTimeout(talking.get(participantId))
                talking.delete(participantId);
            }

            let timeout = setTimeout(() => {
                element.style.border = "3px solid transparent";
            }, 1000)

            if(!talking.has(participantId)) talking.set(participantId, timeout);
        })
    }
}

function getStreamContainer() {
    return document.querySelector(".vc-row.screenshares")
}

async function addVcMember(memberId) {
    let contentContainer = document.getElementById("content");

    let member = await resolveMember(memberId);
    if (!member) {
        console.error("Couldnt resovle member in vc handler");
        return;
    }

    let memberElement = contentContainer.querySelector(`.participants .participant[data-member-id="${memberId}"]`);
    if (!memberElement) {
        let memberContainer = contentContainer.querySelector(`.participants`);
        if (memberContainer) {
            memberContainer.insertAdjacentHTML("beforeend", `
            <div class="participant" data-member-id="${memberId}">
                    <img data-member-id="${memberId}" src="${member.icon ? member.icon : "/img/default_icon.png"}" />
                    <p data-member-id="${memberId}">${member.name}</p>
                </div>
            `);
        }
    }
}

function toggleMic(){
    const channelIconMic = document.querySelector("#channelname-icons .muteMic.icon");
    voip.toggleMic();
    if(voip.isMuted()){
        channelIconMic.classList.add("muted");
    }
    else{
        channelIconMic.classList.remove("muted");
    }
}

function toggleScreenshare(){
    try{
        if(voip.isScreensharing){
            voip.stopScreenshare();
        }
        else{
            customPrompts.showPrompt(
                "Stream Settings",
                `
                    <div style="margin: 20px 0;">
                        <div class="prompt-form-group">
                            <label class="prompt-label" for="resolutionSelect">Resolution</label>
                            <select id="resolutionSelect" class="prompt-select">
                                <option value="1280x720">1280x720 (HD)</option>
                                <option value="1920x1080" selected>1920x1080 (Full HD)</option>
                                <option value="2560x1440">2560x1440 (QHD)</option>
                                <option value="3840x2160">3840x2160 (4K)</option>
                            </select>
                        </div>
            
                        <div class="prompt-form-group">
                            <label class="prompt-label" for="bitrateSelect">Bitrate (Mbit/s)</label>
                            <select id="bitrateSelect" class="prompt-select">
                                <option value="0.8">0.8 Mbit</option>
                                <option value="1.5" selected>1.5 Mbit</option>
                                <option value="3">3 Mbit</option>
                                <option value="5">5 Mbit</option>
                                <option value="8">8 Mbit</option>
                                <option value="12">12 Mbit</option>
                            </select>
                        </div>
            
                        <div class="prompt-form-group">
                            <label class="prompt-label" for="fpsSelect">FPS</label>
                            <select class="prompt-select" id="fpsSelect">
                                <option value="30">30 FPS</option>
                                <option value="60" selected>60 FPS</option>
                                <option value="90">90 FPS</option>
                                <option value="12">120 FPS</option>
                            </select>
                        </div>
                    </div>
            
                    <li class="prompt-note">Select your desired streaming quality.</li>
                `,
                async () => {
                    const resolution = document.getElementById("resolutionSelect").value;
                    const bitrateMbit = parseFloat(document.getElementById("bitrateSelect").value);
                    const fps = parseInt(document.getElementById("fpsSelect").value);

                    // Umrechnung in Bit (z. B. 1.5 Mbit → 1500000)
                    const bitrate = Math.round(bitrateMbit * 1000000);

                    console.log("Selected settings:");
                    console.log("Resolution:", resolution);
                    console.log("FPS:", fps);
                    console.log("Bitrate (final):", bitrate);

                    voip.setStreamSettings({
                        resolution: resolution,
                        bitrate: bitrate,
                        frameRate: fps,
                    })

                    voip.shareScreen(true)
                },
                ["Save", null],
                false,
                400
            );
        }

        voip.isScreensharing = !voip.isScreensharing;
    }
    catch (error) {
        console.error(error);
    }
}

async function setupVC(roomId) {
    if (!roomId) {
        console.warn("cant join voice chat because roomid wasnt set")
    }

    const channelIcons = document.getElementById("channelname-icons");
    let contentContainer = document.getElementById("content");
    channelIcons.innerHTML = "";

    contentContainer.innerHTML = `
        <div class="vc-container">
            <div class="vc-row participants">
               
            </div>
            
            
            <div class="vc-row screenshares"></div>
        </div>
    `;

    addVcMember(UserManager.getID());
    voip.joinRoom(roomId, UserManager.getID());

    channelIcons.insertAdjacentHTML("beforeend", `<div class="screenshare icon" onclick="toggleScreenshare()"></div><div onclick="toggleMic();" class="muteMic icon"></div>`);

    setTimeout(() => {
        let vcContainer = document.querySelector(".vc-container");
        vcContainer.style.opacity = "1";
    }, 10)
}

async function resolveMember(memberId) {
    return new Promise((resolve, reject) => {
        socket.emit("resolveMember", {
            id: UserManager.getID(),
            token: UserManager.getToken(),
            target: memberId
        }, function (response) {
            console.log(response);
            resolve(response?.data);
        })
    })
}