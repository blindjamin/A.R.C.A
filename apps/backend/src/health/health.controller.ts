import { Controller, Get } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Public } from '@arca/core';

@Controller('health')
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  @Public()
  @Get()
  async check() {
    try {
      await this.dataSource.query('SELECT 1');
      return { status: 'ok', db: 'connected' };
    } catch {
      return { status: 'error', db: 'disconnected' };
    }
  }
}
