import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { SolicitudRetiro } from './solicitud-retiro.entity';
import { UsuarioAdministrador } from './usuario-administrador.entity';

/**
 * Nota interna de funcionarios sobre una solicitud.
 *
 * Solo para el panel: nunca se expone en la API ciudadana ni se copia a la
 * auditoría.
 */
@Entity('notas_solicitud')
@Index('idx_notas_solicitud', ['solicitudRetiroId', 'createdAt'])
export class NotaSolicitud {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'solicitud_retiro_id', type: 'int' })
  solicitudRetiroId: number;

  @Column({ name: 'autor_id', type: 'varchar', length: 36 })
  autorId: string;

  @Column({ type: 'text' })
  texto: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @ManyToOne(() => SolicitudRetiro)
  @JoinColumn({ name: 'solicitud_retiro_id' })
  solicitudRetiro: SolicitudRetiro;

  @ManyToOne(() => UsuarioAdministrador)
  @JoinColumn({ name: 'autor_id' })
  autor: UsuarioAdministrador;
}
