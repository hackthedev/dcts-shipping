document.addEventListener("pagechange", e => {
    console.log(e.detail.page);
    if (e.detail.page !== "banlist") return;

    initBanList();
});


function initBanList(){
    setupNotify();
    socket.emit("checkPermission", {id: UserManager.getID(), token: UserManager.getToken(), permission: "manageBans" }, function (response) {

        if(response.permission == "denied"){
            window.location.href = window.location.origin + "/settings/server";
        }
        else{
            document.getElementById("pagebody").style.display = "block";
        }
    });

    getBans();

}

var servername = document.getElementById("server_name");
var serverdescription = document.getElementById("server_description");
var saveButton = document.getElementById("settings_profile_save");

var serverconfigName;
var serverconfigDesc;



// document.querySelector("#ban-reason-119012019689").innerText = "Fag"


function unbanUser(id) {

    var username = document.querySelector(`#ban-username-${id}`).innerText.split(" ")[0];
    var container = document.querySelector(`[data-member-id="banned-${id}"]`);

    if (!confirm("Do you want to unban the user " + username + "?")){
        notify("Canceled unban", "info")
        return;
    }


    socket.emit("unbanUser", {id: UserManager.getID(), token: UserManager.getToken(), target: id}, function (response) {
        //notify("User was banned by " + response.data.name, "info", null, "normal");
        if(response.type == "success"){
            notify(response.msg, "success");
            container.remove();
        }
        else{
            notify(response.msg, "error");
            console.log(response.data)
        }
    });


}

function getBans() {
    var emojiContainer = document.getElementById("settings_banlist_container");

    socket.emit("getBans", { id: UserManager.getID(), token: UserManager.getToken() }, function (response1) {
        try {
            if (response1.type == "success") {
                emojiContainer.innerHTML = ""; // Clear previous entries

                const bannedObj = response1.data;

                // Create the table structure
                let table = `
                    <table class="settings_banlist_table">
                        <thead>
                            <tr>
                                <th>User</th>
                                <th>Status</th>
                                <th>Reason</th>
                                <th>Duration</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                `;

                // Add rows for each banned user
                Object.keys(bannedObj).forEach((bannedUserId, index) => {
                    const banData = bannedObj[bannedUserId];
                    const rowClass = index % 2 === 0 ? "settings_banlist_even_row" : "settings_banlist_odd_row";

                    table += `
                        <tr class="${rowClass}" data-member-id="banned-${banData.bannedUserObj.id}">
                            <td>
                                <div class="settings_banlist_user_info">
                                    <img class="settings_banlist_user_icon" src="${banData.bannedUserObj.icon}" alt="User Icon">
                                    <span id="ban-username-${banData.bannedUserObj.id}">${banData.bannedUserObj.name} (${banData.bannedUserObj.id})</span>
                                </div>
                            </td>
                            <td>${banData.bannedUserObj.status || "No Status"}</td>
                            <td>${banData.reason}</td>
                            <td>${getReadableDuration(banData.until)}</td>
                            <td>
                                <button class="settings_banlist_unban_button" onclick="unbanUser('${bannedUserId}')">Unban</button>
                                <button class="settings_banlist_details_button" onclick="toggleDetails('${bannedUserId}')">Details</button>
                            </td>
                        </tr>
                        <tr class="settings_banlist_details_row ${rowClass}" id="settings_banlist_details_${bannedUserId}">
                            <td colspan="5">
                                <div class="settings_banlist_details_content ${rowClass}">
                                    <p><strong>Banned By:</strong> ${banData.bannedModObj.name} (${banData.bannedModObj.id})</p>
                                    <p><strong>Reason:</strong> ${banData.reason}</p>
                                    <p><strong>IP Address:</strong> ${banData.ip}</p>
                                </div>
                            </td>
                        </tr>
                    `;
                });
                

                // Close the table
                table += `
                        </tbody>
                    </table>
                `;

                // Add it to the html
                emojiContainer.insertAdjacentHTML("beforeend", table);
            } else {
                alert(response1.msg);
            }
        } catch (ex) {
            console.log(ex);
            notify("Unknown Error! Reloading might fix it", "error");
        }
    });
}

function toggleDetails(userId) {
    const detailsRow = document.getElementById(`settings_banlist_details_${userId}`);
    const content = detailsRow.querySelector(".settings_banlist_details_content");

    if (detailsRow.style.display === "none" || !detailsRow.style.display) {
        detailsRow.style.display = "table-row";
        content.style.maxHeight = content.scrollHeight + "px";
    } else {
        content.style.maxHeight = "0px";
        setTimeout(() => {
            detailsRow.style.display = "none";
        }, 300); // Match animation duration
    }
}

function getReadableDuration(untilTimestamp) {
    const remainingTime = untilTimestamp - Date.now();
    if (remainingTime <= 0) return "Expired";

    const seconds = Math.floor(remainingTime / 1000) % 60;
    const minutes = Math.floor(remainingTime / (1000 * 60)) % 60;
    const hours = Math.floor(remainingTime / (1000 * 60 * 60)) % 24;
    const days = Math.floor(remainingTime / (1000 * 60 * 60 * 24));

    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}
