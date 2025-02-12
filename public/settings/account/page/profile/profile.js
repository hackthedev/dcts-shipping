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
    var reset = confirm("Do you really want to reset your account? EVERYTHING will be reset.")

    if (reset) {
        CookieManager.setCookie("id", null, 365);
        CookieManager.setCookie("username", null, 365);
        CookieManager.setCookie("status", null, 365);
        CookieManager.setCookie("pfp", null, 365);
        CookieManager.setCookie("token", null, 365);
        CookieManager.setCookie("banner", null, 365);

        alert("Your account has been reset. Please refresh the page if you want to continue");
    }
}

function setPreview() {
    preview_icon.style.backgroundImage = `url("${UserManager.getPFP()}")`;
    preview_banner.style.backgroundImage = `url("${UserManager.getBanner()}")`;

    settings_username.value = `${limitString(UserManager.getUsername(), 30)}`;
    settings_status.value = `${limitString(UserManager.getStatus(), 100)}`;
    settings_aboutme.innerText = `${limitString(UserManager.getAboutme(), 500)}`;

    settings_icon.value = `${UserManager.getPFP()}`;
    settings_banner.value = `${UserManager.getBanner()}`;

    preview_username.innerHTML = `<h2>${limitString(UserManager.getUsername(), 30)}</h2>`;
    preview_status.innerText = `${limitString(UserManager.getStatus(), 100)}`;
    preview_aboutme.innerText = `${limitString(UserManager.getAboutme(), 500)}`;
    settings_loginName.value = `${limitString(UserManager.getLoginName(), 500)}`;


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
        if (settings_aboutme.value != null && settings_aboutme.value.length > 0) {
            UserManager.setAboutme(settings_aboutme.value);
            console.log("Saved about me");
        }


        // Username
        if (settings_username.value != null && settings_username.value.length >= 3) {
            UserManager.setUser(settings_username.value);
            console.log("Saved user");
        }

        // Status
        if (settings_status.value != null && settings_status.value.length > 0) {
            UserManager.setStatus(settings_status.value);
            console.log("Saved status");
        }

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
    if (text.length <= limit) return text.substring(0, limit);
    else return text.substring(0, limit) + "...";
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
            preview_aboutme.innerHTML = `${newSetting}`;
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
