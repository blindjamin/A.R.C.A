import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ResiduoCatalogo } from '../../residuos/entities/residuo-catalogo.entity';
import { UsuarioAdministrador } from '../../users/entities/usuario-administrador.entity';
import { UsuarioCiudadano } from '../../users/entities/usuario-ciudadano.entity';
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
    default: EstadoSolicitudRetiro.PENDIENTE,
  })
  estado: EstadoSolicitudRetiro;

  @Column({ type: 'text', nullable: true })
  descripcion: string | null;

  @Column({ name: 'direccion_anonimizada', type: 'varchar', length: 255, nullable: true })
  direccionAnonimizada: string | null;

  @Column({ name: 'latitud_capturada', type: 'decimal', precision: 10, scale: 8, nullable: true })
  latitudCapturada: string | null;

  @Column({ name: 'longitud_capturada', type: 'decimal', precision: 11, scale: 8, nullable: true })
  longitudCapturada: string | null;

  @Column({ name: 'fecha_solicitud', type: 'timestamp' })
  fechaSolicitud: Date;

  @Column({ name: 'fecha_programada', type: 'timestamp', nullable: true })
  fechaProgramada: Date | null;

  @Column({ name: 'fecha_completada', type: 'timestamp', nullable: true })
  fechaCompletada: Date | null;

  @Column({ name: 'operador_asignado_id', type: 'varchar', length: 36, nullable: true })
  operadorAsignadoId: string | null;

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
  @JoinColumn({ name: 'operador_asignado_id' })
  operadorAsignado: UsuarioAdministrador | null;
}
