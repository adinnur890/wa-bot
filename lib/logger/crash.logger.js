import { createLogger } from "./logger.js"
import { ConsoleTransport } from "./console.transport.js"
import { FileTransport } from "./file.transport.js"

export function createCrashLogger() {
  return createLogger({
    consoleTransport: new ConsoleTransport(),
    fileTransport: new FileTransport()
  })
}

export function attachCrashHandlers(logger) {
  process.on("uncaughtException", (error) => {
    logger.error("Unhandled exception", { message: error?.message || String(error), stack: error?.stack })
  })

  process.on("unhandledRejection", (reason) => {
    logger.error("Unhandled rejection", { reason: reason?.message || String(reason) })
  })
}
