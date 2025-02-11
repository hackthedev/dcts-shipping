class Logger {
    static colors = {
        reset: "\x1b[0m",
        bright: "\x1b[1m",
        dim: "\x1b[2m",
        underscore: "\x1b[4m",
        blink: "\x1b[5m",
        reverse: "\x1b[7m",
        hidden: "\x1b[8m",

        fgBlack: "\x1b[30m",
        fgRed: "\x1b[31m",
        fgGreen: "\x1b[32m",
        fgYellow: "\x1b[33m",
        fgBlue: "\x1b[34m",
        fgMagenta: "\x1b[35m",
        fgCyan: "\x1b[36m",
        fgWhite: "\x1b[37m",
        fgGray: "\x1b[90m",

        bgBlack: "\x1b[40m",
        bgRed: "\x1b[41m",
        bgGreen: "\x1b[42m",
        bgYellow: "\x1b[43m",
        bgBlue: "\x1b[44m",
        bgMagenta: "\x1b[45m",
        bgCyan: "\x1b[46m",
        bgWhite: "\x1b[47m"
    };

    static log(level, message, color) {
        if (message instanceof Error) {
            console.log(`${color}${Logger.displayDate()}[${level}] ${message.message}\n${message.stack}${Logger.colors.reset}`);
        } else if (typeof message === 'object') {
            console.log(`${color}${Logger.displayDate()}[${level}] ${JSON.stringify(message, null, 2)}${Logger.colors.reset}`);
        } else {
            console.log(`${color}${Logger.displayDate()}[${level}] ${message}${Logger.colors.reset}`);
        }
    }

    static info(message, color = "") {
        Logger.log("INFO", message, color ? color + Logger.colors.fgCyan : Logger.colors.fgCyan);
    }

    static success(message, color = "") {
        Logger.log("SUCCESS", message, color ? color + Logger.colors.fgGreen : Logger.colors.fgGreen);
    }

    static warn(message, color = "") {
        Logger.log("WARN", message, color ? color + Logger.colors.fgYellow : Logger.colors.fgYellow);
    }

    static error(message, color = "") {
        Logger.log("ERROR", message, color ? color + Logger.colors.fgRed : Logger.colors.fgRed);
    }

    static debug(message, color = "") {
        Logger.log("DEBUG", message, color ? color + Logger.colors.bright + Logger.colors.fgBlack : Logger.colors.bright + Logger.colors.fgBlack);
    }

    static displayDate() {
        const today = new Date();
        const date = today.getFullYear() + '-' + (today.getMonth() + 1).toString().padStart(2, '0') + '-' + today.getDate().toString().padStart(2, '0');
        const time = today.getHours().toString().padStart(2, '0') + ":" + today.getMinutes().toString().padStart(2, '0') + ":" + today.getSeconds().toString().padStart(2, '0');
        return `[${date} ${time}] `;
    }
}

export default Logger;
