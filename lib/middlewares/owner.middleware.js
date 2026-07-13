export const ownerMiddleware = {
  name: "owner",
  priority: 10,
  enabled: true,
  async execute(ctx, next) {
    return next()
  }
}
