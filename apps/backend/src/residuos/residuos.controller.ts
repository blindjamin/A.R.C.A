import { Controller, Get } from '@nestjs/common';
import { Public } from '@arca/core';
import { ResiduosService } from './residuos.service';

@Controller('residuos')
export class ResiduosController {
  constructor(private readonly residuosService: ResiduosService) {}

  @Public()
  @Get('catalogo')
  findCatalogo() {
    return this.residuosService.findAllCatalogo();
  }
}
