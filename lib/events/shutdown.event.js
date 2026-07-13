export const shutdownEvent = {
  name: "shutdown",
  category: "shutdown",
  description: "Shutdown lifecycle event scaffolding",
  execute: async (payload, ctx) => payload
}

export function createShutdownEvent() {
  return { ...shutdownEvent }
}
