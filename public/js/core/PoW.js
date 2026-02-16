var solvedPow = false;
var etaPow;
var powHashRate = 0;
var powExpectedTries = 0;

async function estimatePoWDuration(difficulty, sampleSeconds = 3) {
    const hashRate = await measureHashRate(sampleSeconds); // hashes per second
    const expectedTries = Math.pow(16, difficulty); // 16^difficulty (hexadecimal)

    const estimatedSeconds = expectedTries / hashRate;

    return {
        hashRate
    };
}

async function measureHashRate(durationSeconds = 3) {
    const start = Date.now();
    let hashes = 0;
    const challenge = "benchmark";

    while ((Date.now() - start) < durationSeconds * 1000) {
        await sha256(challenge + hashes);
        hashes++;
    }

    const elapsedSeconds = (Date.now() - start) / 1000;
    const hashRate = hashes / elapsedSeconds;
    return Math.round(hashRate);
}

async function sha256(message) {
    console.log(message);
    const msgBuffer = new TextEncoder().encode(message);
    console.log(msgBuffer)
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function formatTimeDifference(startTimestamp, endTimestamp) {
    let diffMs = endTimestamp - startTimestamp;
    if (diffMs < 0) diffMs = 0; // prevent negative

    const totalSeconds = Math.floor(diffMs / 1000);

    const days = Math.floor(totalSeconds / (3600 * 24));
    const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const parts = [];
    if (days > 0) parts.push(`${days} day${days !== 1 ? 's' : ''}`);
    if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
    if (minutes > 0) parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
    if (seconds > 0 || parts.length === 0) parts.push(`${seconds} second${seconds !== 1 ? 's' : ''}`);

    return parts.join(', ');
}

function setupAccountFromData(data) {
    let powChallenge = data?.pow?.split("-")[0]
    let powSolution = data?.pow?.split("-")[1]

    if (data?.icon) UserManager.setPFP(data?.icon);
    if (data?.banner) UserManager.setBanner(data?.banner);
    if (data?.name) UserManager.setUsername(data?.name);
    if (data?.status) UserManager.setStatus(data?.status);
    if (data?.aboutme) UserManager.setAboutme(data?.aboutme);

    if (powChallenge) CookieManager.setCookie("pow_challenge", powChallenge);
    if (powSolution) CookieManager.setCookie("pow_solution", powSolution);

    if (data?.loginName) CookieManager.setCookie("loginName", data?.loginName, 365);
    if (data?.id) CookieManager.setCookie("id", data?.id, 365);
    if (data?.token) CookieManager.setCookie("dcts_token", data?.token, 365);
}

async function setupAccount(challenge, difficulty) {
    customPrompts.showPrompt(
        "Welcome!",
        `
        <div style="margin-bottom: 15px; font-size: 14px; max-width: 600px;">
            <b style="display: block; margin-bottom: 10px;">Do you want to import an existing account via file?</b>
        </div>
    
        <div style="display: flex; gap: 4px; margin-top: 20px; justify-content: flex-end;">
            <button id="importAccountBtn" style="
                padding: 8px 14px;
                background-color: #2196F3;
                border: none;
                border-radius: 4px;
                color: white;
                cursor: pointer;
                font-size: 13px;
            ">Import</button>
    
            <button id="createNewBtn" style="
                padding: 8px 14px;
                background-color: #4CAF50;
                border: none;
                border-radius: 4px;
                color: white;
                cursor: pointer;
                font-size: 13px;
            ">Skip</button>
        </div>
        `,
        null, // no confirm button
        null,
        null,
        null,
        null,
        null,
        true,
        true
    );

    setTimeout(async () => {
        document.getElementById("importAccountBtn").onclick = () => {
            // handle import 

            FileManager.readFile(function (content) {

                try {
                    let data = JSON.parse(content);

                    let powChallenge = data?.pow?.split("-")[0]
                    let powSolution = data?.pow?.split("-")[1]

                    if (!powChallenge || !powSolution) {
                        showSystemMessage({
                            title: "Import Warning",
                            text: "Some data was missing and may not be complete!",
                            icon: "error",
                            img: null,
                            type: "warning",
                            duration: 10000
                        });
                        return;
                    }

                    socket.emit("importAccount", {account: data}, function (response) {
                        if (response?.error === null) {
                            setupAccountFromData(data);

                            window.location.reload();
                        } else {
                            customAlerts.showAlert("error", response.error)
                        }
                    });
                } catch (importError) {
                    console.log(importError)
                    showSystemMessage({
                        title: "Import Error",
                        text: importError.message,
                        icon: "error",
                        img: null,
                        type: "error",
                        duration: 10000
                    });
                }

            })
        };

        document.getElementById("createNewBtn").onclick = async () => {
            // Handle new account
            customPrompts.closePrompt();

            const solution = await solvePow(challenge, difficulty);
            solvedPow = true;

            verifyPow(challenge, solution)
            CookieManager.setCookie("pow_challenge", challenge)
            CookieManager.setCookie("pow_solution", solution)

            window.location.reload();
        };

    }, 0);
}

async function showPowProgressPrompt(challenge, currentLevel = 0, targetLevel = 4) {
    customPrompts.showPrompt(
        "Identity Setup",
        `

        <div style="margin-bottom: 15px; font-size: 14px; word-break: break-all;">
            <b style="margin-bottom: 6px !important;width: 100%; display: block;">Challenge:</b><label id="challenge">${challenge || "Loading..."}</label>
        </div>

        <div style="margin-bottom: 10px;">
            <div style="font-size: 13px;margin-bottom: 6px;"><i>Creating identity</i>...</div>
            <div id="powLoadingBar" style="
                width: 100%;
                height: 8px;
                background: #ccc;
                overflow: hidden;
                border-radius: 4px;
                position: relative;
            ">
                <div id="powLoadingBarInner" style="
                    height: 100%;
                    width: 30%;
                    background: linear-gradient(90deg,rgb(17, 184, 245),rgb(17, 184, 245));
                    position: absolute;
                    left: 0;
                    animation: powMove 4s linear infinite;
                "></div>
            </div>
        </div>

        <div id="powDetailsContainer" style="display: none";>
            <div style="margin-top: 20px;">
                <div id="powCurrentLevel" style="font-size: 13px;margin-bottom: 6px;">
                    <label id="powCurrentLevelLeft" style="float: left;margin-bottom: 6px;"></label>
                    <label id="powCurrentLevelRight" style="float: right;margin-bottom: 6px;"></label>
                </div>

                <div style="height: 6px; background: #ccc; border-radius: 3px; overflow: hidden; width: 100%;">
                    <div id="powProgress" style="
                        height: 100%;
                        width: ${(currentLevel / targetLevel) * 100}%;
                        background: #4caf50;
                        transition: width 0.3s ease;
                    "></div>
                </div>
            </div>


            <div style="margin-top: 20px;">
                <div id="powEstimatedTime" style="font-size: 13px;">
                    ETR: ${formatTimeDifference(Date.now(), etaPow)}
                </div>
            </div>


            <li class="info" style="margin-top: 20px;max-width: 300px;">
                <span class="bullet"></span>In order to access this server you need to wait until your identity level matches ${targetLevel}. 
            </li>

            <li class="info" style="max-width: 300px;">
                <span class="bullet"></span>ETR: Estimated time remaining. 
            </li>
        </div>

        <style>
        @keyframes powMove {
            0% { left: -30%; }
            50% { left: 100%; }
            100% { left: -30%; }
        }
        </style>
        `,
        null, // no button, it's just info
        null,
        null,
        null,
        null,
        null,
        true,
        true
    );

    let result = await estimatePoWDuration(1)
    console.log(`Hash Rate: ${result.hashRate} hashes/sec`);

    powHashRate = result.hashRate;
    powExpectedTries = Math.pow(16, targetLevel);
    const estimatedSeconds = Math.round(powExpectedTries / powHashRate);
    etaPow = Date.now() + estimatedSeconds * 1000;
}

async function updatePowProgress(currentBits, targetLevel, challenge = null) {
    const challengeString = document.getElementById('challenge');
    const bar = document.getElementById('powProgress');
    const labelLeft = document.getElementById('powCurrentLevelLeft');
    const labelRight = document.getElementById('powCurrentLevelRight');
    const etrLabel = document.getElementById('powEstimatedTime');
    const powDetailsContainer = document.getElementById('powDetailsContainer');
    powDetailsContainer.style.display = "block";

    const now = Date.now();
    const targetBits = targetLevel * 4;

    if (etrLabel) {
        const totalTries = Math.pow(2, targetBits);
        const completedTries = Math.pow(2, currentBits);
        const remainingTries = totalTries - completedTries;

        const hashRate = powHashRate || 18000;
        const estimatedRemainingSeconds = remainingTries / hashRate;
        const adjustedEta = now + estimatedRemainingSeconds * 1000;

        etrLabel.innerText = `ETR: ${formatTimeDifference(now, adjustedEta)}`;
    }

    if (bar && labelLeft && labelRight) {
        const progressPercent = (currentBits / targetBits) * 100;
        bar.style.width = `${progressPercent}%`;
        labelLeft.innerText = `Level: ${Math.round(currentBits / 4)} / ${Math.round(targetLevel)}`;
        labelRight.innerText = `${currentBits} / ${targetBits} bits`;

        // update challenge
        if(challenge && challengeString) {
            challengeString.innerText = `${challenge}`;
        }
    }
}


function initPow(onAcceptedCallback) {
    socket.on('powChallenge', (pow) => {
        console.log('Received PoW challenge:', pow.challenge, 'Difficulty:', pow.difficulty);

        // Check if the solution is already stored
        const storedSolution = CookieManager.getCookie("pow_solution");
        const storedChallenge = CookieManager.getCookie("pow_challenge");

        if (storedSolution && storedChallenge) {
            challenge = storedChallenge;
            verifyPow(challenge, storedSolution)
        } else {
            setupAccount(pow.challenge, pow.difficulty)
        }
    });

    socket.on('powAccepted', (data) => {
        console.log('PoW accepted:', data);
        if (typeof onAcceptedCallback === "function") {
            onAcceptedCallback(data);
        }
    });
}
async function upgradeIdentity(challenge, currentLevel, targetLevel) {
    if(challenge === "null") {
        challenge = null;
    }


    await showPowProgressPrompt(challenge, currentLevel, targetLevel);

    let solution = 0;
    let currentPowLevel = 0;
    const bitsTarget = targetLevel * 4;
    const startTime = Date.now();

    if (!powHashRate) {
        const result = await estimatePoWDuration(1);
        powHashRate = result.hashRate;
    }

    async function processChunk() {
        for (let i = 0; i < 2000; i++) {
            const hash = await sha256(challenge + solution);
            const currentDifficulty = getCurrentBitDifficulty(hash);

            if (currentDifficulty > currentPowLevel) {
                currentPowLevel = currentDifficulty;
                updatePowProgress(currentDifficulty, targetLevel, challenge);
                console.log(
                    `Upgrade progress: Level ${Math.round(currentDifficulty / 4)} / ${targetLevel} (${currentDifficulty} / ${bitsTarget} bits)`
                );
            }

            if (currentDifficulty >= bitsTarget) {
                const endTime = Date.now();
                console.log(`Identity upgraded successfully in ${formatTimeDifference(startTime, endTime)}`);
                updatePowProgress(bitsTarget, targetLevel, challenge);
                return solution;
            }

            solution++;
        }

        // unlock ui
        await new Promise(r => setTimeout(r, 0));

        return await processChunk();
    }

    return await processChunk();
}



function verifyPow(challenge, solution) {
    socket.emit('verifyPow', {
        challenge: challenge,
        solution: parseInt(solution),
        token: UserManager.getToken(),
        id: UserManager.getID()
    }, function (response) {
        if (response.type === "success") return;

        showSystemMessage({
            title: response.title || "",
            text: response.msg || "",
            icon: response.type,
            img: null,
            type: response.type,
            duration: response.displayTime || 10000
        });

        if (response.error === "invalidIdentity") {
            if (response?.powResult) {
                if (response.powResult?.level !== null && response.powResult?.required !== null) {
                    customPrompts.showConfirm(
                        `Your current identity level is ${response.powResult.level},
                                the server requires a level of ${response.powResult.required}.
                                
                                Do you want to upgrade your identity level?`,
                        [["Yes", "success"], ["No", "error"]],
                        null,
                        (values) => {
                            if (values.selectedOption === "yes") {

                                (async () => {
                                    const challenge = CookieManager.getCookie("pow_challenge");
                                    const oldSolution = CookieManager.getCookie("pow_solution");
                                    const currentLevel = response.powResult.level;
                                    const targetLevel = response.powResult.required;

                                    if (!challenge || !oldSolution) {
                                        setupAccount();
                                        console.error("error", "Missing existing identity data");
                                        return;
                                    }

                                    const newSolution = await upgradeIdentity(challenge, currentLevel, targetLevel);
                                    verifyPow(challenge, newSolution);

                                    CookieManager.setCookie("pow_challenge", challenge);
                                    CookieManager.setCookie("pow_solution", newSolution);
                                })();
                            }
                        }
                    )

                    return;
                }
            }

            customPrompts.showConfirm(
                `It seems like your submitted identity was wrong.
                It helps to reset your account for this specific server.
                
                Do you want to continue?`,
                [["Yes", "success"], ["No", "error"]],
                (selectedOption) => {
                    if (selectedOption === "yes") {
                        UserManager.resetAccount();
                    }
                }
            )
        }
    });
}


async function solvePow(challenge, difficulty) {
    let solution = 0;
    let currentPowLevel = 0;
    const bitsTarget = difficulty * 4;

    await showPowProgressPrompt(challenge, currentPowLevel, difficulty);

    if (!powHashRate) {
        const result = await estimatePoWDuration(1);
        powHashRate = result.hashRate;
    }

    const startTime = Date.now();

    async function processChunk() {
        for (let i = 0; i < 2000; i++) {
            const hash = await sha256(challenge + solution);
            const currentDifficulty = getCurrentBitDifficulty(hash);

            if (currentDifficulty > currentPowLevel) {
                currentPowLevel = currentDifficulty;
                updatePowProgress(currentDifficulty, difficulty);
                console.log(`Level: ${Math.round(currentDifficulty / 4)} / ${Math.round(difficulty)} (${currentDifficulty} / ${bitsTarget} bits)`);
            }

            if (currentDifficulty >= bitsTarget) {
                const endTime = Date.now();
                console.log(`Solved identity in ${formatTimeDifference(startTime, endTime)}`);
                updatePowProgress(bitsTarget, difficulty);
                return solution;
            }

            solution++;
        }

        await new Promise(r => setTimeout(r, 0));
        return await processChunk();
    }

    return await processChunk();
}


function getCurrentBitDifficulty(hash) {
    let bits = 0;

    for (const char of hash) {
        const nibble = parseInt(char, 16); // each char is 4 bits
        if (nibble === 0) {
            bits += 4;
        } else {
            // How many leading 0 bits inside this nibble
            if (nibble < 2) bits += 3;
            else if (nibble < 4) bits += 2;
            else if (nibble < 8) bits += 1;
            // else 0
            break;
        }
    }

    return bits;
}
