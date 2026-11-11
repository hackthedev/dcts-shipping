document.addEventListener("pagechange", e => {
    console.log(e.detail.page);
    if (e.detail.page !== "general") return;

    renderGeneralAppSettings();
});

let clientSettings = ChatManager.Settings.getOptions()
let originalSettings = structuredClone(clientSettings);

function saveSetting(setting, value){
    ChatManager.Settings.set(setting, value);
    originalSettings = clientSettings;

}

async function renderGeneralAppSettings(){
    let settingsContainer = document.querySelector(".general-app-settings");
    settingsContainer.innerHTML = "";

    for(let key in clientSettings){
        let option = clientSettings[key];
        settingsContainer.insertAdjacentElement("beforeend",
            JsonEditor.getSettingElement(
                option.value,
                option.title,
                option?.description ?? "",
                v => {
                    option.value = v;
                    if (checkJsonChanges(clientSettings, originalSettings)) {
                        JsonEditor.showSaveButton(key, async () => {
                            saveSetting(key, v)
                        })
                    }
                }
            )
        );
    }
}