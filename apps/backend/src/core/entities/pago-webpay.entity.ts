import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EstadoIntentoPago } from './estado-intento-pago.enum';
import { SolicitudRetiro } from './solicitud-retiro.entity';

/**
 * Un intento de cobro con Webpay Plus (HU-44).
 *
 * La orden y el token identifican el intento: la vuelta de Transbank no trae
 * la cookie de sesión. El comprobante (orden, código de autorización, monto
 * y fecha) queda en el intento que resultó `autorizado`.
 */
@Entity('pagos_webpay')
export class PagoWebpay {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ name: 'solicitud_retiro_id', type: 'int' })
  solicitudRetiroId: number;

  /** Única por intento. Transbank acepta hasta 26 caracteres alfanuméricos. */
  @Column({ name: 'buy_order', type: 'varchar', length: 26, unique: true })
  buyOrder: string;

  /** La manda Transbank al anular. No es la cookie `arca_sesion`. */
  @Column({ name: 'session_id', type: 'varchar', length: 61 })
  sessionId: string;

  @Column({ type: 'varchar', length: 64, unique: true })
  token: string;

  /** CLP, el mismo monto congelado en la solicitud al aprobar. */
  @Column({ type: 'int' })
  monto: number;

  @Column({ type: 'enum', enum: EstadoIntentoPago })
  estado: EstadoIntentoPago;

  @Column({
    name: 'codigo_autorizacion',
    type: 'varchar',
    length: 6,
    nullable: true,
  })
  codigoAutorizacion: string | null;

  @Column({ name: 'fecha_transaccion', type: 'timestamp', nullable: true })
  fechaTransaccion: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  @ManyToOne(() => SolicitudRetiro, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'solicitud_retiro_id' })
  solicitudRetiro: SolicitudRetiro;
}
