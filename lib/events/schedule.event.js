export const scheduleEvent = {
  name: "schedule",
  category: "schedule",
  description: "Schedule lifecycle event scaffolding",
  execute: async (payload, ctx) => payload
}

export function createScheduleEvent() {
  return { ...scheduleEvent }
}
