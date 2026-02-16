function initAudioPlayerEvents(){
    ContextMenu.registerClickEvent(
        "audioplayer",
        [
            ".audio-player .play-pause",
        ],
        async (data) => {
            console.log(data)
            togglePlayPause(data.element)
        }
    )
}

function createAudioPlayerHTML(src) {
    const filename = src.split('/').pop().split("_").splice(2).join('_');
    return `
        <div class="audio-player">
            <p>${filename}</p>
            <audio
                controls
                preload="metadata"
                src="${ChatManager.proxyUrl(src)}">
            </audio>
        </div>
    `;
}


function togglePlayPause(button) {

    // get all playing player buttons and their player and stop em before starting a new one
    let playingButtons = document.querySelectorAll(".audio-player .playing")
    if(playingButtons){

        // for each currently playing audio
        playingButtons.forEach((playingButton) => {

            // if its not the current one
            if(playingButton !== button){

                // get the parent node to then get the audio element
                let parent = playingButton.parentElement.parentElement;
                let oldAudio = parent.querySelector('audio');

                // if its not paused, pause it and reset the track
                if(!oldAudio.paused) {
                    oldAudio.pause();
                    oldAudio.currentTime = 0;
                }
            }
        })
    }

    // then we continue with enabling the current player or pausing it
    const audio = button.parentElement.parentElement.querySelector('audio');
    if (audio.paused) {
        audio.play();
        button.textContent = 'Pause';
        button.classList.add('playing');
    } else {
        audio.pause();
        button.textContent = 'Play';
        button.classList.remove('playing');
    }
}

function toggleMuteUnmute(button) {
    const audio = button.parentElement.parentElement.querySelector('audio');
    audio.muted = !audio.muted;
    button.textContent = audio.muted ? 'Unmute' : 'Mute';
}

function updateTime(audio) {
    const player = audio.parentElement;
    const currentTimeDisplay = player.querySelector('.current-time');
    const seekBar = player.querySelector('.seek-bar');

    const currentMinutes = Math.floor(audio.currentTime / 60);
    const currentSeconds = Math.floor(audio.currentTime % 60);
    currentTimeDisplay.textContent = `${String(currentMinutes).padStart(2, '0')}:${String(currentSeconds).padStart(2, '0')}`;

    seekBar.value = (audio.currentTime / audio.duration) * 100;
}

function loadMetadata(audio) {
    const player = audio.parentElement;
    const totalTimeDisplay = player.querySelector('.total-time');

    const totalMinutes = Math.floor(audio.duration / 60);
    const totalSeconds = Math.floor(audio.duration % 60);
    totalTimeDisplay.textContent = `${String(totalMinutes).padStart(2, '0')}:${String(totalSeconds).padStart(2, '0')}`;
}

function seekAudio(seekBar) {
    const audio = seekBar.parentElement.parentElement.querySelector('audio');
    const seekTime = (seekBar.value / 100) * audio.duration;
    audio.currentTime = seekTime;
}

function changeVolume(volumeBar) {
    const audio = volumeBar.parentElement.parentElement.querySelector('audio');
    audio.volume = volumeBar.value / 100;
}

function updatePlayPauseButton(audio, isPlaying) {
    const player = audio.parentElement;
    const playPauseButton = player.querySelector('.play-pause');
    playPauseButton.textContent = isPlaying ? 'Pause' : 'Play';
}