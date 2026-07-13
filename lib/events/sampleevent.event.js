export const sampleeventEvent = {
  name: "sampleevent",
  category: "Sampleevent",
  description: "Scaffolded event",
  execute: async (payload, ctx) => payload
}

export function createSampleeventEvent() {
  return { ...sampleeventEvent }
}
