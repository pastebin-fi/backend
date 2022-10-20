import { WriteStream } from "fs"
import { stderr, stdout } from "process"

interface PrintOptions { 
    type: string, 
    color: number, 
    endsInNewline?: boolean,
    file?: NodeJS.WriteStream, 
}

class Logger {
    private useColors: boolean
    private exitOnError: boolean
    private lastBeginWidth: number

    constructor(useColors, exitOnError) {
        this.useColors = useColors
        this.exitOnError = exitOnError
    }

    logBegin(...args) {
        this.printLine({ type: "log", color: 32, endsInNewline: false }, args)
        this.lastBeginWidth = args.join(" ").length
    }

    log(...args) {
        let emptyspaces = []
        for (let i = args.join(" ").length; i < this.lastBeginWidth; i++) emptyspaces.push(' ')
        
        this.printLine({ type: "log", color: 32 }, args, emptyspaces.join(''))
        this.lastBeginWidth = 0
    }

    warn(...args) {
        this.printLine({ type: "warn", color: 33 }, args)
    }

    error(...args) {
        this.printLine({ type: "error", color: 31, file: stderr }, args)
        if (this.exitOnError) process.exit(1)
    }

    private printLine(options: PrintOptions, ...args: (any)[]) {
        options = {
            ...options,
            endsInNewline: options.endsInNewline == null ? true : options.endsInNewline,
            file: options.file || stdout
        }

        if (this.useColors && options.file.isTTY) {
            const coloredType = `[\x1b[${options.color}m${options.type}\x1b[0m]`
            options.file.write(`${coloredType} ${args.join(" ")}\r${options.endsInNewline ? '\n' : ''}`)
        }
        else 
            options.file.write(`[${options.type}] ${args.join(" ")}\r${options.endsInNewline ? '\n' : ''}`)
    }
}

export { Logger }
