var notifyBoxTimeout;
var notifyBoxTimeoutHide;
function notify(text, icon, duration = 4000, sound = null, reload = null){
    var notifyBox = document.getElementById("notification-container");
    var notifyTitle = document.getElementById("notification-container-title");
    var notifyIcon = document.getElementById("notification-container-icon");

    // Disable fade in out stuff
    clearTimeout(notifyBoxTimeout);
    clearTimeout(notifyBoxTimeoutHide);

    notifyBox.style.animation = "fadein 1s";
    notifyTitle.innerText = text

    notifyIcon.src = "/img/" + icon + ".png";
    notifyIcon.onerror = () => {
        notifyIcon.src = "/img/error.png";
    }

    if(duration == null){
        duration = 4000;
    }

    if(sound != null){
        playSound(sound)
    }

    if(icon == "error"){
        notifyBox.style.backgroundColor = "tomato";
        notifyBox.style.color = "white";
        notifyBox.style.color = "white";
    }
    else if(icon == "success"){
        notifyBox.style.backgroundColor = "#1EDC49";
        notifyBox.style.color = "white";
    }
    else if(icon == "warning"){
        notifyBox.style.backgroundColor = "#E9B31C";
        notifyBox.style.color = "white";
    }
    else{
        notifyBox.style.backgroundColor = "#202225";
        notifyBox.style.color = "white";
    }

    notifyBox.style.display = "block";

    notifyBoxTimeout = setTimeout(() => {
        notifyBox.style.animation = "fadeout 1s";

        notifyBoxTimeoutHide = setTimeout(() => {
            notifyBox.style.display = "none";


            if(reload != null){
                window.location.reload()
            }
        }, "800");
    }, duration);
}

var audio = new Audio();
function playSound(sound, volume = 0.1){
    audio.src = `/sounds/${sound}.mp3`;
    audio.volume = volume;
    audio.play();
}

function setupNotify(){
    var code = `<style>
        #notification-container{
            float: right;
            position: fixed;
    
            right: 0;
            top: 0;
    
            z-index: 9999999;
            width: fit-content;
            display: table;
            height: fit-content;
    
            padding: 0px 16px 0px 8px !important;
            margin: 24px 24px 0 0 !important;
    
            background-color: #202225;
            color: #ABB8BE;
    
            border: 1px solid #677073;
            border-radius: 8px;
            animation: fadein 1s;
        }
    
        tr, th, td, table{
            margin: 0 !important;
            padding-top: 0 !important;
            padding-bottom: 0 !important; 
        }
    
        #notification-container tr{
            float: left;
        }
    
        #notification-container img{
            width: 35px;
            height: 35px;
            float: left;
            margin-right: 4px;
        }
    
        @keyframes fadein {
            from { opacity: 0; }
            to   { opacity: 1; }
        }
    
        @keyframes fadeout {
            from { opacity: 1; }
            to   { opacity: 0; }
        }
    
    </style>
    <div id="notification-container" style="display: none;">
    
        <table>
            <tr>
                <th><img id="notification-container-icon" src="/img/error.png"></th>
                <th><p id="notification-container-title">Data Successfully Saved</p></th>
            </tr>
        </table>
    </div>`;

    document.body.insertAdjacentHTML("beforeend", code);

}


/*

<style>
    #notification-container{
        float: right;
        position: fixed;

        right: 0;
        top: 0;

        z-index: 99999;
        width: fit-content;
        display: table;
        height: 5%;

        padding: 0px 16px 10px 8px;
        margin: 24px 24px 0 0;

        background-color: #202225;

        border-radius: 8px;
        animation: fadein 1s;
    }

    #notification-container tr{
        float: left;
    }

    #notification-container img{
        width: 35px;
        height: 35px;
        float: left;
        margin-right: 4px;
    }

    @keyframes fadein {
        from { opacity: 0; }
        to   { opacity: 1; }
    }

    @keyframes fadeout {
        from { opacity: 1; }
        to   { opacity: 0; }
    }

</style>
<div id="notification-container" style="display: none;">

    <table>
        <tr>
            <th><img id="notification-container-icon" src="/img/error.png"></th>
            <th><p id="notification-container-title">Data Successfully Saved</p></th>
        </tr>
    </table>
</div>

 */