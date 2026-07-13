import { bootstrap } from "./lib/bootstrap.js"

bootstrap().catch((err) => {
  console.error("Fatal error:", err)
  process.exit(1)
})
