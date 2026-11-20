import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Chat del Marketplace (HU-06).
 *
 * - `mensajes_marketplace.interesado_id`: el vecino que pregunta. Una
 *   conversación es (artículo, interesado); el otro participante es siempre
 *   quien publicó. Las filas existentes (sembradas) se completan con el
 *   remitente que no es el publicador, o con el comprador; las que no tienen
 *   interlocutor se borran.
 * - `suscripciones_push`: una fila por navegador/dispositivo (Web Push).
 *
 * El `down` borra `suscripciones_push` y la columna `interesado_id`, con sus
 * datos.
 */
export class ChatMarketplace1782164700000 implements MigrationInterface {
  name = 'ChatMarketplace1782164700000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Primero NULL: la tabla puede tener mensajes sembrados (seed:dev).
    await queryRunner.query(`
      ALTER TABLE mensajes_marketplace
        ADD COLUMN interesado_id VARCHAR(36) NULL AFTER articulo_id
    `);

    // Quien escribe sin ser el publicador es el interesado.
    await queryRunner.query(`
      UPDATE mensajes_marketplace m
      JOIN articulos_marketplace a ON a.id = m.articulo_id
      SET m.interesado_id = m.usuario_remitente_id
      WHERE m.usuario_remitente_id <> a.usuario_publicador_id
    `);
    // Mensajes del publicador: el primer interesado del artículo o, si no
    // hay, quien reservó.
    await queryRunner.query(`
      UPDATE mensajes_marketplace m
      JOIN articulos_marketplace a ON a.id = m.articulo_id
      SET m.interesado_id = COALESCE(
        (SELECT x.usuario_remitente_id FROM (
           SELECT m2.articulo_id, m2.usuario_remitente_id
           FROM mensajes_marketplace m2
           JOIN articulos_marketplace a2 ON a2.id = m2.articulo_id
           WHERE m2.usuario_remitente_id <> a2.usuario_publicador_id
           ORDER BY m2.id
         ) x WHERE x.articulo_id = m.articulo_id LIMIT 1),
        a.usuario_comprador_id)
      WHERE m.interesado_id IS NULL
    `);
    // Sin interlocutor posible no hay conversación que conservar.
    await queryRunner.query(
      `DELETE FROM mensajes_marketplace WHERE interesado_id IS NULL`,
    );

    await queryRunner.query(`
      ALTER TABLE mensajes_marketplace
        MODIFY COLUMN interesado_id VARCHAR(36) NOT NULL,
        ADD INDEX idx_mensajes_conversacion (articulo_id, interesado_id, id),
        ADD INDEX idx_mensajes_interesado (interesado_id),
        ADD CONSTRAINT fk_mensajes_interesado
          FOREIGN KEY (interesado_id) REFERENCES usuarios_ciudadanos(id)
    `);

    await queryRunner.query(`
      CREATE TABLE suscripciones_push (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        usuario_ciudadano_id VARCHAR(36) NOT NULL,
        endpoint VARCHAR(500) NOT NULL,
        p256dh VARCHAR(255) NOT NULL,
        auth VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE INDEX uq_suscripciones_endpoint (endpoint),
        INDEX idx_suscripciones_usuario (usuario_ciudadano_id),
        CONSTRAINT fk_suscripciones_usuario
          FOREIGN KEY (usuario_ciudadano_id)
          REFERENCES usuarios_ciudadanos(id)
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE suscripciones_push`);
    await queryRunner.query(
      `ALTER TABLE mensajes_marketplace DROP FOREIGN KEY fk_mensajes_interesado`,
    );
    await queryRunner.query(`
      ALTER TABLE mensajes_marketplace
        DROP INDEX idx_mensajes_interesado,
        DROP INDEX idx_mensajes_conversacion,
        DROP COLUMN interesado_id
    `);
  }
}
