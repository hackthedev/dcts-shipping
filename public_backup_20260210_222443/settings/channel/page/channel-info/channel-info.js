window.updatePreview  = updatePreview;
window.saveSettings   = saveSettings;

var channelname = document.getElementById("channel_name");
var saveButton = document.getElementById("settings_channel_save");

var serverconfigName;
var editChannel = {};


socket.emit("getChannelInfo", {id: UserManager.getID(), token: UserManager.getToken(), channel: getUrlParams("id").replace("channel-", "")}, function (response) {
    try{

        console.log(response)
        channelname = document.getElementById("channel_name");
        saveButton = document.getElementById("settings_channel_save");

        serverconfigName = response.data.name;
        channelname.value = serverconfigName;
        editChannel = response;

        console.log(response);
    }
    catch(err){
        console.log("Unable to get Channel Information");
        console.log(err);

        alert("Unable to get channel info. Please try to reload slowly until it works. Known bug!");
    }

});


function getToken(){
    var token = getCookie("token");

    if(token == null || token.length <= 0){
        return null;
    }
    else{
        return token;
    }
}

function getID(){
    var id = getCookie("id");

    if(id == null || id.length != 12){
        id = generateId(12);
        setCookie("id", id, 360);
        return id;
    }
    else{
        return id;
    }
}
function updatePreview(){

    try{

        // Username
        if(channel_name.value != serverconfigName
        ){
            console.log("NOt same");
            saveButton.style.display = "block";
        }
        else{
            console.log("same");
            saveButton.style.display = "none";
        }
    }
    catch(e){
        console.log(e);
    }

}


function saveSettings(){
    try{
        if(channelname.value != null && channelname.value.length > 0 && channelname.value !== serverconfigName){
            socket.emit("updateChannelName", {id: UserManager.getID(), token: UserManager.getToken(), channel: getUrlParams("id"), name: channelname.value }, function (response) {
                console.log(response);

                notify(response.msg, "success", null, true);
            });
        }

        saveButton.style.display = "none";
    }
    catch(error){
        alert("Error while trying to save settings: " + error);
        return;
    }
}