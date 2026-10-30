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
import { EstadoDenuncia } from './estado-denuncia.enum';
import { MotivoDenuncia } from './motivo-denuncia.enum';
import { OrigenDenuncia } from './origen-denuncia.enum';
import { UsuarioAdministrador } from './usuario-administrador.entity';
import { UsuarioCiudadano } from './usuario-ciudadano.entity';

/** Mensaje del chat que el vecino adjunta como prueba. Copia, no referencia: el chat se borra a los 30 días. */
export interface MensajeAdjunto {
  deQuien: 'denunciante' | 'denunciado';
  contenido: string;
  fecha: string;
}

/**
 * Denuncia de un vecino contra otro por un intercambio del Marketplace
 * (HU-16). La revisa un funcionario desde el panel (HU-18).
 *
 * El denunciado nunca ve quién lo denunció. El funcionario ve solo los
 * mensajes que el denunciante adjuntó, no la conversación completa.
 */
@Entity('denuncias')
export class Denuncia {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'usuario_denunciante_id', type: 'varchar', length: 36 })
  usuarioDenuncianteId: string;

  @Column({ name: 'usuario_denunciado_id', type: 'varchar', length: 36 })
  usuarioDenunciadoId: string;

  @Column({ name: 'articulo_id', type: 'int', nullable: true })
  articuloId: number | null;

  @Column({ type: 'enum', enum: MotivoDenuncia })
  motivo: MotivoDenuncia;

  @Column({ type: 'text', nullable: true })
  descripcion: string | null;

  @Column({ type: 'varchar', length: 20 })
  origen: OrigenDenuncia;

  @Column({ name: 'mensajes_adjuntos', type: 'json', nullable: true })
  mensajesAdjuntos: MensajeAdjunto[] | null;

  @Column({
    type: 'enum',
    enum: EstadoDenuncia,
    default: EstadoDenuncia.ABIERTA,
  })
  estado: EstadoDenuncia;

  @Column({ type: 'text', nullable: true })
  resolucion: string | null;

  @Column({
    name: 'revisado_por_administrador_id',
    type: 'varchar',
    length: 36,
    nullable: true,
  })
  revisadoPorAdministradorId: string | null;

  @Column({ name: 'fecha_denuncia', type: 'timestamp' })
  fechaDenuncia: Date;

  @Column({ name: 'fecha_resolucion', type: 'timestamp', nullable: true })
  fechaResolucion: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  @ManyToOne(() => UsuarioCiudadano)
  @JoinColumn({ name: 'usuario_denunciante_id' })
  usuarioDenunciante: UsuarioCiudadano;

  @ManyToOne(() => UsuarioCiudadano)
  @JoinColumn({ name: 'usuario_denunciado_id' })
  usuarioDenunciado: UsuarioCiudadano;

  @ManyToOne(() => ArticuloMarketplace, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'articulo_id' })
  articulo: ArticuloMarketplace | null;

  @ManyToOne(() => UsuarioAdministrador, { nullable: true })
  @JoinColumn({ name: 'revisado_por_administrador_id' })
  revisadoPorAdministrador: UsuarioAdministrador | null;
}
