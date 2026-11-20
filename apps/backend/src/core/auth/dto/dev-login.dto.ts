import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

/** Body de `POST /auth/dev/login` (SPEC-sesion-unica §2.4). */
export class DevLoginDto {
  @IsUUID('4')
  ciudadanoId: string;

  /** Nombre de prueba: queda en la sesión, como el que entrega ClaveÚnica. */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  nombre?: string;
}
