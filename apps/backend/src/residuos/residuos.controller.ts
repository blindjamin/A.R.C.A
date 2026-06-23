import { Controller, Get } from '@nestjs/common';
import { ResiduosService } from './residuos.service';

@Controller('residuos')
export class ResiduosController {
  constructor(private readonly residuosService: ResiduosService) {}

  @Get('catalogo')
  findCatalogo() {
    return this.residuosService.findAllCatalogo();
  }
}
