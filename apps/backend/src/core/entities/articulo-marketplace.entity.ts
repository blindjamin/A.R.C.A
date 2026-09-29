import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ResiduoCatalogo } from './residuo-catalogo.entity';
import { UsuarioCiudadano } from './usuario-ciudadano.entity';
import { EstadoArticuloMarketplace } from './estado-articulo-marketplace.enum';
import { TipoArticuloMarketplace } from './tipo-articulo-marketplace.enum';

/**
 * Artículo publicado en el Marketplace P2P (spec `marketplace` §3.1).
 *
 * La reputación es de la persona, no del artículo: el promedio de estrellas
 * se calcula sobre `ratings` del publicador y no se guarda aquí.
 */
@Entity('articulos_marketplace')
export class ArticuloMarketplace {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'usuario_publicador_id', type: 'varchar', length: 36 })
  usuarioPublicadorId: string;

  @Column({ name: 'residuo_catalogo_id', type: 'int' })
  residuoCatalogoId: number;

  @Column({ type: 'enum', enum: TipoArticuloMarketplace })
  tipo: TipoArticuloMarketplace;

  @Column({ type: 'varchar', length: 255 })
  titulo: string;

  @Column({ type: 'text', nullable: true })
  descripcion: string | null;

  @Column({
    type: 'enum',
    enum: EstadoArticuloMarketplace,
    default: EstadoArticuloMarketplace.DISPONIBLE,
  })
  estado: EstadoArticuloMarketplace;

  /** Relativa a la carpeta de subidas. Nunca una URL pública. */
  @Column({ name: 'foto_path', type: 'varchar', length: 500, nullable: true })
  fotoPath: string | null;

  /**
   * Ya aproximadas a la grilla de 250 m (`aproximarParaGuardar`): si la base
   * se filtra, tampoco trae la casa. La API nunca las devuelve.
   */
  @Column({
    type: 'decimal',
    precision: 10,
    scale: 8,
    nullable: true,
  })
  latitud: string | null;

  @Column({
    type: 'decimal',
    precision: 11,
    scale: 8,
    nullable: true,
  })
  longitud: string | null;

  @Column({ name: 'fecha_publicacion', type: 'timestamp' })
  fechaPublicacion: Date;

  @Column({ name: 'fecha_expiracion', type: 'timestamp' })
  fechaExpiracion: Date;

  /** Quien presionó "Lo quiero" y, al completarse, quien lo recibió. */
  @Column({
    name: 'usuario_comprador_id',
    type: 'varchar',
    length: 36,
    nullable: true,
  })
  usuarioCompradorId: string | null;

  /** Cuándo se entregó. */
  @Column({ name: 'fecha_transaccion', type: 'timestamp', nullable: true })
  fechaTransaccion: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  @ManyToOne(() => UsuarioCiudadano)
  @JoinColumn({ name: 'usuario_publicador_id' })
  usuarioPublicador: UsuarioCiudadano;

  @ManyToOne(() => UsuarioCiudadano, { nullable: true })
  @JoinColumn({ name: 'usuario_comprador_id' })
  usuarioComprador: UsuarioCiudadano | null;

  @ManyToOne(() => ResiduoCatalogo)
  @JoinColumn({ name: 'residuo_catalogo_id' })
  residuoCatalogo: ResiduoCatalogo;
}
