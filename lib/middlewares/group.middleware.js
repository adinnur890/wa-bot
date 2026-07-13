export const groupMiddleware = {
  name: "group",
  priority: 40,
  enabled: true,
  async execute(ctx, next) {
    return next()
  }
}
