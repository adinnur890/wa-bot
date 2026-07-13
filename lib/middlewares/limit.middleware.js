export const limitMiddleware = {
  name: "limit",
  priority: 90,
  enabled: true,
  async execute(ctx, next) {
    return next()
  }
}
