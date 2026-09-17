import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ResiduoCatalogo } from './residuo-catalogo.entity';
import { UsuarioAdministrador } from './usuario-administrador.entity';
import { UsuarioCiudadano } from './usuario-ciudadano.entity';
import { EstadoPagoSolicitud } from './estado-pago-solicitud.enum';
import { EstadoSolicitudRetiro } from './estado-solicitud-retiro.enum';

@Entity('solicitudes_retiro')
export class SolicitudRetiro {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'usuario_ciudadano_id', type: 'varchar', length: 36 })
  usuarioCiudadanoId: string;

  @Column({ name: 'residuo_catalogo_id', type: 'int' })
  residuoCatalogoId: number;

  @Column({
    type: 'enum',
    enum: EstadoSolicitudRetiro,
    default: EstadoSolicitudRetiro.EN_REVISION,
  })
  estado: EstadoSolicitudRetiro;

  @Column({
    name: 'estado_pago',
    type: 'enum',
    enum: EstadoPagoSolicitud,
    default: EstadoPagoSolicitud.NO_APLICA,
  })
  estadoPago: EstadoPagoSolicitud;

  /**
   * Monto en CLP congelado al aprobar. Si después cambia el precio del
   * catálogo, la solicitud conserva lo que se le cobró al vecino.
   */
  @Column({ type: 'int', nullable: true })
  monto: number | null;

  @Column({ type: 'text', nullable: true })
  descripcion: string | null;

  @Column({
    name: 'direccion_anonimizada',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  direccionAnonimizada: string | null;

  @Column({
    name: 'latitud_capturada',
    type: 'decimal',
    precision: 10,
    scale: 8,
    nullable: true,
  })
  latitudCapturada: string | null;

  @Column({
    name: 'longitud_capturada',
    type: 'decimal',
    precision: 11,
    scale: 8,
    nullable: true,
  })
  longitudCapturada: string | null;

  @Column({ name: 'fecha_solicitud', type: 'timestamp' })
  fechaSolicitud: Date;

  /** Última decisión de revisión: aprobar, pedir modificación o rechazar. */
  @Column({ name: 'fecha_revision', type: 'timestamp', nullable: true })
  fechaRevision: Date | null;

  @Column({
    name: 'revisado_por_id',
    type: 'varchar',
    length: 36,
    nullable: true,
  })
  revisadoPorId: string | null;

  /** Cuándo se registró el resultado del retiro (`retirada` o `no_realizada`). */
  @Column({ name: 'fecha_cierre', type: 'timestamp', nullable: true })
  fechaCierre: Date | null;

  /**
   * Funcionario que tiene tomada la solicitud para revisarla, hasta
   * `tomadaHasta`. Evita que dos personas revisen la misma a la vez.
   */
  @Column({
    name: 'tomada_por_id',
    type: 'varchar',
    length: 36,
    nullable: true,
  })
  tomadaPorId: string | null;

  @Column({ name: 'tomada_hasta', type: 'timestamp', nullable: true })
  tomadaHasta: Date | null;

  @Column({ name: 'razon_rechazo', type: 'text', nullable: true })
  razonRechazo: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  @ManyToOne(() => UsuarioCiudadano)
  @JoinColumn({ name: 'usuario_ciudadano_id' })
  usuarioCiudadano: UsuarioCiudadano;

  @ManyToOne(() => ResiduoCatalogo, (residuo) => residuo.solicitudes)
  @JoinColumn({ name: 'residuo_catalogo_id' })
  residuoCatalogo: ResiduoCatalogo;

  @ManyToOne(() => UsuarioAdministrador, { nullable: true })
  @JoinColumn({ name: 'revisado_por_id' })
  revisadoPor: UsuarioAdministrador | null;
}
