import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SesionCiudadano } from './sesion-ciudadano.entity';
import { UsuarioAdministrador } from './usuario-administrador.entity';

@Entity('usuarios_ciudadanos')
export class UsuarioCiudadano {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id: string;

  @Column({ name: 'clave_unica_id', type: 'varchar', length: 255, unique: true })
  claveUnicaId: string;

  @Column({ name: 'fecha_registro', type: 'timestamp' })
  fechaRegistro: Date;

  @Column({ name: 'fecha_ultima_actividad', type: 'timestamp', nullable: true })
  fechaUltimaActividad: Date | null;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @Column({ name: 'ip_primera_login', type: 'varchar', length: 45, nullable: true })
  ipPrimeraLogin: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  @OneToMany(() => SesionCiudadano, (sesion) => sesion.usuarioCiudadano)
  sesiones: SesionCiudadano[];

  @OneToOne(() => UsuarioAdministrador, (admin) => admin.usuarioCiudadano)
  administrador: UsuarioAdministrador;
}
