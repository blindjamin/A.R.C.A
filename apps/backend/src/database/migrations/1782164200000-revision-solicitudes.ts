import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Revisión de solicitudes por el funcionario (spec `revision-solicitudes`).
 *
 * - `revisiones_solicitud`: historial de decisiones (aprobar, pedir
 *   modificación, rechazar) con motivo, comentario para el vecino y lista de
 *   verificación. No se edita.
 * - `notas_solicitud`: notas internas del panel.
 * - `solicitudes_retiro.tomada_por_id` / `tomada_hasta`: toma temporal para
 *   que dos funcionarios no revisen la misma solicitud a la vez.
 *
 * El `down` borra el historial y las notas.
 */
export class RevisionSolicitudes1782164200000 implements MigrationInterface {
  name = 'RevisionSolicitudes1782164200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE revisiones_solicitud (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        solicitud_retiro_id INT NOT NULL,
        revisado_por_id VARCHAR(36) NOT NULL,
        decision ENUM('aprobada', 'requiere_modificacion', 'rechazada') NOT NULL,
        motivo VARCHAR(50) NULL,
        comentario TEXT NULL,
        checklist JSON NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_revisiones_solicitud (solicitud_retiro_id, created_at),
        CONSTRAINT fk_revisiones_solicitud
          FOREIGN KEY (solicitud_retiro_id)
          REFERENCES solicitudes_retiro(id),
        CONSTRAINT fk_revisiones_revisor
          FOREIGN KEY (revisado_por_id)
          REFERENCES usuarios_administradores(id)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE notas_solicitud (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        solicitud_retiro_id INT NOT NULL,
        autor_id VARCHAR(36) NOT NULL,
        texto TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_notas_solicitud (solicitud_retiro_id, created_at),
        CONSTRAINT fk_notas_solicitud
          FOREIGN KEY (solicitud_retiro_id)
          REFERENCES solicitudes_retiro(id),
        CONSTRAINT fk_notas_autor
          FOREIGN KEY (autor_id)
          REFERENCES usuarios_administradores(id)
      )
    `);

    await queryRunner.query(`
      ALTER TABLE solicitudes_retiro
        ADD COLUMN tomada_por_id VARCHAR(36) NULL AFTER fecha_cierre,
        ADD CONSTRAINT fk_solicitudes_tomada_por
          FOREIGN KEY (tomada_por_id)
          REFERENCES usuarios_administradores(id)
    `);

    await queryRunner.query(`
      ALTER TABLE solicitudes_retiro
        ADD COLUMN tomada_hasta TIMESTAMP NULL AFTER tomada_por_id
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE solicitudes_retiro DROP FOREIGN KEY fk_solicitudes_tomada_por
    `);
    await queryRunner.query(`
      ALTER TABLE solicitudes_retiro
        DROP COLUMN tomada_hasta,
        DROP COLUMN tomada_por_id
    `);
    await queryRunner.query(`DROP TABLE notas_solicitud`);
    await queryRunner.query(`DROP TABLE revisiones_solicitud`);
  }
}
