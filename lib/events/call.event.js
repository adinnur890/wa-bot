export const callEvent = {
  name: "call",
  category: "call",
  description: "Call lifecycle event scaffolding",
  execute: async (payload, ctx) => payload
}

export function createCallEvent() {
  return { ...callEvent }
}
