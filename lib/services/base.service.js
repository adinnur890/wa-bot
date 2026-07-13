import crypto from "crypto"

export class BaseService {
  constructor(options = {}) {
    this.name = options.name || this.constructor.name
    this.baseURL = options.baseURL || ""
    this.timeout = options.timeout || 15000
    this.retries = options.retries ?? 2
    this.retryDelay = options.retryDelay || 300
    this.logger = options.logger || console
    this.apiKey = options.apiKey || ""
    this.headers = options.headers || {}
    this.cache = options.cache || new Map()
    this.rateLimiter = options.rateLimiter || null
    this.defaultParams = options.defaultParams || {}
  }

  getAuthHeaders() {
    const headers = { ...this.headers }
    if (this.apiKey) {
      headers.Authorization = headers.Authorization || `Bearer ${this.apiKey}`
    }
    return headers
  }

  async request(url, options = {}) {
    const method = (options.method || "GET").toUpperCase()
    const timeout = options.timeout || this.timeout
    const retries = options.retries ?? this.retries
    const headers = {
      ...this.getAuthHeaders(),
      ...(options.headers || {})
    }

    const attemptRequest = async (attempt) => {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      try {
        this.log("debug", `${this.name} -> ${method} ${url}`, { attempt })
        const response = await fetch(url, {
          method,
          headers,
          body: options.body,
          signal: controller.signal,
          ...options.fetchOptions
        })
        clearTimeout(timeoutId)

        const text = await response.text()
        const parsed = this.parseResponse(text, response)

        if (!response.ok) {
          throw new Error(parsed?.error || `HTTP ${response.status}`)
        }

        return parsed
      } catch (error) {
        clearTimeout(timeoutId)
        if (attempt < retries && this.shouldRetry(error)) {
          this.log("warn", `${this.name} retrying ${method} ${url}`, { attempt, error: error.message })
          await this.delay(this.retryDelay * attempt)
          return attemptRequest(attempt + 1)
        }
        this.log("error", `${this.name} request failed`, { url, method, error: error.message })
        throw this.normalizeError(error)
      }
    }

    return attemptRequest(1)
  }

  async get(url, options = {}) {
    return this.request(url, { ...options, method: "GET" })
  }

  async post(url, options = {}) {
    return this.request(url, { ...options, method: "POST" })
  }

  parseResponse(text, response) {
    try {
      return JSON.parse(text)
    } catch {
      return { raw: text, status: response?.status || 200 }
    }
  }

  shouldRetry(error) {
    return Boolean(error && (error.name === "AbortError" || /5\d\d|ECONNRESET|ETIMEDOUT|fetch/i.test(error.message)))
  }

  normalizeError(error) {
    if (error instanceof Error) return error
    return new Error(String(error))
  }

  log(level, message, context = {}) {
    this.logger?.[level]?.(message, context)
  }

  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  getCacheKey(key) {
    return crypto.createHash("sha256").update(String(key)).digest("hex")
  }

  getCached(key) {
    return this.cache.get(this.getCacheKey(key))
  }

  setCached(key, value, ttlMs = 0) {
    const cacheKey = this.getCacheKey(key)
    this.cache.set(cacheKey, { value, expiresAt: ttlMs ? Date.now() + ttlMs : null })
    return value
  }

  getCachedValue(key) {
    const entry = this.getCached(key)
    if (!entry) return null
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.cache.delete(this.getCacheKey(key))
      return null
    }
    return entry.value
  }
}
