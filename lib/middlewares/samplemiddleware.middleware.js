export const samplemiddlewareMiddleware = {
  name: "samplemiddleware",
  priority: 100,
  enabled: true,
  async execute(ctx, next) {
    return next()
  }
}
