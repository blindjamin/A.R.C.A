import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ResiduoCatalogo } from './residuo-catalogo.entity';
import { SolicitudRetiro } from './solicitud-retiro.entity';

/**
 * Un objeto de una solicitud de retiro (HU-01): del catálogo, o escrito por el
 * vecino cuando no está en él. El monto lo fija el funcionario al aprobar: con
 * todo del catálogo se le sugiere la suma de precio × cantidad; con algo fuera
 * del catálogo, lo presupuesta él.
 *
 * `solicitudes_retiro.residuo_catalogo_id` y `nombre_residuo_otro` siguen
 * guardando el primer objeto: el panel, las métricas y la coincidencia con el
 * Marketplace todavía leen esas columnas.
 */
@Entity('objetos_solicitud_retiro')
export class ObjetoSolicitudRetiro {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'solicitud_retiro_id', type: 'int' })
  solicitudRetiroId: number;

  @Column({ name: 'residuo_catalogo_id', type: 'int', nullable: true })
  residuoCatalogoId: number | null;

  /** Nombre que escribió el vecino; solo si no eligió del catálogo. */
  @Column({ name: 'nombre_otro', type: 'varchar', length: 150, nullable: true })
  nombreOtro: string | null;

  @Column({ type: 'tinyint', unsigned: true, default: 1 })
  cantidad: number;

  /** Orden en que el vecino los agregó; el 0 es el objeto principal. */
  @Column({ type: 'smallint', unsigned: true, default: 0 })
  orden: number;

  @ManyToOne(() => SolicitudRetiro, (solicitud) => solicitud.objetos, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'solicitud_retiro_id' })
  solicitudRetiro: SolicitudRetiro;

  @ManyToOne(() => ResiduoCatalogo, { nullable: true })
  @JoinColumn({ name: 'residuo_catalogo_id' })
  residuoCatalogo: ResiduoCatalogo | null;
}
