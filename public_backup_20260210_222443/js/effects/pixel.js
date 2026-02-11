function pixel(targetElement, sensitivity = 0.225) {
    const audioElement = document.getElementById("donatorAudio");
    if (!targetElement || !audioElement) return;

    targetElement.style.position = 'relative';
    targetElement.style.overflow = 'hidden';

    audioElement.crossOrigin = 'anonymous';

    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 64;

    const source = audioCtx.createMediaElementSource(audioElement);
    source.connect(analyser);
    analyser.connect(audioCtx.destination);

    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    let running = true;

    function createHeart(intensity = 1) {
        const heart = document.createElement('div');
        heart.innerText = '❤';
        const size = 8 + Math.random() * 8 * intensity;
        heart.style.position = 'absolute';
        heart.style.fontSize = `${size}px`;
        heart.style.left = Math.random() * 100 + '%';
        heart.style.top = '-20px';
        heart.style.color = `hsl(${Math.random() * 360}, 100%, ${50 + intensity * 40}%)`;
        heart.style.opacity = 0.5 + intensity * 0.5;
        heart.style.transition = 'top 2.5s linear, opacity 2.5s linear';
        heart.style.pointerEvents = 'none';

        targetElement.appendChild(heart);

        requestAnimationFrame(() => {
            heart.style.top = '120%';
            heart.style.opacity = 0;
        });

        setTimeout(() => heart.remove(), 2500);
    }

    function animate() {
        if (!running) return;

        analyser.getByteFrequencyData(dataArray);

        // Raw energy from all frequencies
        const totalEnergy = dataArray.reduce((a, b) => a + b, 0);
        const avgEnergy = totalEnergy / dataArray.length;

        // Normalize with sensitivity
        let intensity = (avgEnergy / 180) * sensitivity;
        intensity = Math.min(1, Math.max(0, intensity)); // Clamp 0–1

        // Spawn hearts depending on energy
        const spawnCount = Math.floor(intensity * 6);

        for (let i = 0; i < spawnCount; i++) {
            createHeart(intensity);
        }

        requestAnimationFrame(animate);
    }

    animate();

    return () => {
        running = false;
        targetElement.querySelectorAll('div').forEach(el => {
            if (el.innerText === '❤') el.remove();
        });
        try {
            source.disconnect();
            analyser.disconnect();
            audioCtx.close();
        } catch (err) {}
    };
}
