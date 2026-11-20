import { Equals } from 'class-validator';

/** Body de `POST /api/perfil/baja`: la confirmación explícita que pide la HU-38. */
export class DarseDeBajaDto {
  @Equals(true, { message: 'Confirma que quieres darte de baja.' })
  confirmo: boolean;
}
