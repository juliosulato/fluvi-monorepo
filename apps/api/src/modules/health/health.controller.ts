import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { HealthService } from './health.service.js';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @AllowAnonymous()
  @Get()
  async check() {
    if (!(await this.healthService.isDatabaseUp())) {
      throw new ServiceUnavailableException();
    }
    return { status: 'ok' };
  }
}
