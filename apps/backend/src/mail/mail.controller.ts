import { Body, Controller, Post } from '@nestjs/common';
import { CurrentUser, type AuthUser } from '../core';
import { EnviarCodigoDto } from './dto/enviar-codigo.dto';
import { VerificarCodigoDto } from './dto/verificar-codigo.dto';
import { MailService } from './mail.service';

@Controller('mail')
export class MailController {
  constructor(private readonly mailService: MailService) {}

  @Post('enviar-codigo')
  async enviarCodigo(
    @Body() dto: EnviarCodigoDto,
    @CurrentUser() user: AuthUser,
  ) {
    // El ciudadano del body se ignora: siempre el de la sesión.
    return this.mailService.enviarCodigo(dto.email, user.ciudadanoId);
  }

  @Post('verificar-codigo')
  async verificarCodigo(
    @Body() dto: VerificarCodigoDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.mailService.verificarCodigo(
      dto.email,
      dto.codigo,
      user.ciudadanoId,
    );
  }
}
