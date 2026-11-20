import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Avisos de la campanita (HU-23).
 *
 * `notificaciones`: una fila por aviso para un vecino. Título y cuerpo no
 * llevan el texto de los mensajes ni datos de contacto. El índice
 * (usuario_ciudadano_id, id) sirve a la lista paginada y al conteo de no
 * leídos. Los avisos se conservan 90 días.
 *
 * El `down` borra la tabla con sus datos.
 */
export class Notificaciones1782164900000 implements MigrationInterface {
  name = 'Notificaciones1782164900000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE notificaciones (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        usuario_ciudadano_id VARCHAR(36) NOT NULL,
        tipo VARCHAR(40) NOT NULL,
        titulo VARCHAR(120) NOT NULL,
        cuerpo VARCHAR(200) NOT NULL,
        url VARCHAR(200) NOT NULL,
        leida_en DATETIME NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_notificaciones_usuario (usuario_ciudadano_id, id),
        CONSTRAINT fk_notificaciones_usuario
          FOREIGN KEY (usuario_ciudadano_id)
          REFERENCES usuarios_ciudadanos(id)
          ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE notificaciones`);
  }
}
