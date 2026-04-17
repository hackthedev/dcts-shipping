var settings_username = null
var settings_loginName = null
var settings_status = null
var settings_aboutme = null
var settings_icon = null
var settings_banner = null
var preview_username = null
var preview_status = null
var preview_aboutme = null
var preview_icon = null
var preview_banner = null
var saveButton = null


document.addEventListener("pagechange", e => {
    console.log(e.detail.page);
    if (e.detail.page !== "profile") return;

    setPreview()
});

async function handleUpload(files, id) {
    try {
        let uploadResult = await ChatManager.uploadFile(files);
        console.log(uploadResult);

        if(uploadResult.ok !== true){
            return showSystemMessage({
                title: `Error uploading file`,
                text: uploadResult?.error,
                icon: "error",
                type: "error",
                duration: 4000
            });
        }

        let url = `${uploadResult.path}`

        if (id === "settings_profile_icon") {
            settings_icon.value = url;
            updatePreview("settings_profile_icon");
        } else if (id === "settings_profile_banner") {
            settings_banner.value = url;
            updatePreview("settings_profile_banner");
        }
    } catch (error) {
        console.error("An error occurred during the upload process:", error);
    }
}


function resetAccount() {
    UserManager.resetAccount();
}

function setPreview() {
    settings_username = document.getElementById("settings_profile_username");
    settings_loginName = document.getElementById("settings_profile_loginName");
    settings_status = document.getElementById("settings_profile_status");
    settings_aboutme = document.getElementById("settings_profile_aboutme");
    settings_icon = document.getElementById("settings_profile_icon");
    settings_banner = document.getElementById("settings_profile_banner");

    preview_username = document.getElementById("profile_username");
    preview_status = document.getElementById("profile_status");
    preview_aboutme = document.getElementById("profile_aboutme");
    preview_icon = document.getElementById("profile_icon");
    preview_banner = document.getElementById("profile_banner");
    saveButton = document.getElementById("settings_profile_save");


    preview_icon.style.backgroundImage = `url("${UserManager.getPFP()}")`;
    preview_banner.style.backgroundImage = `url("${UserManager.getBanner()}")`;

    settings_username.value = `${limitString(UserManager.getUsername(), 30)}`;
    settings_status.value = `${limitString(UserManager.getStatus(), 100)}`;
    settings_aboutme.value = `${limitString(unescapeHtmlEntities(UserManager.getAboutme()), 500)}`;

    settings_icon.value = `${UserManager.getPFP()}`;
    settings_banner.value = `${UserManager.getBanner()}`;

    preview_username.innerHTML = `<h2>${limitString(UserManager.getUsername(), 30)}</h2>`;
    preview_status.innerText = `${limitString(UserManager.getStatus(), 100)}`;
    preview_aboutme.innerHTML = `${sanitizeHtmlForRender(limitString(UserManager.getAboutme(), 1000))}`;
    settings_loginName.value = `${limitString(UserManager.getLoginName(), 500)}`;
}

async function exportAccount() {
    const runExport = (passphrase = "") => {
        socket.emit("exportAccount", {
            id: UserManager.getID(),
            token: UserManager.getToken(),
            origin: window.location.origin,
            passphrase
        }, async function (response) {
            if (response?.error) {
                showSystemMessage({
                    title: "Unable to export account",
                    text: response.error,
                    icon: "error",
                    img: null,
                    type: "error",
                    duration: 4000
                });
                return;
            }

            if (response?.encrypted === true) {
                customPrompts.showConfirm("Export encrypted file?",
                    [["Yes", "success"], ["No", "error"]],
                    async (selectedOption) => {
                        if (selectedOption === "yes") {
                            await FileManager.saveFile(JSON.stringify(response.account, null, 4), `${window.location.origin}_identity_${UserManager.getUsername()}_encrypted.json`)
                        }
                    });
                return;
            }

            customPrompts.showConfirm("Generate a QR code?",
                [["Yes", "success"], ["No", "error"]],
                (selectedOption) => {
                    if (selectedOption === "yes") {
                        let qrcodeElement = document.getElementById("export-account-qrcode");

                        new QRCode(qrcodeElement, {
                            text: JSON.stringify(UserManager.getShortenedAccountData(response.account)),
                            correctLevel: QRCode.CorrectLevel.L,
                            typeNumber: 40,
                        })
                    }

                    customPrompts.showConfirm("Export as file?",
                        [["Yes", "success"], ["No", "error"]],
                        async (selectedOption2) => {
                            if (selectedOption2 === "yes") {
                                await FileManager.saveFile(JSON.stringify(response.account, null, 4), `${window.location.origin}_identity_${UserManager.getUsername()}.json`)
                            }
                        })
                })
        });
    };

    customPrompts.showConfirm("Protect the export with a password?",
        [["Yes", "success"], ["No", "error"]],
        (selectedOption) => {
            if (selectedOption !== "yes") {
                runExport();
                return;
            }

            customPrompts.showPrompt(
                "Protect export",
                `
                <div class="prompt-form-group">
                    <label class="prompt-label" for="exportPassword">Password</label>
                    <input class="prompt-input" type="password" id="exportPassword" placeholder="Enter export password">
                </div>
                `,
                values => {
                    const exportPassword = values.exportPassword?.trim();
                    if (!exportPassword) {
                        showSystemMessage({
                            title: "Missing password",
                            text: "Enter a password to encrypt the export.",
                            icon: "warning",
                            img: null,
                            type: "warning",
                            duration: 3000
                        });
                        return;
                    }

                    runExport(exportPassword);
                },
                ["Protect", "success"],
                false,
                420
            );
        });

    /*
    let data = {
        icon: await FileManager.fileToBase64(UserManager.getPFP()),
        banner: await FileManager.fileToBase64(UserManager.getBanner()),
        loginName: UserManager.getLoginName(),
        displayName: UserManager.getUsername(),
        status: UserManager.getStatus(),
        aboutme: UserManager.getAboutme(),
        pow: {
            challenge: CookieManager.getCookie("pow_challenge"),
            solution: CookieManager.getCookie("pow_solution")
        }
    }
    
    await FileManager.saveFile(JSON.stringify(data, null, 4), "identity_" + UserManager.getUsername() + ".json")

     */
}

function importAccount() {
    FileManager.readFile(function (content) {

        try {
            let data = JSON.parse(content)

            const applyImportedAccount = importedAccount => {
                if (importedAccount?.icon) UserManager.setPFP(importedAccount.icon);
                if (importedAccount?.banner) UserManager.setBanner(importedAccount.banner);
                if (importedAccount?.name) UserManager.setUsername(importedAccount.name);
                if (importedAccount?.displayName) UserManager.setUsername(importedAccount.displayName);
                if (importedAccount?.status) UserManager.setStatus(importedAccount.status);
                if (importedAccount?.aboutme) UserManager.setAboutme(importedAccount.aboutme);

                setPreview()
            };

            if (data?.encrypted === true) {
                customPrompts.showPrompt(
                    "Unlock export",
                    `
                    <div class="prompt-form-group">
                        <label class="prompt-label" for="importPassword">Password</label>
                        <input class="prompt-input" type="password" id="importPassword" placeholder="Enter export password">
                    </div>
                    `,
                    async values => {
                        try {
                            const decryptedAccount = await Crypto.decryptProtectedExport(data, values.importPassword?.trim());
                            applyImportedAccount(decryptedAccount);
                        } catch (decryptError) {
                            showSystemMessage({
                                title: "Unable to decrypt account",
                                text: decryptError.message,
                                icon: "error",
                                img: null,
                                type: "error",
                                duration: 4000
                            });
                        }
                    },
                    ["Unlock", "success"],
                    false,
                    420
                );
                return;
            }

            applyImportedAccount(data);
        } catch (err) {
            console.log(err)
            showSystemMessage({
                title: "Error while importing account",
                text: err.message,
                icon: "error",
                img: null,
                type: "error",
                duration: 20000
            });
        }
    });
}

function saveSettings() {
    try {

        let updatedMember = {
            id: UserManager.getID(), // Reference ID
            icon: settings_icon?.value != null && settings_icon?.value.length > 0 ? settings_icon?.value : null, // Icon
            banner: settings_banner?.value != null && settings_banner?.value.length > 0 ? settings_banner?.value : null, // Banner
            aboutme: settings_aboutme != null ? sanitizeHtmlForRender(settings_aboutme?.value) : null,  // About me
            name: settings_username?.value != null && settings_username?.value.length >= 3 ? settings_username?.value : null, // Username
            status: settings_status != null ? sanitizeHtmlForRender(settings_status?.value, false) : null // Status
        }

        socket.emit("updateMember", {token: UserManager.getToken(), ...updatedMember,}, async function (response) {
            if(response?.error) throw response?.error;
            UserManager.setPFP(response.icon);
            UserManager.setBanner(response.banner);
            UserManager.setAboutme(response.aboutme);
            UserManager.setUsername(response.name);
            UserManager.setStatus(response.status);
            saveButton.style.display = "none";
        });
    } catch (error) {
        alert("Error while trying to save settings: " + error);
        return;
    }
}

function limitString(text, limit) {
    if (!text) return "";

    if (text?.length <= limit) return text?.substring(0, limit);
    else return text?.substring(0, limit) + "...";
}

function updatePreview(id) {
    var newSetting = document.getElementById(id).value;

    try {

        // Username
        if (id == "settings_profile_username") {
            preview_username.innerHTML = `<h2>${newSetting}</h2>`;
        }

        // Status
        if (id == "settings_profile_status") {
            preview_status.innerHTML = `${newSetting}`;
        }

        // About me
        if (id == "settings_profile_aboutme") {
            preview_aboutme.innerHTML = `${sanitizeHtmlForRender(newSetting)}`;
        }

        // Icon
        if (id == "settings_profile_icon") {
            preview_icon.style.backgroundImage = newSetting.length <= 0 ? '/img/default_pfp.png' : `url("${newSetting}")`;
        }

        // Banner
        if (id == "settings_profile_banner") {
            preview_banner.style.backgroundImage = `url("${newSetting}")`;
        }

        // Username
        if (preview_username.innerText != UserManager.getUsername() ||
            preview_status.innerText != UserManager.getStatus() ||
            preview_aboutme.innerText != UserManager.getAboutme() ||
            settings_icon.value != UserManager.getPFP() ||
            settings_banner.value != UserManager.getBanner()

        ) {
            saveButton.style.display = "block";
        } else {
            saveButton.style.display = "none";
        }
    } catch (e) {
        console.log(e);
    }

}

setPreview();

function Sleep(milliseconds) {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
}
