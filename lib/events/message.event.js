export const messageEvent = {
  name: "message",
  category: "message",
  description: "Message lifecycle event scaffolding",
  execute: async (payload, ctx) => payload
}

export function createMessageEvent() {
  return { ...messageEvent }
}
