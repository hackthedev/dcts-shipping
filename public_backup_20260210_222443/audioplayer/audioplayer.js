function createAudioPlayerHTML(src) {
    const filename = src.split('/').pop().split("_").splice(2).join('_');

    return `
        <div class="audio-player" data-media-type="audio">
            <audio src="/proxy?url=${encodeURIComponent(src)}" ontimeupdate="updateTime(this)" onloadedmetadata="loadMetadata(this)" onplay="updatePlayPauseButton(this, true)" onpause="updatePlayPauseButton(this, false)"></audio>
            <div class="audio-info">
                <span class="audio-filename">${filename}</span>
            </div>
            <div class="controls">
                <button class="play-pause" onclick="togglePlayPause(this)">Play</button>
                <span class="current-time">00:00</span> / 
                <span class="total-time">00:00</span>
                <input type="range" class="seek-bar" value="0" oninput="seekAudio(this)">
                <button class="mute-unmute" onclick="toggleMuteUnmute(this)">Mute</button>
                <input type="range" class="volume-bar" value="100" oninput="changeVolume(this)">
            </div>
        </div>
    `;
}

window.togglePlayPause = function(button) {

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
};

window.toggleMuteUnmute = function(button) {
    const audio = button.parentElement.parentElement.querySelector('audio');
    audio.muted = !audio.muted;
    button.textContent = audio.muted ? 'Unmute' : 'Mute';
};

window.updateTime = function(audio) {
    const player = audio.parentElement;
    const currentTimeDisplay = player.querySelector('.current-time');
    const seekBar = player.querySelector('.seek-bar');

    const currentMinutes = Math.floor(audio.currentTime / 60);
    const currentSeconds = Math.floor(audio.currentTime % 60);
    currentTimeDisplay.textContent = `${String(currentMinutes).padStart(2, '0')}:${String(currentSeconds).padStart(2, '0')}`;

    seekBar.value = (audio.currentTime / audio.duration) * 100;
};

window.loadMetadata = function(audio) {
    const player = audio.parentElement;
    const totalTimeDisplay = player.querySelector('.total-time');

    const totalMinutes = Math.floor(audio.duration / 60);
    const totalSeconds = Math.floor(audio.duration % 60);
    totalTimeDisplay.textContent = `${String(totalMinutes).padStart(2, '0')}:${String(totalSeconds).padStart(2, '0')}`;
};

window.seekAudio = function(seekBar) {
    const audio = seekBar.parentElement.parentElement.querySelector('audio');
    const seekTime = (seekBar.value / 100) * audio.duration;
    audio.currentTime = seekTime;
};

window.changeVolume = function(volumeBar) {
    const audio = volumeBar.parentElement.parentElement.querySelector('audio');
    audio.volume = volumeBar.value / 100;
};

window.updatePlayPauseButton = function(audio, isPlaying) {
    const player = audio.parentElement;
    const playPauseButton = player.querySelector('.play-pause');
    playPauseButton.textContent = isPlaying ? 'Pause' : 'Play';
};