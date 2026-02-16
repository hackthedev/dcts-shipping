
document.addEventListener("pagechange", e => {
    console.log(e.detail.page);
    if (e.detail.page !== "emojis") return;

    initEmojis();
});


function initEmojis(){
    // handle upload
    document.getElementById("settings_profile_save")
        .addEventListener("change", function (e) {
                upload(e.target.files)
            }
        );

    socket.emit("checkPermission", {
        id: UserManager.getID(),
        token: UserManager.getToken(),
        permission: "manageEmojis"
    }, function (response) {
        if (response.permission == "denied") {
            window.location.href = window.location.origin + "/settings/server";
        } else {
            document.getElementById("pagebody").style.display = "block";
        }
    });

    getEmojis();
}

function getNameFromFileName(fileName) {
    return fileName.split("_")[1].split(".")[0]
}

function getRoleSpan(roleObj) {
    return `<span style="margin: auto 4px;color: ${roleObj.color};" data-role-id="${roleObj.id}">${roleObj.name},</span>`
}

async function editEmoji(emojiStringified) {
    let emoji = JSON.parse(emojiStringified);
    var emojiName = emoji.name;
    let emojiHash = emoji.filename.split("_")[0];
    let uploader = emoji.uploader;
    let uploaderObj = await ChatManager.resolveMember(UserManager.getID());

    let emojiObject = new Emoji(emoji.filename)
        .setName(emojiName)
        .setUploader(uploader)
        .setUserReaction(emoji.user_reaction)
        .setAllowedRoles(emoji.allowedRoles)

    console.log(emojiObject.object)

    let roleCode = "";
    for (let roleId of emojiObject.allowedRoles) {
        let resolvedRole = await ChatManager.resolveRole(roleId);
        roleCode += getRoleSpan(resolvedRole.info);
    }

    customPrompts.showPrompt(
        "Edit Emoji",
        `

            <style>
            #settings_emoji_flexContainer {
                display: flex;
                width: 100%;
                flex-direction: row;
                gap: 80px;
                margin: 40px 0;
            }
            
            #settings_emoji_flexContainer .column{
                display: flex;
                flex-direction: column;
            }
            
            .settings_emoji_flexContainer_hr{
                border: 1px solid rgba(128,128,128,0.5);
            }
            </style>

            <div style="display: flex; flex-direction: row; align-items: center; justify-content: center; gap: 20px;margin-bottom: 20px;">
                <img src="/emojis/${emoji.filename}" style="max-width: 50px;">
                <label title="${uploaderObj.id}">Uploaded by ${uploaderObj.name}</label>
            </div><hr class="settings_emoji_flexContainer_hr">

            <div id="settings_emoji_flexContainer">
                <div class="column" style="width: 100%;">
                    <div class="prompt-form-group">              
                        <label class="prompt-label">Emoji Name</label>
                        <input type="text" class="prompt-input"
                        name="inputEmojiName"
                        value="${emoji.name}" 
                        data-filehash="${emojiHash}" 
                        data-name="${emoji.name}" 
                        data-filename="${emoji.filename}"">
                    </div>
                    
                    <!--
                    <div class="prompt-form-group">                        
                        <label for="isUserReaction">Is user reaction?</label>
                        <input type="checkbox" ${emoji?.user_reaction ? "checked" : ""} name="inputIsUserReaction" id="isUserReaction" class="prompt-input">
                    </div>-->
                </div>
                
                <!--
                 <div class="column">
                    <div class="prompt-form-group">                            
                        <label class="prompt-label">Audio Source Url</label>
                        <input type="text" class="prompt-input"
                        name="inputAudioSourceUrl"
                        value="${emoji?.audio?.src ?? ""}" 
                        data-filehash="${emojiHash}" 
                        data-name="${emoji.name}" 
                        data-filename="${emoji.filename}">
                    </div>
                    
                    <div class="prompt-form-group">                        
                        <label for="randomAudioPitch">Enable random audio pitch?</label>
                        <input type="checkbox" name="inputRandomAudioPitch" id="randomAudioPitch" ${emoji?.audio?.random_pitch ? "checked" : ""} class="prompt-input">
                    </div>
                </div>-->
            </div>
                
                <!--
                <div style="display: flex; flex-direction: column; width: 100%;margin-top: -20px;">
                     <div class="prompt-form-group" style="margin-bottom: 0 !important;">     
                        <label for="allowedRoles">Restrict to the following roles:</label>
                        <p class="prompt-input" data-name="allowedRoles" id="allowedRoles" onclick='selectRoleForWhitelist(this, ${JSON.stringify(emojiObject.allowedRoles)})'>
                            ${roleCode}
                        </p>
                    </div>
                </div>-->
            
`,
        async (values) => {
            // some code
            console.log(values)


            socket.emit("updateEmoji",
                {
                    filehash: emojiHash,
                    emojiName: values.inputEmojiName,
                    id: UserManager.getID(),
                    token: UserManager.getToken()
                }, function (response) {
                    if (response.type === "success") {
                        getEmojis();
                    }
                });

        },
        ["Save", "success"]
    )
}

async function selectRoleForWhitelist(element, preselected = null) {
    let chosenRoles = await chooseRole({
        multi: true,
        preselected
    });
    element.innerHTML = '';

    for (let key in chosenRoles.roles) {
        let role = chosenRoles.roles[key];
        element.insertAdjacentHTML("beforeend", getRoleSpan(role))
    }
}

function getEmojis() {
    var emojiContainer = document.getElementById("emoji-container");
    socket.emit("getEmojis", {id: UserManager.getID(), token: UserManager.getToken()}, function (response) {
        try {
            if (response.type === "success") {
                emojiContainer.innerHTML = "";

                response.data.reverse().forEach(emoji => {
                    let emojiHash = emoji.filename.split("_")[0]
                    let emojiEntry = document.createElement("div");
                    emojiEntry.className = "emoji-entry";

                    emojiEntry.innerHTML = `<div class="emoji-img">
                                                <img class="emoji" src="/emojis/${emoji.filename}">
                                                 <div class="emoji-actions">
                                                    <img class="emoji-action-icon" 
                                                    src="/img/delete.png" 
                                                    onclick="deleteEmoji(this);" 
                                                    data-filehash="${emojiHash}" 
                                                    data-filename="${emoji.filename}">
                                                </div>
                                            </div>`

                    let img = emojiEntry.querySelector("img")
                    img.onclick = function () {
                        editEmoji(JSON.stringify(emoji))
                    }
                    emojiContainer.appendChild(emojiEntry);
                });

                // debug, show last emoji prompt on default so designing it is easier for me lol
                // #lazy
                //editEmoji(JSON.stringify((response.data[Object.keys(response.data).length-1])))
            }
        } catch (Ex) {
            console.log(Ex);
        }
    });
}

function deleteEmoji(emoji) {
    socket.emit("deleteEmoji", {
        filename: emoji.getAttribute("data-filename"),
        id: UserManager.getID(),
        token: UserManager.getToken()
    }, function (response) {
        if (response.type === "success") {
            socket.emit("uploadedEmoji", {id: UserManager.getID(), token: UserManager.getToken()});
            emoji.closest(".emoji-entry").remove();
        }
        else{
            console.log(response)
        }
    });
}

async function upload(files) {
    let uploadResult = await ChatManager.uploadFile(files, "emoji");
    console.log(uploadResult);

    if(uploadResult.ok === true){
        socket.emit("uploadedEmoji", {id: UserManager.getID(), token: UserManager.getToken()});
    }
    getEmojis();
}



const dropzone = document.getElementById("emoji-dropzone");

dropzone.addEventListener("dragover", e => {
    e.preventDefault();
    dropzone.style.borderColor = "#00cc00";
});

dropzone.addEventListener("dragleave", () => {
    dropzone.style.borderColor = "#666";
});

dropzone.addEventListener("drop", e => {
    e.preventDefault();
    dropzone.style.borderColor = "#666";

    const files = [...e.dataTransfer.files];
    const imageFiles = files.filter(file => file.type.startsWith("image/"));

    if (imageFiles.length > 0) {
        upload(imageFiles);
    }
});

