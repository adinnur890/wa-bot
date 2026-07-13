import { fileURLToPath } from "url"

const COLORS = {
  INFO: "\u001b[36m",
  SUCCESS: "\u001b[32m",
  WARNING: "\u001b[33m",
  ERROR: "\u001b[31m",
  DEBUG: "\u001b[35m",
  RESET: "\u001b[0m"
}

export class ConsoleTransport {
  write(level, output, message, meta = {}) {
    const color = COLORS[level] || COLORS.INFO
    const text = `${color}[${level}]${COLORS.RESET} ${message}`
    if (level === "ERROR") {
      console.error(text, meta)
    } else if (level === "WARNING") {
      console.warn(text, meta)
    } else {
      console.log(text, meta)
    }
  }
}
