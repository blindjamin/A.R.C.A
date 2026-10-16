import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UsuarioCiudadano } from './usuario-ciudadano.entity';

/**
 * Contacto del vecino para coordinar el retiro (HU-37, decisión 016).
 *
 * Va aparte de `usuarios_ciudadanos` para que la identidad siga sin datos
 * personales: el contacto se borra entero sin tocar la identidad (la baja,
 * HU-38, debe borrar esta fila) y se puede limitar quién lo lee.
 */
@Entity('contacto_ciudadano')
export class ContactoCiudadano {
  @PrimaryColumn({ name: 'usuario_ciudadano_id', type: 'varchar', length: 36 })
  usuarioCiudadanoId: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  telefono: string | null;

  @Column({ type: 'text', nullable: true })
  direccion: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  @OneToOne(() => UsuarioCiudadano, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'usuario_ciudadano_id' })
  usuarioCiudadano: UsuarioCiudadano;
}
