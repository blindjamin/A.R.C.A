import { IsString, Matches } from 'class-validator';

/** Cuerpo de `PATCH /marketplace/articulos/:id/entregar`: el código de 6 dígitos de quien recibe. */
export class EntregarArticuloDto {
  @IsString()
  @Matches(/^\d{6}$/, { message: 'El código son 6 dígitos' })
  codigo: string;
}
