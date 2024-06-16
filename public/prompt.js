var promptBox;
var promptIcon;
var promptTitle;
var promptText;

var promptInputText;
var promptInputNumber;

var promptInputs;
var promptInputYes;
var promptInputNo;
var promptInputCancel;
var promptInputOk;

function closePrompt(){
    //promptBox.style.display = "none";


    promptBox.style.animation = "fadeout 0.5s";
    setTimeout(() => {
        promptBox.style.display = "none";
    }, "300");

    setTimeout(() => {
        promptInputs.style.display = "none";
        promptInputYes.style.display = "none";
        promptInputNo.style.display = "none";
        promptInputCancel.style.display = "none";
        promptInputOk.style.display = "none";
        promptInputText.style.display = "none";
        promptInputNumber.style.display = "none";
    }, "500");
}

function getElements(){
    promptBox = document.getElementById("prompt-container");
    promptIcon = document.getElementById("prompt-icon");
    promptTitle = document.getElementById("prompt-title");
    promptText = document.getElementById("prompt-text");

    promptInputText = document.getElementById("prompt-input-text");
    promptInputNumber = document.getElementById("prompt-input-number");

    promptInputs = document.getElementById("prompt-input-container");
    promptInputYes = document.getElementById("prompt-button-yes");
    promptInputNo = document.getElementById("prompt-button-no");
    promptInputCancel = document.getElementById("prompt-button-cancel");
    promptInputOk = document.getElementById("prompt-button-ok");
}

function setupPrompt(){
    var code =
        `
        <div id="prompt-container" style="display: none;">
            <div id="prompt-content-container">
                <div id="prompt-img-container">
                    <img id="prompt-icon" onerror="this.src='/img/error.png';"
                         src="">
                </div>
        
        
                <div id="prompt-text-container">
                    <h1 id="prompt-title">Oh yikes!</h1><br>
                    <p id="prompt-text" style="margin-top: 0;padding-top: 0;">
                        You've found a easter egg :0
                    </p><br>
        
                    <div id="prompt-input-container" style="display: none;">
                        <input id="prompt-input-text" style="display: none;" type="text"/>
                        <input id="prompt-input-number" style="display: none;" type="number"/>
                        <button id="prompt-button-ok" style="display: none;">Ok</button>
                        <button id="prompt-button-cancel" style="display: none;">Cancel</button>
                        <button id="prompt-button-yes" style="display: none;">Yes</button>
                        <button id="prompt-button-no" style="display: none;">No</button>
                    </div>
                </div>
            </div>
        </div>
        `;
    document.body.insertAdjacentHTML("beforeend", code);

    getElements();
}

var promptPromise;
async function Confirm(title, text, icon, button, type) {
    getElements();

    promptBox.style.display = "block";
    promptBox.style.animation = "fadein 0.5s";

    promptTitle.innerHTML = title.replaceAll("#", "<br>");;
    promptText.innerHTML = text.replaceAll("#", "<br>");
    promptButtonClick = null;

    var withText = false;
    var withNumber = false;
    var confirming = false;

    if(type == null){
        console.log("Couldnt show confirmation box because the type was null");
    }

    promptIcon.src = "/img/" + icon + ".png";
    promptIcon.onerror = () => {
        promptIcon.src = "/img/error.png";
    }

    if (Array.isArray(type) == true) {
        type.forEach(input => {
            if (input == "text") {
                promptInputText.style.display = "block";
                withNumber = true;
            }
            if (input == "number") {
                withNumber = true;
                promptInputNumber.style.display = "block";
            }
            if (input == "confirm") {
                confirming = true;
            }
        });
    } else {
        if (type == "text") {
            withText = true;
            promptInputText.style.display = "block";
        } else if (type == "number") {
            withNumber = true;
            promptInputNumber.style.display = "block";
        }
        else if (type == "confirm") {
            confirming = true;
        }
    }

    var executionCode = "";
    if (Array.isArray(button) == true) {

        var firstRun = true;
        button.forEach(key => {

            if(key[1] == null || key[1].length == 0){
                key[1] = "closePrompt();";
            }

            if (key[0] == "yes") {
                promptInputs.style.display = "block";
                promptInputYes.style.display = "block";

                promptInputYes.onclick = function(){ promptPromise("yes"); eval(key[1]) };

            }
            else if (key[0] == "no") {
                promptInputs.style.display = "block";
                promptInputNo.style.display = "block";
                promptInputNo.onclick = function(){ promptPromise("no"); eval(key[1]) };
            }
            else if (key[0] == "cancel") {
                promptInputs.style.display = "block";
                promptInputCancel.style.display = "block";
                promptInputCancel.onclick = function(){ promptPromise("cancel"); eval(key[1]) };
            }
            else if (key[0] == "ok") {
                promptInputs.style.display = "block";
                promptInputOk.style.display = "block";

                promptInputOk.onclick = function(){ promptPromise("ok"); eval(key[1]) };
            }
            else {

                if(firstRun == true){
                    promptInputs.innerHTML = "";
                    firstRun = false;
                }

                var token = "B" + generateId(8);
                promptInputs.innerHTML += `<button id="${token}">${key[0]}</button>`;
                promptInputs.style.display = "block";

                document.getElementById(token).onclick = function(){ promptPromise("ok"); eval(key[1]) };

                /*
                promptInputs.style.display = "block";
                promptInputOk.style.display = "block";
                promptInputOk.innerText = key[0];

                promptInputOk.onclick = function(){ promptPromise("ok"); eval(key[1]) };

                 */
            }
            console.log(key);
        });
    }
    else{
        console.log("Button has to be 2 dimentional array")
        return;
    }

    // Magic
    // Waits for button press or until promptPromise() is called with value.
    var promise = new Promise((resolve) => { promptPromise = resolve });
    await promise.then((result) => { btnRes = result });

    console.log("Button Result was " + btnRes)
    closePrompt();

    if(confirming == true){
        if(btnRes == "yes"){
            return true;
        }
        else if(btnRes == "no"){
            return false;
        }
        else if(btnRes == "ok"){
            return true;
        }
        else if(btnRes == "cancel"){
            return null
        }
    }
}