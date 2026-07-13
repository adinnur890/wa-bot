import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT_DIR = path.resolve(__dirname, "../../")

export class ConfigManager {
  constructor(options = {}) {
    this.rootDir = options.rootDir || ROOT_DIR
    this.env = options.env || process.env
    this.cache = new Map()
    this.validators = new Map()
    this.defaults = {}
  }

  registerSchema(key, validator, defaultValue) {
    this.validators.set(key, validator)
    if (arguments.length >= 3) {
      this.defaults[key] = defaultValue
    }
  }

  load() {
    const config = {}
    for (const [key, value] of Object.entries(this.defaults)) {
      config[key] = value
    }
    this.cache.clear()
    this.cache.set("__config__", config)
    return this.getAll()
  }

  getAll() {
    return this.cache.get("__config__") || this.load()
  }

  get(key, fallback) {
    const config = this.getAll()
    const value = this.resolvePath(config, key)
    return value ?? fallback ?? this.resolvePath(this.defaults, key)
  }

  set(key, value) {
    const config = this.getAll()
    this.assignPath(config, key, value)
    this.cache.set("__config__", config)
    return config
  }

  resolvePath(source, pathKey) {
    if (!pathKey) return undefined
    return String(pathKey)
      .split(".")
      .reduce((acc, part) => (acc && typeof acc === "object" ? acc[part] : undefined), source)
  }

  assignPath(source, pathKey, value) {
    const parts = String(pathKey).split(".")
    let cursor = source
    for (let i = 0; i < parts.length - 1; i += 1) {
      const part = parts[i]
      if (!cursor[part] || typeof cursor[part] !== "object") {
        cursor[part] = {}
      }
      cursor = cursor[part]
    }
    cursor[parts[parts.length - 1]] = value
  }

  validate(key, value) {
    const validator = this.validators.get(key)
    if (!validator) return { valid: true, value }
    const result = validator(value)
    return typeof result === "boolean" ? { valid: result, value } : result
  }

  reload() {
    return this.load()
  }
}

export function createConfigManager(options = {}) {
  return new ConfigManager(options)
}
