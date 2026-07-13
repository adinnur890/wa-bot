export const premiumMiddleware = {
  name: "premium",
  priority: 20,
  enabled: true,
  async execute(ctx, next) {
    return next()
  }
}
