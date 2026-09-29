import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SolicitudRetiro } from './solicitud-retiro.entity';

@Entity('residuos_catalogo')
export class ResiduoCatalogo {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255, unique: true })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  descripcion: string | null;

  @Column({ type: 'varchar', length: 100 })
  categoria: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  subcategoria: string | null;

  @Column({ name: 'puede_reutilizarse', type: 'boolean', default: true })
  puedeReutilizarse: boolean;

  @Column({ type: 'int', default: 0 })
  precio: number;

  /**
   * Circular Credits del objeto. Sin llenar mientras todos valgan lo mismo:
   * el cálculo usa la constante de prueba (spec `marketplace` §3.5).
   */
  @Column({ type: 'int', nullable: true })
  creditos: number | null;

  @Column({ name: 'instrucciones_recogida', type: 'text', nullable: true })
  instruccionesRecogida: string | null;

  @Column({
    name: 'foto_referencia_path',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  fotoReferenciaPath: string | null;

  @Column({ name: 'codigo_rae', type: 'varchar', length: 50, nullable: true })
  codigoRae: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  @OneToMany(() => SolicitudRetiro, (solicitud) => solicitud.residuoCatalogo)
  solicitudes: SolicitudRetiro[];
}
