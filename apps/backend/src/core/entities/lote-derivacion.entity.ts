import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UsuarioAdministrador } from './usuario-administrador.entity';

/**
 * Lote de solicitudes entregado a la empresa operadora en un Excel
 * (spec `derivacion-excel`).
 *
 * El archivo no se guarda: se arma en cada descarga a partir de las
 * solicitudes que apuntan a este lote.
 */
@Entity('lotes_derivacion')
export class LoteDerivacion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'generado_por_id', type: 'varchar', length: 36 })
  generadoPorId: string;

  @Column({ type: 'int' })
  cantidad: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @ManyToOne(() => UsuarioAdministrador)
  @JoinColumn({ name: 'generado_por_id' })
  generadoPor: UsuarioAdministrador;
}
