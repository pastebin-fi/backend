class Logger {
    constructor(useColors, exitOnError) {
        this.useColors = useColors
        this.exitOnError = exitOnError
    }

    log(...args) {
        this.#printLine("log", 32, args)
    }

    warn(...args) {
        this.#printLine("warn", 33, args)
    }

    error(...args) {
        this.#printLine("error", 31, args)
        if (this.exitOnError) process.exit(1)
    }

    #printLine(type, color, ...args) {
        if (this.useColors) {
            console.log(`(\x1b[${color}m${type}\x1b[0m)`, args.join(" "))
        } else console.log(`(${type})`, args.join(" "))
    }
}

export { Logger }
