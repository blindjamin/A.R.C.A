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

/** Mensaje del chat de un artículo (HU-06). */
@Entity('mensajes_marketplace')
export class MensajeMarketplace {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'articulo_id', type: 'int' })
  articuloId: number;

  @Column({ name: 'usuario_remitente_id', type: 'varchar', length: 36 })
  usuarioRemitenteId: string;

  @Column({ type: 'text' })
  contenido: string;

  @Column({ name: 'fecha_mensaje', type: 'timestamp' })
  fechaMensaje: Date;

  @Column({ type: 'boolean', default: false })
  leido: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  @ManyToOne(() => ArticuloMarketplace)
  @JoinColumn({ name: 'articulo_id' })
  articulo: ArticuloMarketplace;

  @ManyToOne(() => UsuarioCiudadano)
  @JoinColumn({ name: 'usuario_remitente_id' })
  usuarioRemitente: UsuarioCiudadano;
}
