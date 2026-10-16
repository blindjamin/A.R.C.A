import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { SolicitudRetiro } from './solicitud-retiro.entity';
import { TipoFotoRetiro } from './tipo-foto-retiro.enum';

/**
 * Foto de una solicitud de retiro. La ruta es relativa a `UPLOADS_DIR` y solo
 * se entrega por la API con sesión (mismo patrón que el Marketplace).
 */
@Entity('foto_retiro')
export class FotoRetiro {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'solicitud_retiro_id', type: 'int' })
  solicitudRetiroId: number;

  /** Relativa a la carpeta de subidas. Nunca una URL pública. */
  @Column({ name: 'ruta_archivo', type: 'varchar', length: 500 })
  rutaArchivo: string;

  @Column({ name: 'tipo_foto', type: 'enum', enum: TipoFotoRetiro })
  tipoFoto: TipoFotoRetiro;

  @Column({
    name: 'hash_integridad',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  hashIntegridad: string | null;

  @Column({ name: 'fecha_captura', type: 'timestamp' })
  fechaCaptura: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @ManyToOne(() => SolicitudRetiro, (solicitud) => solicitud.fotos, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'solicitud_retiro_id' })
  solicitudRetiro: SolicitudRetiro;
}
