var setting_rateLimit = document.getElementById("rate-limit");
var setting_dropInterval = document.getElementById("drop-interval");
var saveButton = document.getElementById("settings_profile_save");

var rateLimit;
var dropInterval;

var serverconfigName;
var serverconfigDesc;


document.addEventListener("pagechange", e => {
    console.log(e.detail.page);
    if (e.detail.page !== "rate-limit") return;

    initRateLimits();
});

function initRateLimits(){
    socket.emit("checkPermission", {id: UserManager.getID(), token: UserManager.getToken(), permission: "manageRateSettings" }, function (response) {

        if(response.permission == "denied"){
            window.location.href = window.location.origin + "/settings/server";
        }
        else{
            document.getElementById("pagebody").style.display = "block";
        }
    });


    socket.emit("getServerInfo", {id: UserManager.getID(), token: UserManager.getToken() }, function (response) {

        console.log(response);
        setting_rateLimit = document.getElementById("rate-limit");
        setting_dropInterval = document.getElementById("drop-interval");
        saveButton = document.getElementById("settings_profile_save");

        rateLimit = response.rateLimit;
        dropInterval = response.dropInterval;

        setting_rateLimit.value = rateLimit;
        setting_dropInterval.value = dropInterval;
    });
}

function isChecked(element){
    return element.checked ? 1 : 0;
}

function updateRateLimitPreview(){

    try{

        // Username
        if(setting_rateLimit.value != rateLimit ||
            setting_dropInterval.value != dropInterval

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


function saveRateLimitSettings(){
    try{

        socket.emit("saveRateSettings", { id: UserManager.getID(), token: UserManager.getToken(),
                                        newRateLimit: setting_rateLimit.value,
                                        newDropInterval: setting_dropInterval.value
        }, function (response) {

            alert(response.msg);
            console.log(response);
        });
    }
    catch(error){
        alert("Error while trying to save settings: " + error);
        return;
    }
}
