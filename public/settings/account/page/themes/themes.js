displayThemes();
document.querySelector("#accentPicker").addEventListener("change", function () {
    UserManager.setThemeAccent(this.value);
})

function updateColorPicker(){
    document.querySelector("#accentPicker").value = UserManager.getThemeAccent();
}

function showPredefinedAccentColors(){
    let accents = [
        "#131415",
        "#171A1D",
        "#181821",
        "#1c2126"
    ]

    let container = document.getElementById("predefined_accents");
    container.style.display = "flex";
    container.style.flexWrap = "wrap";
    container.style.flexDirection = "row";
    container.style.gap = "10px"

    accents.forEach(accent => {
        let color = document.createElement("div");
        color.style.width = "30px";
        color.style.height = "30px";
        color.style.border = "2px solid black";
        color.style.backgroundColor = `hsl(from ${accent} h s calc(l * 3))`;
        color.style.cursor = "pointer";
        color.addEventListener("click", function () {
            UserManager.setThemeAccent(accent);
            updateColorPicker()
        })

        container.appendChild(color);
    })
}

async function displayThemes() {
    document.querySelector("#accentPicker").value = UserManager.getThemeAccent();
    showPredefinedAccentColors();
}

async function getThemes() {
    return new Promise((resolve, reject) => {
        socket.emit("getThemes", {id: UserManager.getID(), token: UserManager.getToken()}, async function (response) {
            if (response.error === null) {
                resolve(response.themes);
            } else {
                reject(response.error);
            }
        });
    })
}