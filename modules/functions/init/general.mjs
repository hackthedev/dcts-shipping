export let debugmode = process.env.DEBUG === true || false;

export function flipDebug() {
    debugmode = !debugmode;
}