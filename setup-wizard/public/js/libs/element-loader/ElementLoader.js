class ElementLoader {
    static instances = new Map();

    static start(element, {
        style = "linear",
        color = "#f1f1f1",
        height = 2,
        gap = 2,
        speed = 2,
        barWidth = null,
        value = null,
        duration = null,
        mode = "auto"
    } = {}) {
        if (!element) return;
        this.stop(element);

        const computed = getComputedStyle(element);

        const original = {
            position: element.style.position
        };

        if (computed.position === "static") {
            element.style.position = "relative";
        }

        const clip = document.createElement("div");
        clip.style.position = "absolute";
        clip.style.left = "0";
        clip.style.right = "0";
        clip.style.bottom = "0";
        clip.style.height = height + "px";
        clip.style.pointerEvents = "none";
        clip.style.overflow = "hidden";

        const bar = document.createElement("div");
        bar.style.position = "absolute";
        bar.style.left = "0";
        bar.style.top = "0";
        bar.style.height = "100%";
        bar.style.background = color;
        bar.style.willChange = "width,left";

        clip.appendChild(bar);
        element.appendChild(clip);

        const inst = {
            bar,
            clip,
            raf: null,
            value,
            duration,
            startTime: null,
            original
        };

        if (style === "linear") {
            bar.style.width = "0px";

            const step = (t) => {
                if (!document.body.contains(element)) {
                    ElementLoader.stop(element);
                    return;
                }

                const w = clip.clientWidth;

                if (inst.value !== null) {
                    bar.style.width = (w * Math.max(0, Math.min(100, inst.value)) / 100) + "px";
                } else if (inst.duration !== null) {
                    if (!inst.startTime) inst.startTime = t;
                    const p = Math.min((t - inst.startTime) / inst.duration, 1);
                    bar.style.width = (w * p) + "px";
                } else {
                    let bw = bar.offsetWidth + speed;
                    if (bw > w) bw = 0;
                    bar.style.width = bw + "px";
                }

                inst.raf = requestAnimationFrame(step);
            };

            inst.raf = requestAnimationFrame(step);
        }

        if (style === "marquee" || style === "slide") {
            let barPx =
                typeof barWidth === "string"
                    ? clip.clientWidth * (parseFloat(barWidth) / 100)
                    : (barWidth ?? clip.clientWidth * 0.2);

            bar.style.width = barPx + "px";

            let pos = style === "slide" ? -barPx : 0;
            let dir = 1;

            const step = () => {
                if (!document.body.contains(element)) {
                    ElementLoader.stop(element);
                    return;
                }

                const max = clip.clientWidth - barPx;
                pos += speed * dir;

                if (style === "marquee") {
                    if (pos >= max) dir = -1;
                    if (pos <= 0) dir = 1;
                    pos = Math.max(0, Math.min(max, pos));
                } else {
                    if (pos > clip.clientWidth) pos = -barPx;
                }

                bar.style.left = pos + "px";
                inst.raf = requestAnimationFrame(step);
            };

            inst.raf = requestAnimationFrame(step);
        }

        this.instances.set(element, inst);
    }

    static setValue(element, value) {
        const inst = this.instances.get(element);
        if (!inst) return;
        inst.value = value;
    }

    static stop(element) {
        const inst = this.instances.get(element);
        if (!inst) return;

        cancelAnimationFrame(inst.raf);

        try { inst.clip.remove(); } catch {}

        element.style.position = inst.original.position;

        this.instances.delete(element);
    }
}