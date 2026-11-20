import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { ArticuloMarketplace } from './articulo-marketplace.entity';
import { UsuarioCiudadano } from './usuario-ciudadano.entity';

/**
 * Vecino que dijo «Me interesa» en un artículo (HU-06). Su `id` es el
 * `conversacionId` opaco del chat.
 */
@Entity('interesados_marketplace')
@Unique('uq_interesados_articulo_usuario', [
  'articuloId',
  'usuarioInteresadoId',
])
export class InteresadoMarketplace {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'articulo_id', type: 'int' })
  articuloId: number;

  @Column({ name: 'usuario_interesado_id', type: 'varchar', length: 36 })
  usuarioInteresadoId: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @ManyToOne(() => ArticuloMarketplace, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'articulo_id' })
  articulo: ArticuloMarketplace;

  @ManyToOne(() => UsuarioCiudadano)
  @JoinColumn({ name: 'usuario_interesado_id' })
  usuarioInteresado: UsuarioCiudadano;
}
