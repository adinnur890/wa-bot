import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const LOG_DIR = path.resolve(__dirname, "../../logs")

function getTodayFileName() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}.log`
}

export class FileTransport {
  constructor(options = {}) {
    this.logDir = options.logDir || LOG_DIR
  }

  write(level, output, message, meta = {}) {
    try {
      fs.mkdirSync(this.logDir, { recursive: true })
      const filePath = path.join(this.logDir, getTodayFileName())
      fs.appendFileSync(filePath, `${output}\n`, "utf8")
    } catch {}
  }
}
