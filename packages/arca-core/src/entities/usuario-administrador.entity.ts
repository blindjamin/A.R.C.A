import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { RolAdministrador } from './rol-administrador.enum';
import { SesionAdministrador } from './sesion-administrador.entity';
import { UsuarioCiudadano } from './usuario-ciudadano.entity';

@Entity('usuarios_administradores')
export class UsuarioAdministrador {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id: string;

  @Column({
    name: 'usuario_ciudadano_id',
    type: 'varchar',
    length: 36,
    unique: true,
  })
  usuarioCiudadanoId: string;

  @Column({ type: 'varchar', length: 255 })
  nombre: string;

  @Column({ type: 'varchar', length: 255 })
  apellido: string;

  @Column({
    name: 'email_institucional',
    type: 'varchar',
    length: 255,
    unique: true,
  })
  emailInstitucional: string;

  @Column({
    name: 'telefono_institucional',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  telefonoInstitucional: string | null;

  @Column({ type: 'enum', enum: RolAdministrador })
  rol: RolAdministrador;

  @Column({ type: 'varchar', length: 150, nullable: true })
  cargo: string | null;

  @Column({ name: 'fecha_ingreso', type: 'timestamp' })
  fechaIngreso: Date;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @Column({
    name: 'ip_ultimo_login',
    type: 'varchar',
    length: 45,
    nullable: true,
  })
  ipUltimoLogin: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  @OneToOne(() => UsuarioCiudadano, (usuario) => usuario.administrador, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'usuario_ciudadano_id' })
  usuarioCiudadano: UsuarioCiudadano;

  @OneToMany(() => SesionAdministrador, (sesion) => sesion.usuarioAdministrador)
  sesiones: SesionAdministrador[];
}
