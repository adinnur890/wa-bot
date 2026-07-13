export function createPluginManager() {
  let state = {
    loaded: [],
    errors: [],
    warnings: []
  }

  return {
    setState(newState) {
      state = {
        loaded: Array.isArray(newState.loaded) ? newState.loaded.slice() : [],
        errors: Array.isArray(newState.errors) ? newState.errors.slice() : [],
        warnings: Array.isArray(newState.warnings) ? newState.warnings.slice() : []
      }
    },
    getState() {
      return { ...state }
    }
  }
}
