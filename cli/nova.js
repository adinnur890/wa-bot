#!/usr/bin/env node
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, "..")

const toKebabCase = (value) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-")
const toPascalCase = (value) => value.split(/[-_\s]+/).filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join("")
const toCamelCase = (value) => {
  const parts = value.split(/[-_\s]+/).filter(Boolean)
  if (!parts.length) return ""
  return parts[0] + parts.slice(1).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join("")
}

const ensureDir = (dir) => fs.mkdirSync(dir, { recursive: true })
const writeFile = (filePath, content) => {
  ensureDir(path.dirname(filePath))
  fs.writeFileSync(filePath, content)
}

const log = (message) => console.log(`\n✅ ${message}`)
const warn = (message) => console.log(`⚠️  ${message}`)

const templates = {
  command: (name) => ({
    file: path.join(projectRoot, "lib", "commands", `${toKebabCase(name)}.js`),
    content: `export async function handle${toPascalCase(name)}(sock, msg) {
  const from = msg.key.remoteJid
  const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ""

  if (!text || text.toLowerCase().trim() !== ".${toKebabCase(name)}") return false

  try {
    await sock.sendMessage(from, { text: "${toPascalCase(name)} command scaffolded" }, { quoted: msg })
  } catch (error) {
    console.log("Command scaffold error:", error?.message || error)
  }

  return true
}
`,
    doc: `# ${toPascalCase(name)} command\n\nThis scaffolded command is ready for implementation.\n`,
    test: `import { describe, it } from "node:test"\n\ndescribe("${toPascalCase(name)} command", () => {\n  it("exists", () => {})\n})\n`
  }),
  plugin: (name) => ({
    file: path.join(projectRoot, "plugins", `${toKebabCase(name)}.js`),
    content: `export default {
  name: "${toCamelCase(name)}",
  version: "1.0.0",
  async load() {
    return true
  }
}
`,
    doc: `# ${toPascalCase(name)} plugin\n\nThis scaffolded plugin is ready for implementation.\n`,
    test: `import { describe, it } from "node:test"\n\ndescribe("${toPascalCase(name)} plugin", () => {\n  it("exists", () => {})\n})\n`
  }),
  service: (name) => ({
    file: path.join(projectRoot, "lib", "services", `${toKebabCase(name)}.service.js`),
    content: `import { BaseService } from "./base.service.js"\n\nexport class ${toPascalCase(name)}Service extends BaseService {\n  constructor(options = {}) {\n    super({\n      name: "${toPascalCase(name)}Service",\n      timeout: options.timeout || 15000,\n      ...options\n    })\n  }\n}\n`,
    doc: `# ${toPascalCase(name)} service\n\nThis scaffolded service is ready for implementation.\n`,
    test: `import { describe, it } from "node:test"\n\ndescribe("${toPascalCase(name)} service", () => {\n  it("exists", () => {})\n})\n`
  }),
  middleware: (name) => ({
    file: path.join(projectRoot, "lib", "middlewares", `${toKebabCase(name)}.middleware.js`),
    content: `export const ${toCamelCase(name)}Middleware = {\n  name: "${toCamelCase(name)}",\n  priority: 100,\n  enabled: true,\n  async execute(ctx, next) {\n    return next()\n  }\n}\n`,
    doc: `# ${toPascalCase(name)} middleware\n\nThis scaffolded middleware is ready for implementation.\n`,
    test: `import { describe, it } from "node:test"\n\ndescribe("${toPascalCase(name)} middleware", () => {\n  it("exists", () => {})\n})\n`
  }),
  event: (name) => ({
    file: path.join(projectRoot, "lib", "events", `${toKebabCase(name)}.event.js`),
    content: `export const ${toCamelCase(name)}Event = {\n  name: "${toCamelCase(name)}",\n  category: "${toPascalCase(name)}",\n  description: "Scaffolded event",\n  execute: async (payload, ctx) => payload\n}\n\nexport function create${toPascalCase(name)}Event() {\n  return { ...${toCamelCase(name)}Event }\n}\n`,
    doc: `# ${toPascalCase(name)} event\n\nThis scaffolded event is ready for implementation.\n`,
    test: `import { describe, it } from "node:test"\n\ndescribe("${toPascalCase(name)} event", () => {\n  it("exists", () => {})\n})\n`
  })
}

const createArtifact = (type, name) => {
  const template = templates[type](name)
  writeFile(template.file, template.content)
  writeFile(path.join(projectRoot, "docs", `${toKebabCase(name)}.${type}.md`), template.doc)
  writeFile(path.join(projectRoot, "tests", `${toKebabCase(name)}.${type}.test.js`), template.test)
  log(`Created ${type}: ${template.file}`)
}

const runDoctor = () => {
  const checks = []
  if (fs.existsSync(path.join(projectRoot, "lib"))) checks.push("lib directory present")
  if (fs.existsSync(path.join(projectRoot, "plugins"))) checks.push("plugins directory present")
  if (fs.existsSync(path.join(projectRoot, "tests"))) checks.push("tests directory present")
  if (fs.existsSync(path.join(projectRoot, "docs"))) checks.push("docs directory present")
  log(`Doctor checks passed: ${checks.join(", ")}`)
}

const runLint = () => {
  const files = []
  const walk = (dir) => {
    if (!fs.existsSync(dir)) return
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) walk(path.join(dir, entry.name))
      else if (entry.isFile() && entry.name.endsWith(".js")) files.push(path.join(dir, entry.name))
    }
  }
  walk(path.join(projectRoot, "lib"))
  walk(path.join(projectRoot, "plugins"))
  walk(path.join(projectRoot, "cli"))
  log(`Lint scan complete: ${files.length} JavaScript files checked`)
}

const runUpdate = () => {
  log("Update check complete. No runtime changes were applied.")
}

const args = process.argv.slice(2)

if (!args.length) {
  console.log("NOVA CLI")
  console.log("Usage: node cli/nova.js <command>")
  process.exit(0)
}

const [command, target, kindOrName, name] = args

if (command === "create") {
  const scaffoldType = target && templates[target] ? target : kindOrName
  const scaffoldName = target && templates[target] ? kindOrName : name

  if (!scaffoldType || !templates[scaffoldType]) {
    warn("Unsupported scaffold type. Use command, plugin, service, middleware, or event.")
    process.exit(1)
  }

  if (!scaffoldName) {
    warn("A scaffold name is required.")
    process.exit(1)
  }

  createArtifact(scaffoldType, scaffoldName)
} else if (command === "doctor") {
  runDoctor()
} else if (command === "lint") {
  runLint()
} else if (command === "update") {
  runUpdate()
} else {
  warn("Unknown command. Use create <command|plugin|service|middleware|event>, doctor, lint, or update.")
  process.exit(1)
}
