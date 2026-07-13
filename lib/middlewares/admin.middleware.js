export const adminMiddleware = {
  name: "admin",
  priority: 30,
  enabled: true,
  async execute(ctx, next) {
    return next()
  }
}
