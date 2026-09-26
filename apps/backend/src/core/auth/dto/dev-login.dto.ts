import { IsUUID } from 'class-validator';

/** Body de `POST /auth/dev/login` (SPEC-sesion-unica §2.4). */
export class DevLoginDto {
  @IsUUID('4')
  ciudadanoId: string;
}
