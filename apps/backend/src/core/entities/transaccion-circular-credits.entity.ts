import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ArticuloMarketplace } from './articulo-marketplace.entity';
import { SolicitudRetiro } from './solicitud-retiro.entity';
import { UsuarioAdministrador } from './usuario-administrador.entity';
import { UsuarioCiudadano } from './usuario-ciudadano.entity';
import { OrigenMovimientoCreditos } from './origen-movimiento-creditos.enum';
import { TipoMovimientoCreditos } from './tipo-movimiento-creditos.enum';

/**
 * Movimiento de Circular Credits (HU-10, spec `marketplace` §7).
 *
 * El saldo nunca se edita: solo se agregan movimientos, y el saldo actual es
 * el `saldoNuevo` del último. Un movimiento puede ser de 0 cuando se alcanzó
 * un tope; queda igual para que el vecino vea por qué no sumó.
 *
 * Índices únicos: (`articulo_id`, `origen`) deja una entrega y un bono por
 * artículo, y `solicitud_retiro_id` un otorgamiento por solicitud.
 */
@Entity('transacciones_circular_credits')
export class TransaccionCircularCredits {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'usuario_ciudadano_id', type: 'varchar', length: 36 })
  usuarioCiudadanoId: string;

  @Column({ name: 'articulo_id', type: 'int', nullable: true })
  articuloId: number | null;

  @Column({ name: 'solicitud_retiro_id', type: 'int', nullable: true })
  solicitudRetiroId: number | null;

  @Column({ name: 'monto_creditos', type: 'int' })
  montoCreditos: number;

  @Column({ type: 'enum', enum: TipoMovimientoCreditos })
  tipo: TipoMovimientoCreditos;

  @Column({ type: 'enum', enum: OrigenMovimientoCreditos })
  origen: OrigenMovimientoCreditos;

  @Column({ type: 'text', nullable: true })
  razon: string | null;

  @Column({
    name: 'otorgado_por_administrador_id',
    type: 'varchar',
    length: 36,
    nullable: true,
  })
  otorgadoPorAdministradorId: string | null;

  @Column({ name: 'saldo_anterior', type: 'int' })
  saldoAnterior: number;

  @Column({ name: 'saldo_nuevo', type: 'int' })
  saldoNuevo: number;

  @Column({ name: 'fecha_transaccion', type: 'timestamp' })
  fechaTransaccion: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  @ManyToOne(() => UsuarioCiudadano)
  @JoinColumn({ name: 'usuario_ciudadano_id' })
  usuarioCiudadano: UsuarioCiudadano;

  @ManyToOne(() => ArticuloMarketplace, { nullable: true })
  @JoinColumn({ name: 'articulo_id' })
  articulo: ArticuloMarketplace | null;

  @ManyToOne(() => SolicitudRetiro, { nullable: true })
  @JoinColumn({ name: 'solicitud_retiro_id' })
  solicitudRetiro: SolicitudRetiro | null;

  @ManyToOne(() => UsuarioAdministrador, { nullable: true })
  @JoinColumn({ name: 'otorgado_por_administrador_id' })
  otorgadoPorAdministrador: UsuarioAdministrador | null;
}
