var setting_useLocalFs = document.getElementById("saveToLocalFileSystem");
var setting_localFsLimit = document.getElementById("localUploadLimit");
var setting_cfAccountId = document.getElementById("cfAccountId");
var setting_cfAccountToken = document.getElementById("cfAccountToken");
var setting_cfAccountHash = document.getElementById("cfAccountHash");
var saveButton = document.getElementById("settings_profile_save");

var useCf;
var cfAccountId;
var cfAccountToken;
var cfHash;
var localUploadLimit;

var serverconfigName;
var serverconfigDesc;

document.addEventListener("pagechange", e => {
    console.log(e.detail.page);
    if (e.detail.page !== "file-uploads") return;

    initFileUploads();
});


function initFileUploads(){

    socket.emit("checkPermission", {id: UserManager.getID(), token: UserManager.getToken(), permission: "manageUploads" }, function (response) {

        if(response.permission == "denied"){
            window.location.href = window.location.origin + "/settings/server";
        }
        else{
            document.getElementById("pagebody").style.display = "block";
        }
    });


    socket.emit("getServerInfo", {id: UserManager.getID(), token: UserManager.getToken() }, function (response) {

        console.log(response);

        useCf = response.useCloudflareImageCDN;
        cfAccountId = response.cfAccountId;
        cfAccountToken = response.cfAccountToken;
        cfHash = response.cfHash;
        localUploadLimit = response.maxUploadStorage;

        setting_useLocalFs = document.getElementById("saveToLocalFileSystem");
        setting_localFsLimit = document.getElementById("localUploadLimit");
        setting_cfAccountId = document.getElementById("cfAccountId");
        setting_cfAccountToken = document.getElementById("cfAccountToken");
        setting_cfAccountHash = document.getElementById("cfAccountHash");
        saveButton = document.getElementById("settings_profile_save");

        // Use CDN?
        if(useCf == 1){
            setting_useLocalFs.checked = true;
        }
        else{
            setting_useLocalFs.checked = false;
        }

        // Max Local Storage in MB
        setting_localFsLimit.value = localUploadLimit;

        setting_cfAccountId.value = cfAccountId;
        setting_cfAccountToken.value = cfAccountToken;
        setting_cfAccountHash.value = cfHash;
    });
}

function isChecked(element){
    return element.checked ? 1 : 0;
}

function updatePreview(){

    try{

        // Username
        if(isChecked(setting_useLocalFs) != useCf ||
            setting_cfAccountId.value != cfAccountId ||
            setting_cfAccountHash.value != cfHash ||
            setting_cfAccountToken.value != cfAccountToken ||
            setting_localFsLimit.value != localUploadLimit

        ){
            console.log("Not same");
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

        socket.emit("saveMediaSettings", { id: UserManager.getID(), token: UserManager.getToken(), useCloudflare: isChecked(setting_useLocalFs),
                                        cloudflareAccountId: setting_cfAccountId.value,
                                        cloudflareAccountToken: setting_cfAccountToken.value,
                                        cloudflareHash: setting_cfAccountHash.value,
                                        maxLocalUpload: setting_localFsLimit.value
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
