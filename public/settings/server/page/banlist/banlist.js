setupNotify();

var servername = document.getElementById("server_name");
var serverdescription = document.getElementById("server_description");
var saveButton = document.getElementById("settings_profile_save");

var serverconfigName;
var serverconfigDesc;

socket.emit("checkPermission", {id:getID(), token: getToken(), permission: "manageBans" }, function (response) {

    if(response.permission == "denied"){
        window.location.href = window.location.origin + "/settings/server";
    }
    else{
        document.getElementById("pagebody").style.display = "block";
    }
});

socket.emit("userConnected", { id: getID(), name: getUsername(), icon: getPFP(), status: getStatus(), token: getToken(),
    aboutme: getAboutme(), banner: getBanner()});

getBans();


// document.querySelector("#ban-reason-119012019689").innerText = "Fag"

function getBanObject(id){
    var user = bannedObj[id];

    document.querySelector("#ban-reason-" + id).innerHTML = "<i>Reason: " + user.reason + "</i>";
    document.querySelector("#ban-until-" + id).innerHTML = "<i>Banned Until: <i>" + new Date(user.until).toLocaleDateString() + "</i>";
    document.querySelector("#ban-by-" + id).innerHTML = "<i>Banned By: <i>" + user.bannedBy + " (click for info)</i>";
    document.querySelector("#ban-by-" + id).style.cursor = "pointer";

    document.querySelector("#ban-by-" + id).onclick = function()
    {
        socket.emit("resolveMember", {id:getID(), token: getToken(), target: user.bannedBy }, function (response) {
            notify("User was banned by " + response.data.name, "info", null, "normal");
        });
    };

    console.log(bannedObj[id]);
}

function unbanUser(id) {

    var username = document.querySelector(`#ban-username-${id}`).innerText.split(" ")[0];
    var container = document.querySelector(`#banned-id-${id}`);

    if (!confirm("Do you want to unban the user " + username + "?")){
        notify("Canceled unban", "info")
        return;
    }


    socket.emit("unbanUser", {id: getID(), token: getToken(), target: id}, function (response) {
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

var bannedObj = "";
function getBans() {
    var emojiContainer = document.getElementById("ban-container");

    socket.emit("getBans", { id:getID(), token: getToken() }, function (response1) {

        try {
            if (response1.type == "success") {
                //settings_icon.value = response.msg;
                emojiContainer.innerHTML = "";
                bannedObj = response1.data;
                console.log(response1)

                // For each banned member
                Object.keys(response1.data).forEach(bannedMember => {

                    // Resolve member
                    socket.emit("resolveMember", {id:getID(), token: getToken(), target: bannedMember }, function (response2) {

                        if (response2.type == "success") {
                            var user = response2.data;
                            console.log(user)

                            var code = `
                                        <div class="banned-entry-container" id="banned-id-${user.id}">
                                        
                                            <div class="banned-entry-img-containers">
                                                <div class="banned-entry-banner-container">
                                                    <div class="banned-entry-banner" style="background-image: url('${user.banner}');" ></div>
                                                </div>
                                            
                                                <div class="banned-entry-img-container">
                                                    <img class="banned-entry-icon" src="${user.icon}">
                                                </div>
                                            </div>
                                            
                                            <div class="banned-entry-info-container">                                        
                                                <h1 clas="banned-entry-username" id="ban-username-${user.id}">${user.name} (${user.id})</h1>
                                                <input type="button" onclick="getBanObject(${user.id})" value="Get Info"/>
                                                <input type="button" onclick="unbanUser(${user.id})" value="Unban"/>
                                                <p id="ban-reason-${user.id}"></p>
                                                <p id="ban-until-${user.id}"></p>
                                                <p id="ban-by-${user.id}"></p>
                                            </div>
                                        </div>
                                        
                                        `;

                            emojiContainer.insertAdjacentHTML("beforeend", code);
                        }
                        else{
                            notify(response2.msg, "error");
                        }
                    });
                });


                try{
                    var entries = document.querySelectorAll(".banned-entry-container");
                    console.log(entries)
                }
                catch(err){
                    console.log(err);
                }

            } else {
                alert(response1.msg)
            }
        }
        catch (Ex){
            console.log(Ex);
            notify("Unkown Error! Reloading might fix it", "error");
        }

    });
}