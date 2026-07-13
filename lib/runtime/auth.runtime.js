import fs from "fs"
import readline from "readline"

const question = (prompt) => new Promise((resolve) => {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  rl.question(prompt, (ans) => { rl.close(); resolve(ans.trim()) })
})

export function createAuthRuntime() {
  return {
    question,
    ensureAuthDir() {
      try {
        fs.mkdirSync("./auth", { recursive: true })
      } catch {}
    }
  }
}
