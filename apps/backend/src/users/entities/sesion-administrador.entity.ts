import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { UsuarioAdministrador } from './usuario-administrador.entity';

@Entity('sesiones_administrador')
export class SesionAdministrador {
  @PrimaryColumn({ name: 'session_id', type: 'varchar', length: 36 })
  sessionId: string;

  @Column({ name: 'usuario_administrador_id', type: 'varchar', length: 36 })
  usuarioAdministradorId: string;

  @Column({ name: 'jwt_token_hash', type: 'varchar', length: 255, nullable: true })
  jwtTokenHash: string | null;

  @Column({ name: 'ip_sesion', type: 'varchar', length: 45, nullable: true })
  ipSesion: string | null;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent: string | null;

  @Column({ name: 'fecha_inicio', type: 'timestamp' })
  fechaInicio: Date;

  @Column({ name: 'fecha_expiracion', type: 'timestamp' })
  fechaExpiracion: Date;

  @Column({ type: 'boolean', default: true })
  activa: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @ManyToOne(() => UsuarioAdministrador, (admin) => admin.sesiones, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'usuario_administrador_id' })
  usuarioAdministrador: UsuarioAdministrador;
}
