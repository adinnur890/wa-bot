export const startupEvent = {
  name: "startup",
  category: "startup",
  description: "Startup lifecycle event scaffolding",
  execute: async (payload, ctx) => payload
}

export function createStartupEvent() {
  return { ...startupEvent }
}
