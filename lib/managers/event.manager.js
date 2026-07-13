export class EventManager {
  constructor(options = {}) {
    this.events = new Map()
    this.stats = new Map()
    this.logger = options.logger || console
    this.hooks = new Map([
      ["register", []],
      ["unregister", []],
      ["beforeEmit", []],
      ["afterEmit", []],
      ["error", []]
    ])
  }

  ensureStats(eventName) {
    if (!this.stats.has(eventName)) {
      this.stats.set(eventName, {
        registered: 0,
        emitted: 0,
        handled: 0,
        errors: 0,
        unregistered: 0
      })
    }
    return this.stats.get(eventName)
  }

  addHook(name, handler) {
    if (typeof handler !== "function") {
      throw new Error("Hook handler must be a function")
    }

    const list = this.hooks.get(name) || []
    list.push(handler)
    this.hooks.set(name, list)
    return this
  }

  removeHook(name, handler) {
    const list = this.hooks.get(name) || []
    const next = list.filter((entry) => entry !== handler)
    this.hooks.set(name, next)
    return this
  }

  async runHooks(name, payload, ctx = {}) {
    const list = this.hooks.get(name) || []
    for (const hook of list) {
      try {
        await hook(payload, ctx, this)
      } catch (error) {
        this.logger?.error?.(`Event hook failed: ${name}`, error)
      }
    }
  }

  register(eventName, handler, options = {}) {
    if (typeof eventName !== "string" || !eventName.trim()) {
      throw new Error("Event name must be a non-empty string")
    }

    if (typeof handler !== "function") {
      throw new Error("Event handler must be a function")
    }

    const entry = {
      id: `${eventName}:${Date.now()}:${Math.random().toString(16).slice(2)}`,
      eventName,
      handler,
      priority: options.priority ?? 100,
      once: Boolean(options.once),
      enabled: options.enabled !== false,
      scope: options.scope || "global",
      plugin: options.plugin || null,
      global: Boolean(options.global),
      context: options.context || {},
      async: options.async !== false
    }

    const listeners = this.events.get(eventName) || []
    listeners.push(entry)
    listeners.sort((a, b) => a.priority - b.priority)
    this.events.set(eventName, listeners)

    this.ensureStats(eventName).registered += 1
    this.runHooks("register", { eventName, entry }).catch(() => {})
    this.logger?.debug?.(`Registered event: ${eventName}`)
    return entry
  }

  on(eventName, handler, options = {}) {
    return this.register(eventName, handler, options)
  }

  once(eventName, handler, options = {}) {
    return this.register(eventName, handler, { ...options, once: true })
  }

  unregister(eventName, handler) {
    const listeners = this.events.get(eventName) || []
    const next = handler
      ? listeners.filter((entry) => entry.handler !== handler)
      : []

    if (handler) {
      this.events.set(eventName, next)
    } else {
      this.events.delete(eventName)
    }

    this.ensureStats(eventName).unregistered += 1
    this.runHooks("unregister", { eventName, handler }).catch(() => {})
    return this
  }

  off(eventName, handler) {
    return this.unregister(eventName, handler)
  }

  getListeners(eventName) {
    return (this.events.get(eventName) || []).filter((entry) => entry.enabled)
  }

  getEventNames() {
    return Array.from(this.events.keys())
  }

  getStats(eventName) {
    return this.ensureStats(eventName)
  }

  async emit(eventName, payload = {}, ctx = {}) {
    const listeners = this.getListeners(eventName)
    const stats = this.ensureStats(eventName)
    stats.emitted += 1

    await this.runHooks("beforeEmit", { eventName, payload, ctx, listeners })

    const results = []
    const matched = listeners.filter((entry) => {
      if (entry.scope === "plugin") {
        return Boolean(entry.plugin) && entry.plugin === ctx.plugin
      }

      if (entry.scope === "global") {
        return true
      }

      return entry.global || ctx.global === true
    })

    for (const entry of matched) {
      if (!entry.enabled) continue

      try {
        const result = entry.async === false
          ? entry.handler(payload, { ...ctx, eventName, entry })
          : await entry.handler(payload, { ...ctx, eventName, entry })

        results.push(result)
        stats.handled += 1

        if (entry.once) {
          this.unregister(eventName, entry.handler)
        }
      } catch (error) {
        stats.errors += 1
        this.logger?.error?.(`Event failed: ${eventName}`, error)
        await this.runHooks("error", { eventName, payload, ctx, entry, error })
        results.push({ error })
      }
    }

    await this.runHooks("afterEmit", { eventName, payload, ctx, results })
    return { eventName, results, listenerCount: matched.length }
  }
}

export function createEventManager(options = {}) {
  return new EventManager(options)
}
