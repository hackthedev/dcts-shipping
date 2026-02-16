function holyParticles(targetElement, spawnInterval = 120, baseColor = { h: 45, s: 80, l: 65 }) {
    if (!targetElement) return;

    targetElement.style.position = 'relative';
    targetElement.style.overflow = 'hidden';

    function spawn() {
        const p = document.createElement('div');
        p.classList.add('holy-particle');
        p.style.position = 'absolute';
        p.style.width = Math.random() * 3 + 2 + 'px';
        p.style.height = Math.random() * 20 + 10 + 'px';
        p.style.left = Math.random() * 100 + '%';
        p.style.top = '-20px';
        p.style.opacity = 0.6;
        p.style.borderRadius = '2px';
        p.style.pointerEvents = 'none';

        // gold / warm glow
        const hue = baseColor.h + (Math.random() * 10 - 5);

        p.style.background =
            `linear-gradient(to bottom,
                hsla(${hue},${baseColor.s}%,${baseColor.l + 10}%,0.9),
                hsla(${hue},${baseColor.s}%,${baseColor.l - 10}%,0.2)
            )`;

        p.style.boxShadow =
            `0 0 ${Math.random()*6+3}px hsla(${hue},${baseColor.s}%,${baseColor.l + 10}%,0.8)`;

        p.style.transform = `scale(${Math.random()*0.4 + 0.8})`;
        p.style.transition = 'top 3.5s linear, opacity 3.5s linear, transform 3.5s ease-out';

        targetElement.appendChild(p);

        requestAnimationFrame(() => {
            const drift = Math.random() * 40 - 20;
            p.style.top = '120%';
            p.style.opacity = 0;
            p.style.transform = `translateX(${drift}px) scale(${Math.random()*0.6 + 1})`;
        });

        setTimeout(() => p.remove(), 3600);
    }

    const id = setInterval(spawn, spawnInterval);

    return function stop() {
        clearInterval(id);
        targetElement.querySelectorAll('.holy-particle').forEach(p => p.remove());
    };
}
