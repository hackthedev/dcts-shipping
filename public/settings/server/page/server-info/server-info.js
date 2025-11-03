var servername = document.getElementById("server_name");
var serverdescription = document.getElementById("server_description");
var saveButton = document.getElementById("settings_profile_save");
var enableDiscovery = document.getElementById("enableDiscovery");
var enableRegistration = document.getElementById("enableRegistration");

var serverconfigName;
var serverconfigDesc;
var serverconfigDiscoveryEnabled;
let serverconfigRegistrationEnabled;

const customPrompts = new Prompt();

socket.emit("checkPermission", {id: UserManager.getID(), token: UserManager.getToken(), permission: "manageServer" }, function (response) {

    if(response.permission == "denied"){
        window.location.href = window.location.origin + "/settings/server";
    }
    else{
        document.getElementById("pagebody").style.display = "block";
    }
});



socket.emit("getServerInfo", {id: UserManager.getID(), token: UserManager.getToken() }, function (response) {
    try{

        servername = document.getElementById("server_name");
        serverdescription = document.getElementById("server_description");
        saveButton = document.getElementById("settings_profile_save");

        serverconfigName = response.name.replaceAll("&#039;", "'");
        serverconfigDesc = response.description.replaceAll("&#039;", "'");
        serverconfigDiscoveryEnabled = response.discovery.enabled;
        serverconfigRegistrationEnabled = response.registration.enabled;

        servername = document.getElementById("server_name");
        serverdescription = document.getElementById("server_description");
        saveButton = document.getElementById("settings_profile_save");

        enableDiscovery = document.getElementById("enableDiscovery");
        enableRegistration = document.getElementById("enableRegistration");

        servername.value = serverconfigName;
        serverdescription.value = serverconfigDesc;

        enableDiscovery.checked = response?.discovery?.enabled
        enableRegistration.checked = response?.registration?.enabled
        console.log(response);
    }
    catch(err){
        console.log("Unable to get Server Information");
        console.log(err);
    }

});

function updatePreview(){

    try{
        let changes = false;

        if(serverconfigDiscoveryEnabled !== document.querySelector("#enableDiscovery").checked){
            saveButton.style.display = "block";
            changes = true;
        }
        else{
            if(!changes) saveButton.style.display = "none";
        }

        if(serverconfigRegistrationEnabled !== document.querySelector("#enableRegistration").checked){
            saveButton.style.display = "block";
            changes = true;
        }
        else{
            if(!changes) saveButton.style.display = "none";
        }


        // Username
        if(servername.value != serverconfigName ||
            serverdescription.value != serverconfigDesc){
            saveButton.style.display = "block";
            changes = true;
        }
        else{
            if(!changes) saveButton.style.display = "none";
        }
    }
    catch(e){
        console.log(e);
    }

}


function saveSettings(){
    try{
        if(servername.value != null && servername.value.length > 0 && servername.value != serverconfigName){
            socket.emit("updateServerName", {id: UserManager.getID(), token: UserManager.getToken(), value: servername.value }, function (response) {
                console.log(response);
            });
        }

        socket.emit("updateServerDesc", {id: UserManager.getID(), token: UserManager.getToken(), value: serverdescription.value || "" }, function (response) {
            console.log(response);
        });


        socket.emit("updateDiscovery", {id: UserManager.getID(), token: UserManager.getToken(),
            enabled: document.querySelector("#enableDiscovery").checked || false
        }, function (response) {
            console.log(response);
        });

        socket.emit("updateRegistration", {id: UserManager.getID(), token: UserManager.getToken(),
            enabled: document.querySelector("#enableRegistration").checked || false
        }, function (response) {
            console.log(response);
        });

        saveButton.style.display = "none";
    }
    catch(error){
        alert("Error while trying to save settings: " + error);
        return;
    }
}