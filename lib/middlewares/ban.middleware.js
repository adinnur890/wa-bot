export const banMiddleware = {
  name: "ban",
  priority: 80,
  enabled: true,
  async execute(ctx, next) {
    return next()
  }
}
