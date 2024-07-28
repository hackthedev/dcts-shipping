class AudioBufferQueue {
    constructor(audioContext, bufferSize = 4096, bufferCount = 3) {
        this.audioContext = audioContext;
        this.bufferSize = bufferSize;
        this.bufferCount = bufferCount;
        this.buffers = [];
        this.currentBufferIndex = 0;
        this.playbackNode = null;
    }

    pushBuffer(audioBuffer) {
        if (this.buffers.length < this.bufferCount) {
            this.buffers.push(audioBuffer);
            if (this.buffers.length === 1) {
                this.playNextBuffer(); // Start playing immediately if this is the first buffer
            }
        }
    }

    playNextBuffer() {
        if (this.buffers.length === 0) {
            console.log('Buffer underflow: No audio data available');
            return;
        }

        const bufferToPlay = this.buffers.shift();
        const audioBufferSource = this.audioContext.createBufferSource();
        audioBufferSource.buffer = bufferToPlay;
        audioBufferSource.connect(this.audioContext.destination);
        audioBufferSource.onended = () => this.playNextBuffer();
        audioBufferSource.start();
    }
}