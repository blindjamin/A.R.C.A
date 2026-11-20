import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Interés, reserva y entrega con código en el Marketplace (HU-06).
 *
 * - `interesados_marketplace`: una fila por (artículo, vecino interesado).
 *   Su `id` es el `conversacionId` opaco del chat. El índice
 *   (usuario_interesado_id, created_at) sirve al tope diario de «Me interesa».
 *   Se rellena con los pares que ya tienen mensajes.
 * - `articulos_marketplace`: `codigo_entrega` (6 dígitos, solo lo ve quien
 *   recibe), `intentos_codigo` (bloqueo a los 5 fallos) y `fecha_reserva`.
 *
 * El `down` borra la tabla y las columnas, con sus datos.
 */
export class InteresReservaMarketplace1782164800000
  implements MigrationInterface
{
  name = 'InteresReservaMarketplace1782164800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE interesados_marketplace (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        articulo_id INT NOT NULL,
        usuario_interesado_id VARCHAR(36) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE INDEX uq_interesados_articulo_usuario (articulo_id, usuario_interesado_id),
        INDEX idx_interesados_usuario_fecha (usuario_interesado_id, created_at),
        CONSTRAINT fk_interesados_articulo
          FOREIGN KEY (articulo_id) REFERENCES articulos_marketplace(id)
          ON DELETE CASCADE,
        CONSTRAINT fk_interesados_usuario
          FOREIGN KEY (usuario_interesado_id) REFERENCES usuarios_ciudadanos(id)
      )
    `);

    // Cada conversación existente pasa a ser un interés, fechado en su primer mensaje.
    await queryRunner.query(`
      INSERT INTO interesados_marketplace (articulo_id, usuario_interesado_id, created_at)
      SELECT articulo_id, interesado_id, MIN(fecha_mensaje)
      FROM mensajes_marketplace
      GROUP BY articulo_id, interesado_id
    `);

    await queryRunner.query(`
      ALTER TABLE articulos_marketplace
        ADD COLUMN codigo_entrega CHAR(6) NULL,
        ADD COLUMN intentos_codigo TINYINT NOT NULL DEFAULT 0,
        ADD COLUMN fecha_reserva DATETIME NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE articulos_marketplace
        DROP COLUMN fecha_reserva,
        DROP COLUMN intentos_codigo,
        DROP COLUMN codigo_entrega
    `);
    await queryRunner.query(`DROP TABLE interesados_marketplace`);
  }
}
