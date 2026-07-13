export const permissionMiddleware = {
  name: "permission",
  priority: 100,
  enabled: true,
  async execute(ctx, next) {
    return next()
  }
}
