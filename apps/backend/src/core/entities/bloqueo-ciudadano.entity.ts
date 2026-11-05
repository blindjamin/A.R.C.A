import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type AccionBloqueo = 'bloqueo' | 'desbloqueo';

/**
 * Historial de bloqueos de un vecino en el Marketplace (HU-18). El vigente es
 * la última fila, si es un `bloqueo`.
 */
@Entity('bloqueos_ciudadano')
export class BloqueoCiudadano {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'usuario_ciudadano_id', type: 'varchar', length: 36 })
  usuarioCiudadanoId: string;

  @Column({ type: 'enum', enum: ['bloqueo', 'desbloqueo'] })
  accion: AccionBloqueo;

  /** Lo escribe el administrador y lo ve el vecino. */
  @Column({ type: 'varchar', length: 500 })
  motivo: string;

  @Column({ name: 'administrador_id', type: 'varchar', length: 36 })
  administradorId: string;

  @Column({ name: 'denuncia_id', type: 'int', nullable: true })
  denunciaId: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;
}
