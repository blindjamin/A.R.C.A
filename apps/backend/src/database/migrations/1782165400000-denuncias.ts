import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Denuncias entre vecinos del Marketplace (HU-16; las revisa el panel en HU-18).
 *
 * Sigue la tabla `denuncias` de `docs/ARCA_database_schema.dbml`, más dos
 * columnas que el esquema todavía no tiene:
 * - `origen`: desde dónde se denunció (artículo, perfil o chat).
 * - `mensajes_adjuntos`: copia de los mensajes del chat que el vecino adjunta
 *   como prueba. Copia y no referencia, porque el chat se borra a los 30 días;
 *   el funcionario ve solo estos, nunca la conversación completa.
 *
 * `articulo_id` queda en NULL si el artículo se borra: la denuncia se conserva.
 *
 * El `down` borra la tabla con sus datos.
 */
export class Denuncias1782165400000 implements MigrationInterface {
  name = 'Denuncias1782165400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE denuncias (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        usuario_denunciante_id VARCHAR(36) NOT NULL,
        usuario_denunciado_id VARCHAR(36) NOT NULL,
        articulo_id INT NULL,
        motivo VARCHAR(255) NOT NULL,
        descripcion TEXT NULL,
        origen VARCHAR(20) NOT NULL,
        mensajes_adjuntos JSON NULL,
        estado ENUM('abierta', 'investigacion', 'resuelta', 'rechazada')
          NOT NULL DEFAULT 'abierta',
        resolucion TEXT NULL,
        revisado_por_administrador_id VARCHAR(36) NULL,
        fecha_denuncia TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        fecha_resolucion TIMESTAMP NULL DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_denuncias_estado (estado, fecha_denuncia),
        INDEX idx_denuncias_denunciante (usuario_denunciante_id, fecha_denuncia),
        INDEX idx_denuncias_denunciado (usuario_denunciado_id),
        INDEX idx_denuncias_articulo (articulo_id),
        CONSTRAINT fk_denuncias_denunciante
          FOREIGN KEY (usuario_denunciante_id) REFERENCES usuarios_ciudadanos(id),
        CONSTRAINT fk_denuncias_denunciado
          FOREIGN KEY (usuario_denunciado_id) REFERENCES usuarios_ciudadanos(id),
        CONSTRAINT fk_denuncias_articulo
          FOREIGN KEY (articulo_id) REFERENCES articulos_marketplace(id)
          ON DELETE SET NULL,
        CONSTRAINT fk_denuncias_administrador
          FOREIGN KEY (revisado_por_administrador_id)
          REFERENCES usuarios_administradores(id)
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE denuncias`);
  }
}
