import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Tabla de auditoría (HU-14) — registro auditable de acciones críticas.
 *
 * Refleja tal cual la definición de `auditoria` en ARCA_database_schema.dbml:
 * no cambia el esquema, lo implementa. Responde a la observación 6 de la
 * retroalimentación municipal del 24-06-2026, que pidió "dejar registro de
 * quién realizó cada cambio".
 *
 * Sobre `datos_anteriores` / `datos_nuevos`: por decisión de diseño se guarda
 * únicamente el campo modificado, no la fila completa. Volcar la fila copiaría
 * datos personales del vecino (descripción con su dirección, coordenadas) a un
 * registro que por su naturaleza no se puede borrar, y eso choca de frente con
 * el derecho de supresión de la Ley 21.719. Si algún día el campo modificado
 * fuese en sí mismo un dato personal, se registra que cambió pero no su
 * contenido.
 */
export class CreateAuditoria1782163700000 implements MigrationInterface {
  name = 'CreateAuditoria1782163700000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE auditoria (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        actor_ciudadano_id VARCHAR(36) NULL COMMENT 'Lleno si el actor actuó como ciudadano',
        actor_administrador_id VARCHAR(36) NULL COMMENT 'Lleno si el actor actuó como funcionario',
        tipo_actor ENUM('ciudadano', 'administrador', 'sistema') NOT NULL,
        entidad VARCHAR(100) NOT NULL COMMENT 'Tabla afectada',
        entidad_id INT NULL,
        accion ENUM('CREATE', 'UPDATE', 'DELETE', 'ACCESO', 'LOGIN') NOT NULL,
        datos_anteriores JSON NULL COMMENT 'Solo el campo modificado, nunca la fila completa',
        datos_nuevos JSON NULL COMMENT 'Solo el campo modificado, nunca la fila completa',
        ip_origen VARCHAR(45) NULL,
        user_agent TEXT NULL,
        fecha_accion TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_auditoria_actor_ciudadano
          FOREIGN KEY (actor_ciudadano_id)
          REFERENCES usuarios_ciudadanos(id),
        CONSTRAINT fk_auditoria_actor_administrador
          FOREIGN KEY (actor_administrador_id)
          REFERENCES usuarios_administradores(id)
      )
    `);

    // La pantalla del panel lista los movimientos más recientes primero, y el
    // caso de uso siguiente es "qué le pasó a esta solicitud". Sin estos dos
    // índices ambas consultas recorren la tabla entera, que es justamente la
    // que más crece.
    await queryRunner.query(`
      CREATE INDEX idx_auditoria_fecha_accion ON auditoria (fecha_accion DESC)
    `);

    await queryRunner.query(`
      CREATE INDEX idx_auditoria_entidad ON auditoria (entidad, entidad_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS auditoria`);
  }
}
