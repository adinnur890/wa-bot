import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const LOG_DIR = path.resolve(__dirname, "../../logs")

const LEVELS = {
  INFO: "INFO",
  SUCCESS: "SUCCESS",
  WARNING: "WARNING",
  ERROR: "ERROR",
  DEBUG: "DEBUG"
}

const COLORS = {
  INFO: "\u001b[36m",
  SUCCESS: "\u001b[32m",
  WARNING: "\u001b[33m",
  ERROR: "\u001b[31m",
  DEBUG: "\u001b[35m",
  RESET: "\u001b[0m"
}

function ensureLogDirectory() {
  fs.mkdirSync(LOG_DIR, { recursive: true })
}

function getTodayFileName() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}.log`
}

function getLogFilePath() {
  ensureLogDirectory()
  return path.join(LOG_DIR, getTodayFileName())
}

function formatTimestamp(date = new Date()) {
  return date.toISOString()
}

function formatMessage(level, message, meta = {}) {
  const timestamp = formatTimestamp()
  const details = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : ""
  return `[${timestamp}] [${level}] ${message}${details}`
}

export class Logger {
  constructor(options = {}) {
    this.levels = options.levels || LEVELS
    this.consoleTransport = options.consoleTransport || null
    this.fileTransport = options.fileTransport || null
    this.prefix = options.prefix || "NOVA"
  }

  info(message, meta = {}) {
    this.write("INFO", message, meta)
  }

  success(message, meta = {}) {
    this.write("SUCCESS", message, meta)
  }

  warning(message, meta = {}) {
    this.write("WARNING", message, meta)
  }

  error(message, meta = {}) {
    this.write("ERROR", message, meta)
  }

  debug(message, meta = {}) {
    this.write("DEBUG", message, meta)
  }

  write(level, message, meta = {}) {
    const output = formatMessage(level, message, meta)
    if (this.consoleTransport) {
      this.consoleTransport.write(level, output, message, meta)
    }
    if (this.fileTransport) {
      this.fileTransport.write(level, output, message, meta)
    }
  }
}

export const logger = new Logger({
  consoleTransport: null,
  fileTransport: null
})

export function createLogger(options = {}) {
  return new Logger(options)
}

export function getLogDirectory() {
  ensureLogDirectory()
  return LOG_DIR
}
