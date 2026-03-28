function showHome(override = null) {
    if (!ChatManager.isPopupShown("homeScreen") && !override === true) {
        ChatManager.openPagePopup("homeScreen", "/home/");
    } else {
        ChatManager.closePagePopup("homeScreen")
    }

    displayHomeUnread()
}
