import { Body, Controller, Post } from '@nestjs/common';
import { MailService } from './mail.service';
import { EnviarCodigoDto } from './dto/enviar-codigo.dto';
import { VerificarCodigoDto } from './dto/verificar-codigo.dto';

@Controller('mail')
export class MailController {
  constructor(private readonly mailService: MailService) {}

  @Post('enviar-codigo')
  async enviarCodigo(@Body() dto: EnviarCodigoDto) {
    return this.mailService.enviarCodigo(dto.email, dto.usuarioCiudadanoId);
  }

  @Post('verificar-codigo')
  async verificarCodigo(@Body() dto: VerificarCodigoDto) {
    return this.mailService.verificarCodigo(
      dto.email,
      dto.codigo,
      dto.usuarioCiudadanoId,
    );
  }
}
