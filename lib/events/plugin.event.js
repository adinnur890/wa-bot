export const pluginEvent = {
  name: "plugin",
  category: "plugin",
  description: "Plugin lifecycle event scaffolding",
  execute: async (payload, ctx) => payload
}

export function createPluginEvent() {
  return { ...pluginEvent }
}
