import { BaseService } from "./base.service.js"

export class WeatherService extends BaseService {
  constructor(options = {}) {
    super({
      name: "WeatherService",
      baseURL: options.baseURL || "https://api.open-meteo.com/v1",
      timeout: options.timeout || 15000,
      retries: options.retries ?? 2,
      apiKey: options.apiKey || "",
      ...options
    })
  }

  async current(latitude, longitude, options = {}) {
    const params = new URLSearchParams({ latitude, longitude, current: "temperature_2m" })
    return this.get(`${this.baseURL}/forecast?${params.toString()}`, options)
  }
}
