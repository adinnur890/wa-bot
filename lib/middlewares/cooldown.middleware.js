export const cooldownMiddleware = {
  name: "cooldown",
  priority: 60,
  enabled: true,
  async execute(ctx, next) {
    return next()
  }
}
