import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ArticuloMarketplace } from './articulo-marketplace.entity';
import { UsuarioCiudadano } from './usuario-ciudadano.entity';

/**
 * Calificación de 1 a 5 estrellas entre vecinos (HU-15). La hace quien
 * recibió el artículo y califica a quien lo publicó.
 *
 * Una por intercambio: la base lo garantiza con el índice único
 * (`articulo_id`, `usuario_calificador_id`).
 */
@Entity('ratings')
export class Calificacion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'usuario_calificador_id', type: 'varchar', length: 36 })
  usuarioCalificadorId: string;

  @Column({ name: 'usuario_calificado_id', type: 'varchar', length: 36 })
  usuarioCalificadoId: string;

  @Column({ name: 'articulo_id', type: 'int', nullable: true })
  articuloId: number | null;

  @Column({ type: 'int' })
  puntuacion: number;

  @Column({ type: 'text', nullable: true })
  comentario: string | null;

  @Column({ name: 'fecha_calificacion', type: 'timestamp' })
  fechaCalificacion: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  @ManyToOne(() => UsuarioCiudadano)
  @JoinColumn({ name: 'usuario_calificador_id' })
  usuarioCalificador: UsuarioCiudadano;

  @ManyToOne(() => UsuarioCiudadano)
  @JoinColumn({ name: 'usuario_calificado_id' })
  usuarioCalificado: UsuarioCiudadano;

  @ManyToOne(() => ArticuloMarketplace, { nullable: true })
  @JoinColumn({ name: 'articulo_id' })
  articulo: ArticuloMarketplace | null;
}
