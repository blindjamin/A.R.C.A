import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { PagosService } from './pagos.service';

const INTERVALO_MS = 5 * 60 * 1000;

/**
 * Concilia intentos `iniciado` viejos con `Transaction.status` de Transbank.
 * Corre al arrancar y cada 5 minutos (mismo patrón que la conservación de
 * direcciones).
 */
@Injectable()
export class ConciliacionPagosService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(ConciliacionPagosService.name);
  private temporizador: NodeJS.Timeout | null = null;

  constructor(private readonly pagos: PagosService) {}

  onApplicationBootstrap(): void {
    void this.ejecutar();
    this.temporizador = setInterval(() => void this.ejecutar(), INTERVALO_MS);
    this.temporizador.unref();
  }

  onApplicationShutdown(): void {
    if (this.temporizador) clearInterval(this.temporizador);
  }

  private async ejecutar(): Promise<void> {
    try {
      const cerrados = await this.pagos.conciliarIniciadosViejos();
      if (cerrados > 0) {
        this.logger.log(
          `Conciliación Webpay: ${cerrados} intento(s) cerrado(s).`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Conciliación Webpay falló: ${
          error instanceof Error ? error.name : 'error'
        }`,
      );
    }
  }
}
