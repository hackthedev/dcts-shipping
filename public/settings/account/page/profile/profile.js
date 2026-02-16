var settings_username = document.getElementById("settings_profile_username");
var settings_loginName = document.getElementById("settings_profile_loginName");
var settings_status = document.getElementById("settings_profile_status");
var settings_aboutme = document.getElementById("settings_profile_aboutme");
var settings_icon = document.getElementById("settings_profile_icon");
var settings_banner = document.getElementById("settings_profile_banner");

var preview_username = document.getElementById("profile_username");
var preview_status = document.getElementById("profile_status");
var preview_aboutme = document.getElementById("profile_aboutme");
var preview_icon = document.getElementById("profile_icon");
var preview_banner = document.getElementById("profile_banner");
var saveButton = document.getElementById("settings_profile_save");

window.updatePreview = updatePreview;
window.saveSettings = saveSettings;
window.exportAccount = exportAccount;
window.importAccount = importAccount;
window.resetAccount = resetAccount;
window.handleUpload = handleUpload;

async function handleUpload(files, id) {
    try {
        // Ensure `files` is an array of `File` objects
        const fileArray = Array.isArray(files) ? files : Array.from(files);

        // Wait for the upload to complete
        const result = await upload(fileArray);

        if (id === "settings_profile_icon") {
            if (Array.isArray(result)) {
                result.urls.forEach((url, index) => {
                    console.log(`File ${index + 1} uploaded to: ${url}`);
                    settings_icon.value = url;
                });
            } else {
                console.log(`File uploaded to: ${result.urls}`);
                settings_icon.value = result.urls;
            }
            updatePreview("settings_profile_icon");
        } else if (id === "settings_profile_banner") {
            if (Array.isArray(result)) {
                result.urls.forEach((url, index) => {
                    console.log(`File ${index + 1} uploaded to: ${url}`);
                    settings_banner.value = url;
                });
            } else {
                console.log(`File uploaded to: ${result}`);
                console.log(result);
                settings_banner.value = result.urls;
            }
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

    socket.emit("exportAccount", { id: UserManager.getID(), token: UserManager.getToken(), }, async function (response) {
        console.log(response)

        if(response.account.icon.substring(0, 1).includes("/")){
            response.account.icon = await elementImageToBase64(preview_icon)
        }

        if(response.account.banner.substring(0, 1).includes("/")){
            response.account.banner = await elementImageToBase64(preview_banner)
        }

        await FileManager.saveFile(JSON.stringify(response.account, null, 4), "identity_" + UserManager.getUsername() + ".json")
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

            if (data?.icon) UserManager.setPFP(data.icon);
            if (data?.banner) UserManager.setBanner(data.banner);
            if (data?.displayName) UserManager.setUsername(data.displayName);
            if (data?.status) UserManager.setStatus(data.status);
            if (data?.aboutme) UserManager.setAboutme(data.aboutme);

            // refresh ui
            setPreview()
        }
        catch (err) {
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


    //const iconStyles = window.getComputedStyle(settings_icon);
    //const BannerStyles = window.getComputedStyle(settings_banner);

    // Icon
    try {
        if (settings_icon.value != null && settings_icon.value.length > 0) {
            UserManager.setPFP(settings_icon.value);
            console.log("Saved Icon");
            console.log(settings_icon.value);
        }

        // Banner
        if (settings_banner.value != null && settings_banner.value.length > 0) {
            UserManager.setBanner(settings_banner.value);
            console.log("Saved Banner");
            console.log(settings_banner.value);
        }

        // About me
        // no check so we can allow it to be null
        UserManager.setAboutme(settings_aboutme.value);
        console.log("Saved about me");


        // Username
        if (settings_username.value != null && settings_username.value.length >= 3) {
            UserManager.setUser(settings_username.value);
            console.log("Saved user");
        }

        // Status
        UserManager.setStatus(settings_status.value);
        console.log("Saved status");

        // About me
        if (settings_aboutme.value != null && settings_aboutme.value.length > 0) {
            UserManager.setAboutme(settings_aboutme.value);
            console.log("Saved about me");
        }

        saveButton.style.display = "none";
    }
    catch (error) {
        alert("Error while trying to save settings: " + error);
        return;
    }
}

function limitString(text, limit) {
    if(!text) return "";

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
            preview_icon.style.backgroundImage = `url("${newSetting}")`;
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
            console.log("NOt same");
            saveButton.style.display = "block";
        }
        else {
            console.log("same");
            saveButton.style.display = "none";
        }
    }
    catch (e) {
        console.log(e);
    }

}

setPreview();

function Sleep(milliseconds) {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
}
