import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsString,
  IsUrl,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class ClavesPushDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  p256dh: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  auth: string;
}

/** Cuerpo de `POST /push/suscripciones`: la suscripción del navegador, sin `expirationTime`. */
export class SuscripcionPushDto {
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(500)
  endpoint: string;

  @ValidateNested()
  @Type(() => ClavesPushDto)
  keys: ClavesPushDto;
}

/** Cuerpo de `DELETE /push/suscripciones`. */
export class QuitarSuscripcionPushDto {
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(500)
  endpoint: string;
}
