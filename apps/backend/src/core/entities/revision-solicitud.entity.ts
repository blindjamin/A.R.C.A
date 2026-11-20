import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EstadoSolicitudRetiro } from './estado-solicitud-retiro.enum';
import { MotivoRevision } from './motivo-revision.enum';
import { SolicitudRetiro } from './solicitud-retiro.entity';
import { UsuarioAdministrador } from './usuario-administrador.entity';

/**
 * Una decisión de revisión sobre una solicitud (spec `revision-solicitudes`).
 *
 * Es historial: una solicitud puede pasar varias veces por revisión y cada
 * decisión queda como fila propia. Sin `updated_at` a propósito: no se edita.
 */
@Entity('revisiones_solicitud')
@Index('idx_revisiones_solicitud', ['solicitudRetiroId', 'createdAt'])
export class RevisionSolicitud {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'solicitud_retiro_id', type: 'int' })
  solicitudRetiroId: number;

  @Column({ name: 'revisado_por_id', type: 'varchar', length: 36 })
  revisadoPorId: string;

  @Column({
    type: 'enum',
    enum: [
      EstadoSolicitudRetiro.APROBADA,
      EstadoSolicitudRetiro.REQUIERE_MODIFICACION,
      EstadoSolicitudRetiro.RECHAZADA,
    ],
  })
  decision: EstadoSolicitudRetiro;

  @Column({ type: 'varchar', length: 50, nullable: true })
  motivo: MotivoRevision | null;

  /** Lo ve el vecino. No se copia a la auditoría. */
  @Column({ type: 'text', nullable: true })
  comentario: string | null;

  @Column({ type: 'json', nullable: true })
  checklist: Record<string, boolean> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @ManyToOne(() => SolicitudRetiro)
  @JoinColumn({ name: 'solicitud_retiro_id' })
  solicitudRetiro: SolicitudRetiro;

  @ManyToOne(() => UsuarioAdministrador)
  @JoinColumn({ name: 'revisado_por_id' })
  revisadoPor: UsuarioAdministrador;
}
