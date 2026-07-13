export const maintenanceMiddleware = {
  name: "maintenance",
  priority: 70,
  enabled: true,
  async execute(ctx, next) {
    return next()
  }
}
