var servername = document.getElementById("server_name");
var serverdescription = document.getElementById("server_description");
var saveButton = document.getElementById("settings_profile_save");
var enableDiscovery = document.getElementById("enableDiscovery");
var allowedHosts_list = document.getElementById("allowedHosts_list"); // container
var allowedHosts = document.getElementById("allowedHosts"); // input

var serverconfigName;
var serverconfigDesc;
var serverconfigDiscoveryEnabled;
var serverconfigDiscoveryHosts;

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
        serverconfigDiscoveryHosts = response.discovery.hosts;

        servername = document.getElementById("server_name");
        serverdescription = document.getElementById("server_description");
        saveButton = document.getElementById("settings_profile_save");

        enableDiscovery = document.getElementById("enableDiscovery");
        allowedHosts_list = document.getElementById("allowedHosts_list"); // container
        allowedHosts = document.getElementById("allowedHosts"); // input



        servername.value = serverconfigName;
        serverdescription.value = serverconfigDesc;

        enableDiscovery.checked = response?.discovery?.enabled

        response?.discovery?.hosts?.forEach(host => {
            addAllowedHost(host)
        })

        if(response?.discovery?.hosts?.length === 0){
            allowedHosts_list.style.display = "none";
        }


        console.log(response);
    }
    catch(err){
        console.log("Unable to get Server Information");
        console.log(err);
    }

});

function addAllowedHost(host){
    let hostDiv = document.createElement("div")
    hostDiv.classList.add("host")
    hostDiv.innerHTML = `${host}`;
    hostDiv.onclick = () => { hostDiv.remove(); updatePreview() }
    allowedHosts_list.insertAdjacentElement("beforeend", hostDiv)
    allowedHosts_list.style.display = "block";

    updatePreview();
}

function arraysEqual(a, b) {
    return a.length === b.length && a.every((val, i) => val === b[i]);
}

function updatePreview(){

    try{
        let changes = false;

        let hostElements = document.querySelectorAll("#allowedHosts_list .host")
        const hosts = Array.from(hostElements)
            .map(el => el.innerText);

        if(!arraysEqual(hosts, serverconfigDiscoveryHosts)){
            saveButton.style.display = "block";
            console.log(hosts)
            console.log(serverconfigDiscoveryHosts)
            changes = true;
        }
        else{
            if(!changes) saveButton.style.display = "none";
        }

        if(serverconfigDiscoveryEnabled !== document.querySelector("#enableDiscovery").checked){
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

                alert(response.msg);
            });
        }

        if(serverdescription.value != null && serverdescription.value.length > 0 && serverdescription.value != serverconfigDesc){
            socket.emit("updateServerDesc", {id: UserManager.getID(), token: UserManager.getToken(), value: serverdescription.value }, function (response) {
                console.log(response);
                alert(response.msg);
            });
        }

        let hostElements = document.querySelectorAll("#allowedHosts_list .host")
        const hosts = Array.from(hostElements)
            .map(el => el.innerText);

        socket.emit("updateDiscovery", {id: UserManager.getID(), token: UserManager.getToken(),
            enabled: document.querySelector("#enableDiscovery").checked || false,
            hosts: hosts || []
        }, function (response) {
            console.log(response);
            alert(response.msg);
        });

        saveButton.style.display = "none";
    }
    catch(error){
        alert("Error while trying to save settings: " + error);
        return;
    }
}