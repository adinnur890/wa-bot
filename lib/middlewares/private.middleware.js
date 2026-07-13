export const privateMiddleware = {
  name: "private",
  priority: 50,
  enabled: true,
  async execute(ctx, next) {
    return next()
  }
}
