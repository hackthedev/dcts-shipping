function confetti(targetElement, spawnInterval = 100) {
    if (!targetElement) {
        console.error('No target element provided for confetti rain.');
        return;
    }

    targetElement.style.position = 'relative';
    targetElement.style.overflow = 'hidden';

    function createConfettiPiece() {
        const confetti = document.createElement('div');
        confetti.classList.add('confetti-piece'); // Add a class for easier removal
        confetti.style.position = 'absolute';
        confetti.style.width = Math.random() * 6 + 4 + 'px';
        confetti.style.height = Math.random() * 6 + 4 + 'px';
        confetti.style.backgroundColor = `hsl(${Math.random() * 360}, 70%, 60%)`;
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.top = '-10px';
        confetti.style.opacity = 0.7;
        confetti.style.transform = `rotate(${Math.random() * 360}deg)`;
        confetti.style.borderRadius = Math.random() > 0.5 ? '50%' : '0%';
        confetti.style.pointerEvents = 'none';
        confetti.style.transition = 'top 3s linear, transform 3s linear';

        targetElement.appendChild(confetti);

        requestAnimationFrame(() => {
            confetti.style.top = '110%';
            confetti.style.transform = `rotate(${Math.random() * 720}deg)`;
        });

        setTimeout(() => {
            confetti.remove();
        }, 3000);
    }

    const intervalId = setInterval(createConfettiPiece, spawnInterval);

    // 🧹 Return a stop function
    return function stopConfettiRain() {
        clearInterval(intervalId);

        const confettiPieces = targetElement.querySelectorAll('.confetti-piece');
        confettiPieces.forEach(piece => piece.remove());
    };
}