var servername = document.getElementById("server_name");
var serverdescription = document.getElementById("server_description");
var saveButton = document.getElementById("settings_profile_save");

var serverconfigName;
var serverconfigDesc;

socket.emit("checkPermission", {id:getID(), token: getToken(), permission: "manageServerInfo" }, function (response) {

    if(response.permission == "denied"){
        window.location.href = window.location.origin + "/settings/server";
    }
    else{
        document.getElementById("pagebody").style.display = "block";
    }
});



socket.emit("getServerInfo", {id:getID(), token: getToken() }, function (response) {
    try{

        servername = document.getElementById("server_name");
        serverdescription = document.getElementById("server_description");
        saveButton = document.getElementById("settings_profile_save");

        serverconfigName = response.name.replaceAll("&#039;", "'");
        serverconfigDesc = response.description.replaceAll("&#039;", "'");

        servername = document.getElementById("server_name");
        serverdescription = document.getElementById("server_description");
        saveButton = document.getElementById("settings_profile_save");
        
        servername.value = serverconfigName;
        serverdescription.value = serverconfigDesc;
        console.log(response);
    }
    catch(err){
        console.log("Unable to get Server Information");
        console.log(err);
    }

});

function updatePreview(){

    try{

        // Username
        if(servername.value != serverconfigName ||
            serverdescription.value != serverconfigDesc

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
        if(servername.value != null && servername.value.length > 0 && servername.value != serverconfigName){
            socket.emit("updateServerName", {id:getID(), token: getToken(), value: servername.value }, function (response) {
                console.log(response);

                alert(response.msg);
            });
        }

        if(serverdescription.value != null && serverdescription.value.length > 0 && serverdescription.value != serverconfigDesc){
            socket.emit("updateServerDesc", {id:getID(), token: getToken(), value: serverdescription.value }, function (response) {
                console.log(response);
                alert(response.msg);
            });
        }

        saveButton.style.display = "none";
    }
    catch(error){
        alert("Error while trying to save settings: " + error);
        return;
    }
}

function setUser(username){
    setCookie("username", username, 360);
}

function setBanner(banner){
    setCookie("banner", banner, 360);
}

function setStatus(status){
    setCookie("status", status, 360);
}

function setPFP(pfp){
    setCookie("pfp", pfp, 360);
}

function setAboutme(aboutme){
    setCookie("aboutme", aboutme, 360);
}
