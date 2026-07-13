export class MiddlewareManager {
  constructor(options = {}) {
    this.middlewares = new Map()
    this.globalMiddlewares = []
    this.categoryMiddlewares = new Map()
    this.commandMiddlewares = new Map()
    this.pluginMiddlewares = new Map()
    this.disabled = new Set()
    this.logger = options.logger || console
  }

  register(middleware) {
    if (!middleware || !middleware.name) {
      throw new Error("Middleware must expose a name")
    }

    const entry = {
      name: middleware.name,
      priority: middleware.priority ?? 100,
      enabled: middleware.enabled !== false,
      execute: middleware.execute.bind(middleware)
    }

    this.middlewares.set(entry.name, entry)
    return entry
  }

  disable(name) {
    this.disabled.add(name)
  }

  enable(name) {
    this.disabled.delete(name)
  }

  addGlobal(name) {
    if (!this.globalMiddlewares.includes(name)) {
      this.globalMiddlewares.push(name)
    }
  }

  addCategoryMiddleware(category, name) {
    const list = this.categoryMiddlewares.get(category) || []
    if (!list.includes(name)) {
      list.push(name)
      this.categoryMiddlewares.set(category, list)
    }
  }

  addCommandMiddleware(command, name) {
    const list = this.commandMiddlewares.get(command) || []
    if (!list.includes(name)) {
      list.push(name)
      this.commandMiddlewares.set(command, list)
    }
  }

  addPluginMiddleware(plugin, name) {
    const list = this.pluginMiddlewares.get(plugin) || []
    if (!list.includes(name)) {
      list.push(name)
      this.pluginMiddlewares.set(plugin, list)
    }
  }

  buildPipeline(ctx = {}) {
    const names = []
    const seen = new Set()

    const append = (name) => {
      if (!name || seen.has(name)) return
      seen.add(name)
      names.push(name)
    }

    for (const name of this.globalMiddlewares) append(name)
    for (const name of this.categoryMiddlewares.get(ctx.category) || []) append(name)
    for (const name of this.commandMiddlewares.get(ctx.command) || []) append(name)
    for (const name of this.pluginMiddlewares.get(ctx.plugin) || []) append(name)

    if (Array.isArray(ctx.middlewares)) {
      for (const name of ctx.middlewares) append(name)
    }

    return names
      .map((name) => this.middlewares.get(name))
      .filter(Boolean)
      .filter((middleware) => middleware.enabled && !this.disabled.has(middleware.name))
      .sort((a, b) => a.priority - b.priority)
  }

  async run(ctx = {}, next = async () => true) {
    const pipeline = this.buildPipeline(ctx)
    let index = -1

    const dispatch = async (i) => {
      if (i <= index) return
      const middleware = pipeline[i]
      if (!middleware) return next()
      try {
        return await middleware.execute(ctx, async () => dispatch(i + 1))
      } catch (error) {
        this.logger?.error?.(`Middleware failed: ${middleware.name}`, error)
        return false
      }
    }

    return dispatch(0)
  }
}

export function createMiddlewareManager(options = {}) {
  return new MiddlewareManager(options)
}
