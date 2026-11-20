import { Controller, Get } from '@nestjs/common';
import { CurrentUser, type AuthUser } from '../core';
import { CreditosService } from './creditos.service';

@Controller('creditos')
export class CreditosController {
  constructor(private readonly creditosService: CreditosService) {}

  @Get()
  resumen(@CurrentUser() user: AuthUser) {
    return this.creditosService.resumen(user.ciudadanoId);
  }
}
