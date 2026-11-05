import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Bloqueo de vecinos en el Marketplace (HU-18).
 *
 * Historial y no una columna en `usuarios_ciudadanos`: el desbloqueo también
 * lleva motivo, y los dos quedan. El bloqueo vigente es la última fila del
 * vecino, si su acción es `bloqueo`.
 *
 * El motivo lo escribe el administrador y lo ve el vecino; no va a la
 * auditoría, que registra solo la fila (`bloqueos_ciudadano`) y la acción.
 *
 * El bloqueo es solo de A.R.C.A.: no toca ClaveÚnica ni las solicitudes de
 * retiro.
 *
 * El `down` borra la tabla con sus datos: los vecinos bloqueados quedan libres.
 */
export class BloqueosCiudadano1782165600000 implements MigrationInterface {
  name = 'BloqueosCiudadano1782165600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE bloqueos_ciudadano (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        usuario_ciudadano_id VARCHAR(36) NOT NULL,
        accion ENUM('bloqueo', 'desbloqueo') NOT NULL,
        motivo VARCHAR(500) NOT NULL,
        administrador_id VARCHAR(36) NOT NULL,
        denuncia_id INT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_bloqueos_ciudadano (usuario_ciudadano_id, id),
        CONSTRAINT fk_bloqueos_ciudadano
          FOREIGN KEY (usuario_ciudadano_id) REFERENCES usuarios_ciudadanos(id),
        CONSTRAINT fk_bloqueos_administrador
          FOREIGN KEY (administrador_id) REFERENCES usuarios_administradores(id),
        CONSTRAINT fk_bloqueos_denuncia
          FOREIGN KEY (denuncia_id) REFERENCES denuncias(id) ON DELETE SET NULL
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE bloqueos_ciudadano`);
  }
}
