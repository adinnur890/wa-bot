export const groupEvent = {
  name: "group",
  category: "group",
  description: "Group lifecycle event scaffolding",
  execute: async (payload, ctx) => payload
}

export function createGroupEvent() {
  return { ...groupEvent }
}
