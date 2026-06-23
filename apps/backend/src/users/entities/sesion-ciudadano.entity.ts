import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UsuarioCiudadano } from './usuario-ciudadano.entity';

@Entity('sesiones_ciudadano')
export class SesionCiudadano {
  @PrimaryColumn({ name: 'session_id', type: 'varchar', length: 36 })
  sessionId: string;

  @Column({ name: 'usuario_ciudadano_id', type: 'varchar', length: 36 })
  usuarioCiudadanoId: string;

  @Column({ name: 'nombre_sesion', type: 'varchar', length: 255, nullable: true })
  nombreSesion: string | null;

  @Column({ name: 'apellido_sesion', type: 'varchar', length: 255, nullable: true })
  apellidoSesion: string | null;

  @Column({ name: 'email_sesion', type: 'varchar', length: 255, nullable: true })
  emailSesion: string | null;

  @Column({ name: 'telefono_sesion', type: 'varchar', length: 20, nullable: true })
  telefonoSesion: string | null;

  @Column({ name: 'direccion_sesion', type: 'text', nullable: true })
  direccionSesion: string | null;

  @Column({
    name: 'latitud_sesion',
    type: 'decimal',
    precision: 10,
    scale: 8,
    nullable: true,
  })
  latitudSesion: string | null;

  @Column({
    name: 'longitud_sesion',
    type: 'decimal',
    precision: 11,
    scale: 8,
    nullable: true,
  })
  longitudSesion: string | null;

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

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  @ManyToOne(() => UsuarioCiudadano, (usuario) => usuario.sesiones, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'usuario_ciudadano_id' })
  usuarioCiudadano: UsuarioCiudadano;
}
