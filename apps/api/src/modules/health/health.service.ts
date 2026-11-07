import { Injectable } from '@nestjs/common';
import { HealthRepository } from './health.repository.js';

@Injectable()
export class HealthService {
  constructor(private readonly healthRepository: HealthRepository) {}

  async isDatabaseUp(): Promise<boolean> {
    try {
      await this.healthRepository.ping();
      return true;
    } catch {
      return false;
    }
  }
}
