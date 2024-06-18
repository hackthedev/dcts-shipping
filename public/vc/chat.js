console.log("%c" + "WAIT!", "color: #FF0000; -webkit-text-stroke: 2px black; font-size: 72px; font-weight: bold;");
console.log("%c" + "People can use the console to steal your account xo !", "color: #FF0000; -webkit-text-stroke: 0px black; font-size: 20px; font-weight: bold;");

// IMPORTANT! By default, socket.io() connects to the host that
// served the page, so we dont have to pass the server url
var socket = io.connect()



function addRoleFromProfile(userId){
    socket.emit("getAllRoles", {id:getID(), token: getToken(), group: getGroup(), targetUser: userId }, function (response) {


    });
}

socket.on('connect', () => {

    navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        .then((stream) => {

            var mediaRecorder = new MediaRecorder(stream);
            mediaRecorder.audioBitsPerSecond = 700;
            var audioChunks = [];
            var minTime = 500;

            mediaRecorder.start();
            setTimeout(function () {
                mediaRecorder.stop();
            }, minTime);

            mediaRecorder.addEventListener("dataavailable", function (event) {
                audioChunks.push(event.data);
            });

            mediaRecorder.addEventListener("stop", function () {

                mediaRecorder.start();
                setTimeout(function () {
                    mediaRecorder.stop();
                }, minTime);

                var audioBlob = new Blob(audioChunks);
                audioChunks = [];
                var fileReader = new FileReader();
                fileReader.readAsDataURL(audioBlob);
                fileReader.onloadend = function () {
                    var base64String = fileReader.result;
                    socket.emit("audioStream", base64String);
                };


            });


        })
        .catch((error) => {
            console.error('Error capturing audio.', error);
        });
});

socket.on('audioStream', (audioData) => {
    var newData = audioData.split(";");
    newData[0] = "data:audio/ogg;";
    newData = newData[0] + newData[1];

    var audio = new Audio(newData);
    if (!audio || document.hidden) {
        return;
    }
    audio.play();
});




function setCookie(name,value,days) {
    var expires = "";
    if (days) {
        var date = new Date();
        date.setTime(date.getTime() + (days*24*60*60*1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "")  + expires + "; path=/";
}
function getCookie(name) {
    var nameEQ = name + "=";
    var ca = document.cookie.split(';');
    for(var i=0;i < ca.length;i++) {
        var c = ca[i];
        while (c.charAt(0)==' ') c = c.substring(1,c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
    }
    return null;
}
function eraseCookie(name) {
    document.cookie = name +'=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
}