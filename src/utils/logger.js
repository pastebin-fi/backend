const logger = {}

logger.log = function(...args) {
    console.log("[log]", args)
}

return logger