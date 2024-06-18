setupNotify();

var servername = document.getElementById("server_name");
var serverdescription = document.getElementById("server_description");
var saveButton = document.getElementById("settings_profile_save");

var serverconfigName;
var serverconfigDesc;

socket.emit("checkPermission", {id:getID(), token: getToken(), permission: "manageEmojis" }, function (response) {

    if(response.permission == "denied"){
        window.location.href = window.location.origin + "/settings/server";
    }
    else{
        document.getElementById("pagebody").style.display = "block";
    }
});

socket.emit("userConnected", { id: getID(), name: getUsername(), icon: getPFP(), status: getStatus(), token: getToken(),
    aboutme: getAboutme(), banner: getBanner()});

getEmojis();

function checkState(element, ){


    var emojiSaveElement = document.querySelector(`#save-${element.id}`);


    if(element.value != element.alt.split("_")[2].split(".")[0]){
        emojiSaveElement.style.display = "block";
    }
    else{
        emojiSaveElement.style.display = "none";
    }

    // Execute a function when the user presses a key on the keyboard
    element.addEventListener("keypress", function(event) {
        // If the user presses the "Enter" key on the keyboard
        if (event.key === "Enter") {
            emojiSaveElement.click();
        }
    });
}



function getEmojis() {
    var emojiContainer = document.getElementById("emoji-container");

    socket.emit("getEmojis", { id:getID(), token: getToken() }, function (response) {

        try {
            if (response.type == "success") {
                //settings_icon.value = response.msg;
                emojiContainer.innerHTML = "";

                response.data.forEach(emoji => {
                    //console.log(emoji)


                    var emojiId = emoji.split("_")[1];
                    var emojiName = emoji.split("_")[2];

                    //console.log("Emoji ID: " + emojiId);
                    //console.log("Emoji Name: " + emojiName);

                    var code = `
                    <div class="emoji-entry">
                        <div class="emoji-img">
                            <img class="emoji" src="/emojis/${emoji}">
                        </div>
                
                        <div class="emoji-name">
                            <input type="text" onkeyup="checkState(this);" id="${emojiId}" alt="${emoji}" value="${emojiName.split(".")[0]}">
                            <div class="emoji-actions">
                                <img id="delete-${emojiId}" class="emoji-action-icon" src="/img/delete.png" onclick="deleteEmoji('${emoji}', this);">
                                <img id="save-${emojiId}" style="display: none;" class="emoji-action-icon" src="/img/save.png" onclick="saveEmojiName('${emojiId}', this);">
                            </div>
                        </div>
                    </div>`;

                    emojiContainer.insertAdjacentHTML("beforeend", code);
                })

                //alert(response.msg)
            } else {
                notify(response.msg, "error")
            }
        }
        catch (Ex){
            console.log(Ex);
            notify("Unkown Error! Reloading might fix it", "error");
        }

        console.log(response);
    });
}

function deleteEmoji(emoji, element){

    console.log("trying to delete emoji " + emoji)
    console.log("sending")

    var parentNode = element.parentNode.parentNode;
    var inputField = parentNode.querySelector("input");

    socket.emit("deleteEmoji", {emoji: emoji, id:getID(), token: getToken()}, function (response) {

        if(response.type == "success"){
            element.remove();

            notify("Emoji successfully deleted", "success");
            getEmojis();
        }
        else{
            notify("Emoji successfully deleted", "error");
            //alert(response.msg)
        }
    });
}

function saveEmojiName(id, element){

    var parentNode = element.parentNode.parentNode;
    var inputField = parentNode.querySelector("input");

    socket.emit("updateEmoji", {emojiId: id, emojiName: inputField.value, id:getID(), token: getToken()}, function (response) {

        if(response.type == "success"){
            element.style.display = "none";
            //inputField.alt = inputField.value;

            notify("Emoji successfully updated", "success")
            getEmojis();
        }
        else{
            notify(response.msg, "error")
        }
    });
}

function upload(files) {

    socket.emit("fileUpload", {file: files[0], filename: files[0].name, id:getID(), token: getToken(), type: "emoji" }, function (response) {

        if(response.type == "success"){
            //settings_icon.value = response.msg;
            //alert(response.msg)
            getEmojis();
        }
        else{
            notify(response.msg, "error")
        }

        console.log(response);
    });
}