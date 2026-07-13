import { createLogger } from "./logger.js"
import { ConsoleTransport } from "./console.transport.js"
import { FileTransport } from "./file.transport.js"

export function createStartupLogger() {
  return createLogger({
    consoleTransport: new ConsoleTransport(),
    fileTransport: new FileTransport()
  })
}

export function logStartupSummary(logger, summary = {}) {
  logger.info("Startup summary", summary)
  logger.success("Framework startup complete")
}
