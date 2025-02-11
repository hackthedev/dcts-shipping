/*
    Author: HackTheDev
*/
class ModActions{
    static unmuteUser(id) {
        socket.emit("unmuteUser", { id: UserManager.getID(), token: UserManager.getToken(), target: id }, function (response) {
            showSystemMessage({
                title: response.msg,
                text: "",
                icon: response.type,
                img: null,
                type: response.type,
                duration: 1000
            });
        });
    }
    
    static banUser(id, afterSubmitAction = null) {
    
        customPrompts.showPrompt(
            "Ban User",
            `
            <div class="prompt-form-group">
                <label class="prompt-label" for="banReason">Reason (optional)</label>
                <input class="prompt-input" id="tt_banUserDialog_banReason" type="text" name="banReason">
            </div>
    
            <div class="prompt-form-group">
                <label class="prompt-label" for="banDurationType">Ban Duration Type</label>            
                <input class="prompt-input" type="number" id="tt_banUserDialog_banDurationNumber" min="0" step="1" name="banDurationNumber" placeholder="Number in days, e.g. 7">
                
                <select class="prompt-input prompt-select" id="tt_banUserDialog_banDurationType" name="banDurationType">
                    <option value="seconds">Seconds</option>
                    <option value="minutes">Minutes</option>
                    <option value="hours">Hours</option>
                    <option default selected value="days">Days</option>
                    <option value="weeks">Weeks</option>
                    <option value="months">Months</option>
                    <option value="perma">Permanent</option>
                </select>
            </div>
    
            `,
            (values) => {
                console.log('Submitted Values:', values);
    
                let banReason = values.banReason;
                let banDuration = `${Math.floor(values.banDurationNumber)} ${values.banDurationType}`
    
                socket.emit("banUser", {
                    id: UserManager.getID(),
                    token: UserManager.getToken(),
                    target: id,
                    reason: banReason,
                    duration: banDuration
                }, function (response) {
                    showSystemMessage({
                        title: response.msg,
                        text: "",
                        icon: response.type,
                        img: null,
                        type: response.type,
                        duration: 1000
                    });
                });
            },
            ["Ban", "error"],
            false,
            250,
            () => {
                tooltipSystem.clearTooltipLocalStorage("tt_banUserDialog_");
                banUserTooltip();
            },
            afterSubmitAction
        );
    }

    static kickUser(id, afterSubmitAction = null) {
        customPrompts.showPrompt(
            "Kick User",
            `
            <div class="prompt-form-group">
                <label class="prompt-label" for="kickReason">Reason (optional)</label>
                <input class="prompt-input" id="tt_kickUserDialog_kickReason" type="text" name="kickReason">
            </div>
            `,
            (values) => {                
                let kickReason = values.kickReason || "No reason provided";
    
                // Default kick action
                socket.emit("kickUser", {
                    id: UserManager.getID(),
                    token: UserManager.getToken(),
                    target: id,
                    reason: kickReason
                });
            },
            ["Kick", "error"],
            false,
            null,
            null,  // No help function
            afterSubmitAction // This ensures the afterSubmitAction is called
        );
    }
    
    
    static muteUser(id, afterSubmitAction = null) {
        //var reason = prompt("Reason: (empty for none)");
        //var duration = prompt("Duration in minutes: (empty for permanent until unmuted)");
        //socket.emit("muteUser", { id: UserManager.getID(), token: UserManager.getToken(), target: id, reason: reason, time: duration });
    
    
        customPrompts.showPrompt(
            "Mute User",
            `
            <div class="prompt-form-group">
                <label class="prompt-label" for="muteReason">Reason (optional)</label>
                <input class="prompt-input" id="tt_muteUserDialog_muteReason" type="text" name="muteReason">
            </div>
    
            <div class="prompt-form-group">
                <label class="prompt-label" for="muteDurationType">Mute Duration Type</label>            
                <input class="prompt-input" type="number" id="tt_muteUserDialog_muteDurationNumber" min="0" step="1" name="muteDurationNumber" placeholder="Number in minutes, e.g. 10">
                
                <select class="prompt-input prompt-select" id="tt_muteUserDialog_muteDurationType" name="muteDurationType">
                    <option value="seconds">Seconds</option>
                    <option value="minutes">Minutes</option>
                    <option value="hours">Hours</option>
                    <option default selected value="days">Days</option>
                    <option value="weeks">Weeks</option>
                    <option value="months">Months</option>
                    <option value="perma">Permanent</option>
                </select>
            </div>
    
            `,
            (values) => {
                console.log('Submitted Values:', values);
    
                let muteReason = values.muteReason;
                let muteDuration = `${Math.floor(values.muteDurationNumber)} ${values.muteDurationType}`
    
                socket.emit("muteUser", {
                    id: UserManager.getID(),
                    token: UserManager.getToken(),
                    target: id,
                    reason: muteReason,
                    time: muteDuration
                }, function (response) {
                    showSystemMessage({
                        title: response.msg,
                        text: "",
                        icon: response.type,
                        img: null,
                        type: response.type,
                        duration: 1000
                    });
                });
            },
            ["Mute", "error"],
            false,
            250,
            () => {
                tooltipSystem.clearTooltipLocalStorage("tt_mutenUserDialog_");
                muteUserTooltip();
            },
            afterSubmitAction
        );
    }

    static addRoleFromProfile(userId) {
        socket.emit("getAllRoles", { id: UserManager.getID(), token: UserManager.getToken(), group: UserManager.getGroup(), targetUser: userId }, function (response) {
    
            var roleList = document.getElementById("profile-role-menu").querySelector("#role-menu-list");
            roleList.innerHTML = "";
    
            var roles = response.data
            Object.keys(roles).forEach(function (role) {
    
                var roleObj = roles[role]
    
                var roleId = roleObj.info.id;
                var roleName = roleObj.info.name;
                var roleColor = roleObj.info.color;
                var hasRole = roleObj.info.hasRole;
    
                var displayChecked = "";
                if (hasRole == 1) {
                    displayChecked = "checked";
                }
                else {
                    displayChecked = "";
                }
    
                roleList.insertAdjacentHTML("beforeend", `<div class="role-menu-entry" onclick="ModActions.checkCheckedRoleMenu(this.querySelector('input'))">
                            <input type="checkbox" ${displayChecked} class="role-menu-entry-checkbox" id="role-menu-entry_${roleId}_${userId}" onclick="ModActions.checkCheckedRoleMenu(this)">
                            <label style="color: ${roleColor};" class="role-menu-entry-roleName">${roleName}</label>
                        </div>`)
            });
    
        });
    }
    
    static checkCheckedRoleMenu(element) {
        socket.emit("checkPermission", { id: UserManager.getID(), token: UserManager.getToken(), permission: "manageMembers" }, function (response) {
            if (response.permission == "granted") {
                element.checked = !element.checked;
                var roleId = element.id.split("_")[1];
                var userId = element.id.split("_")[2];
    
                if (element.checked == true) {
                    // Assign role
                    socket.emit("addUserToRole", { id: UserManager.getID(), token: UserManager.getToken(), role: roleId, target: userId }, function (response) {
    
                        if (response.type != "success") {
                            showSystemMessage({
                                title: response.msg,
                                text: "",
                                icon: response.type,
                                img: null,
                                type: response.type,
                                duration: 1000
                            });
                        }
                    });
                }
                else {
                    // Remove role
                    socket.emit("removeUserFromRole", { id: UserManager.getID(), token: UserManager.getToken(), role: roleId, target: userId }, function (response) {
                        if (response.type != "success") {
                            showSystemMessage({
                                title: response.msg,
                                text: "",
                                icon: response.type,
                                img: null,
                                type: response.type,
                                duration: 1000
                            });
                        }
                    });
                }
            }
        });
    }

    static showRoleMenu(mouseX, mouseY) {
        var roleMenu = document.getElementById("profile-role-menu");
        roleMenu.style.display = "block"
        roleMenu.style.top = `${mouseY - roleMenu.offsetHeight}px`
        roleMenu.style.left = `${mouseX - roleMenu.offsetWidth - 20}px`;
    }
    
    static hideRoleMenu() {
        var roleMenu = document.getElementById("profile-role-menu");
        roleMenu.style.display = "none"
    }
}