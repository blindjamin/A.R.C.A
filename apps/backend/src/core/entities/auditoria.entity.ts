import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AccionAuditoria } from './accion-auditoria.enum';
import { TipoActorAuditoria } from './tipo-actor-auditoria.enum';
import { UsuarioAdministrador } from './usuario-administrador.entity';
import { UsuarioCiudadano } from './usuario-ciudadano.entity';

/**
 * Registro auditable de acciones críticas (HU-14).
 *
 * Responde a la observación 6 de la retroalimentación municipal del
 * 24-06-2026: "debe limitarse según el rol y dejar registro de quién realizó
 * cada cambio".
 *
 * No lleva `updated_at` a propósito: una fila de auditoría **no se modifica
 * nunca**. Si se pudiera editar, no serviría como registro — el valor de la
 * auditoría es justamente que nadie pueda reescribir lo que pasó.
 */
// Declarados también acá, con los mismos nombres que en la migración: si solo
// vivieran en el SQL, un `migration:generate` los vería como sobrantes y
// propondría borrarlos.
@Entity('auditoria')
@Index('idx_auditoria_fecha_accion', ['fechaAccion'])
@Index('idx_auditoria_entidad', ['entidad', 'entidadId'])
export class Auditoria {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'actor_ciudadano_id',
    type: 'varchar',
    length: 36,
    nullable: true,
  })
  actorCiudadanoId: string | null;

  @Column({
    name: 'actor_administrador_id',
    type: 'varchar',
    length: 36,
    nullable: true,
  })
  actorAdministradorId: string | null;

  @Column({
    name: 'tipo_actor',
    type: 'enum',
    enum: TipoActorAuditoria,
  })
  tipoActor: TipoActorAuditoria;

  /** Tabla afectada, en snake_case: `solicitudes_retiro`, `auditoria`, … */
  @Column({ type: 'varchar', length: 100 })
  entidad: string;

  @Column({ name: 'entidad_id', type: 'int', nullable: true })
  entidadId: number | null;

  @Column({ type: 'enum', enum: AccionAuditoria })
  accion: AccionAuditoria;

  /**
   * Valor previo **solo del campo modificado**, no de la fila completa.
   *
   * Volcar la fila entera copiaría datos personales del vecino (la descripción
   * con su dirección, las coordenadas) a un registro que por su naturaleza no
   * se puede borrar, y eso choca con el derecho de supresión de la Ley 21.719.
   * Guardando `{ "estado": "pendiente" }` la trazabilidad se conserva y no hay
   * dato personal que después haya que eliminar.
   *
   * Si el campo modificado fuese en sí mismo un dato personal, se registra que
   * cambió pero no su contenido.
   */
  @Column({ name: 'datos_anteriores', type: 'json', nullable: true })
  datosAnteriores: Record<string, unknown> | null;

  /** Valor nuevo del campo modificado. Mismo criterio que `datosAnteriores`. */
  @Column({ name: 'datos_nuevos', type: 'json', nullable: true })
  datosNuevos: Record<string, unknown> | null;

  /** Longitud 45 para admitir IPv6 y direcciones IPv4 mapeadas. */
  @Column({ name: 'ip_origen', type: 'varchar', length: 45, nullable: true })
  ipOrigen: string | null;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent: string | null;

  /**
   * Cuándo ocurrió la acción, según la aplicación.
   *
   * Separada de `createdAt`, que es cuándo se escribió la fila. Normalmente
   * coinciden, pero si el registro se difiere o se reprocesa, la diferencia
   * entre ambas es en sí misma información para quien audita.
   */
  @Column({ name: 'fecha_accion', type: 'timestamp' })
  fechaAccion: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @ManyToOne(() => UsuarioCiudadano, { nullable: true })
  @JoinColumn({ name: 'actor_ciudadano_id' })
  actorCiudadano: UsuarioCiudadano | null;

  @ManyToOne(() => UsuarioAdministrador, { nullable: true })
  @JoinColumn({ name: 'actor_administrador_id' })
  actorAdministrador: UsuarioAdministrador | null;
}
