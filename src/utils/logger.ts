import { WriteStream } from "fs"
import { stderr, stdout } from "process"

interface PrintOptions { 
    type: string, 
    color: number, 
    file?: NodeJS.WriteStream, 
}

class Logger {
    private useColors: boolean
    private exitOnError: boolean

    constructor(useColors, exitOnError) {
        this.useColors = useColors
        this.exitOnError = exitOnError
    }

    log(...args) {
        this.printLine({ type: "log", color: 32 }, args)
    }

    warn(...args) {
        this.printLine({ type: "warn", color: 33 }, args)
    }

    error(...args) {
        this.printLine({ type: "error", color: 31, file: stderr }, args)
    }

    private printLine(options: PrintOptions, ...args: (any)[]) {
        options = {
            ...options,
            file: options.file || stdout
        }

        if (this.useColors && options.file.isTTY) {
            const coloredType = `[\x1b[${options.color}m${options.type}\x1b[0m]`
            options.file.write(`${coloredType} ${args.join(" ")}\n`)
        }
        else 
            options.file.write(`[${options.type}] ${args.join(" ")}\n`)
    }
}

export { Logger }
