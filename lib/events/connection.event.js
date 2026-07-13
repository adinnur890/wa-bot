export const connectionEvent = {
  name: "connection",
  category: "connection",
  description: "Connection lifecycle event scaffolding",
  execute: async (payload, ctx) => payload
}

export function createConnectionEvent() {
  return { ...connectionEvent }
}
