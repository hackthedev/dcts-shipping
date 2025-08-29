function partyEffect(targetElement, spawnInterval = 70) {
    if (!targetElement) {
        console.error('No target element provided for party effect.');
        return;
    }

    targetElement.style.position = 'relative';
    targetElement.style.overflow = 'hidden';

    function createLaserStrike() {
        const laser = document.createElement('div');
        laser.classList.add('party-laser');

        const color = `hsl(${Math.random() * 360}, 100%, 60%)`;

        // 🎶 Decide if it's a normal or fat laser
        const isFatLaser = Math.random() < 1; // 15% chance to spawn a FAT one

        const thickness = isFatLaser ? (Math.random() * 10 + 8) : (Math.random() * 1 + 1); 
        const length = isFatLaser ? (Math.random() * 200 + 200) * 4 : (Math.random() * 100 + 100) * 4;

        laser.style.position = 'absolute';
        laser.style.width = `${length}px`;
        laser.style.height = `${thickness}px`;
        laser.style.background = `linear-gradient(to right, white, ${color}, white)`;
        laser.style.boxShadow = `0 0 8px ${color}, 0 0 16px ${color}, 0 0 24px ${color}`;
        laser.style.left = Math.random() * 80 + '%';
        laser.style.top = Math.random() * 80 + '%';
        laser.style.opacity = 1;
        laser.style.transform = `rotate(${Math.random() * 360}deg)`;
        laser.style.pointerEvents = 'none';
        laser.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out';

        targetElement.appendChild(laser);

        requestAnimationFrame(() => {
            laser.style.opacity = 0;
            laser.style.transform += ` scaleX(1.5) scaleY(0.5)`;
        });

        setTimeout(() => {
            laser.remove();
        }, isFatLaser ? 600 : 400); // fat ones last a bit longer
    }

    const intervalId = setInterval(() => {
        const burst = Math.random() < 0.7 ? 1 : 3; 
        for (let i = 0; i < burst; i++) {
            createLaserStrike();
        }
    }, spawnInterval);

    return function stopPartyEffect() {
        clearInterval(intervalId);
        const lasers = targetElement.querySelectorAll('.party-laser');
        lasers.forEach(l => l.remove());
    };
}
