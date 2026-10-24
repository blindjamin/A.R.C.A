import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UsuarioCiudadano } from './usuario-ciudadano.entity';

/** Aviso de la campanita de un vecino (HU-23). Sin texto de mensajes ni datos de contacto. */
@Entity('notificaciones')
export class Notificacion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'usuario_ciudadano_id', type: 'varchar', length: 36 })
  usuarioCiudadanoId: string;

  @Column({ type: 'varchar', length: 40 })
  tipo: string;

  @Column({ type: 'varchar', length: 120 })
  titulo: string;

  @Column({ type: 'varchar', length: 200 })
  cuerpo: string;

  /** Ruta del frontend a la que lleva el aviso. */
  @Column({ type: 'varchar', length: 200 })
  url: string;

  @Column({ name: 'leida_en', type: 'datetime', nullable: true })
  leidaEn: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @ManyToOne(() => UsuarioCiudadano, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'usuario_ciudadano_id' })
  usuarioCiudadano: UsuarioCiudadano;
}
