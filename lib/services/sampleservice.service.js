import { BaseService } from "./base.service.js"

export class SampleserviceService extends BaseService {
  constructor(options = {}) {
    super({
      name: "SampleserviceService",
      timeout: options.timeout || 15000,
      ...options
    })
  }
}
