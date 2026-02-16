class SplashScreen {
    constructor(targetElement, {
        lineColor = "rgba(255,255,255,0.9)",
        backgroundColor = "rgba(0,0,0,0.5)"
    } = {}) {
        this.target = targetElement;
        this.overlay = null;
        this.canvas = null;
        this.ctx = null;
        this.animationId = null;
        this.time = 0;
        this.lineColor = lineColor;
        this.backgroundColor = backgroundColor;
    }

    create() {
        const overlay = document.createElement("div");
        overlay.classList.add("splash-overlay");
        overlay.style.background = this.backgroundColor;

        const canvas = document.createElement("canvas");
        overlay.appendChild(canvas);

        this.target.style.position = "relative";
        this.target.appendChild(overlay);

        this.overlay = overlay;
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");

        this.resize();
        window.addEventListener("resize", () => this.resize());
    }

    resize() {
        const rect = this.target.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
    }

    drawWave(radius, phase, color, width, amplitude, speed, glow = 25) {
        const ctx = this.ctx;
        const cx = this.canvas.width / 2;
        const cy = this.canvas.height / 2;
        const steps = 140;

        ctx.beginPath();
        for (let i = 0; i <= steps; i++) {
            const angle = (i / steps) * Math.PI * 2;
            const offset = Math.sin(angle * 3 + this.time * speed + phase) * amplitude;
            const r = radius + offset;
            const x = cx + Math.cos(angle) * r;
            const y = cy + Math.sin(angle) * r;
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }

        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.shadowColor = color;
        ctx.shadowBlur = glow;
        ctx.stroke();
        ctx.shadowBlur = 0;
    }

    animate() {
        const ctx = this.ctx;
        const { width, height } = this.canvas;
        ctx.clearRect(0, 0, width, height);

        this.time += 0.03;

        const base = Math.min(width, height) * 0.25;
        const main = this.lineColor;

        for (let i = 3; i > 0; i--) {
            const fade = i / 3;
            const col = main.replace(/[\d.]+\)$/g, `${0.2 * fade})`);
            this.drawWave(base, i * 0.6, col, 2, 10 * fade, 1 + i * 0.1, 20 * fade);
        }

        this.drawWave(base, 0, main, 3.5, 12, 1.1, 45);

        this.animationId = requestAnimationFrame(() => this.animate());
    }

    show() {
        if (!this.overlay) this.create();
        this.overlay.style.display = "flex";
        this.overlay.style.opacity = "1";
        cancelAnimationFrame(this.animationId);
        this.time = 0;
        this.animate();
    }

    hide(duration = 1200) {
        if (!this.overlay) return;
        this.overlay.style.transition = `opacity ${duration}ms ease`;
        this.overlay.style.opacity = "0";

        setTimeout(() => {
            cancelAnimationFrame(this.animationId);
            if (this.overlay) this.overlay.style.display = "none";
            this.overlay.style.transition = "";
            this.overlay.style.opacity = "1";
        }, duration);
    }

    destroy() {
        cancelAnimationFrame(this.animationId);
        if (this.overlay) this.overlay.remove();
    }
}

const style = document.createElement("style");
style.textContent = `
.splash-overlay {
    position: absolute;
    inset: 0;
    display: none;
    justify-content: center;
    align-items: center;
    backdrop-filter: blur(14px);
    z-index: 999;
    opacity: 1;
    transition: opacity 0.6s ease;
}
.splash-overlay canvas {
    width: 100%;
    height: 100%;
}
`;
document.head.appendChild(style);
