import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Marketplace P2P y Circular Credits (spec `marketplace` §3).
 *
 * - `articulos_marketplace`: estaba en el DBML pero ninguna migración la había
 *   creado. Suma tipo, foto, ubicación aproximada y fecha de expiración; no
 *   lleva promedio de estrellas porque la reputación es de la persona.
 * - `ratings`: una calificación por intercambio (índice único).
 * - `mensajes_marketplace`: para el chat (HU-06), si entra.
 * - `transacciones_circular_credits`: movimientos que solo se agregan. Suma
 *   `origen` y `solicitud_retiro_id`; los índices únicos aplican el tope de
 *   un otorgamiento por intercambio y por solicitud.
 * - `residuos_catalogo.creditos`: queda en NULL; mientras todos los objetos
 *   valgan lo mismo, el cálculo usa una constante.
 *
 * El `down` borra las cuatro tablas y la columna, con sus datos.
 */
export class MarketplaceCircularCredits1782164400000
  implements MigrationInterface
{
  name = 'MarketplaceCircularCredits1782164400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE articulos_marketplace (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        usuario_publicador_id VARCHAR(36) NOT NULL,
        residuo_catalogo_id INT NOT NULL,
        tipo ENUM('regalo', 'intercambio') NOT NULL,
        titulo VARCHAR(255) NOT NULL,
        descripcion TEXT NULL,
        estado ENUM('disponible', 'en_negociacion', 'retirado', 'completado')
          NOT NULL DEFAULT 'disponible',
        foto_path VARCHAR(500) NULL,
        latitud DECIMAL(10,8) NULL,
        longitud DECIMAL(11,8) NULL,
        fecha_publicacion TIMESTAMP NOT NULL,
        fecha_expiracion TIMESTAMP NOT NULL,
        usuario_comprador_id VARCHAR(36) NULL,
        fecha_transaccion TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_articulos_estado_expiracion (estado, fecha_expiracion),
        CONSTRAINT fk_articulos_publicador
          FOREIGN KEY (usuario_publicador_id)
          REFERENCES usuarios_ciudadanos(id),
        CONSTRAINT fk_articulos_comprador
          FOREIGN KEY (usuario_comprador_id)
          REFERENCES usuarios_ciudadanos(id),
        CONSTRAINT fk_articulos_residuo
          FOREIGN KEY (residuo_catalogo_id)
          REFERENCES residuos_catalogo(id)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE ratings (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        usuario_calificador_id VARCHAR(36) NOT NULL,
        usuario_calificado_id VARCHAR(36) NOT NULL,
        articulo_id INT NULL,
        puntuacion INT NOT NULL,
        comentario TEXT NULL,
        fecha_calificacion TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE INDEX uq_ratings_articulo_calificador (articulo_id, usuario_calificador_id),
        INDEX idx_ratings_calificado (usuario_calificado_id),
        CONSTRAINT fk_ratings_calificador
          FOREIGN KEY (usuario_calificador_id)
          REFERENCES usuarios_ciudadanos(id),
        CONSTRAINT fk_ratings_calificado
          FOREIGN KEY (usuario_calificado_id)
          REFERENCES usuarios_ciudadanos(id),
        CONSTRAINT fk_ratings_articulo
          FOREIGN KEY (articulo_id)
          REFERENCES articulos_marketplace(id)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE mensajes_marketplace (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        articulo_id INT NOT NULL,
        usuario_remitente_id VARCHAR(36) NOT NULL,
        contenido TEXT NOT NULL,
        fecha_mensaje TIMESTAMP NOT NULL,
        leido BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_mensajes_articulo (articulo_id, fecha_mensaje),
        CONSTRAINT fk_mensajes_articulo
          FOREIGN KEY (articulo_id)
          REFERENCES articulos_marketplace(id),
        CONSTRAINT fk_mensajes_remitente
          FOREIGN KEY (usuario_remitente_id)
          REFERENCES usuarios_ciudadanos(id)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE transacciones_circular_credits (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        usuario_ciudadano_id VARCHAR(36) NOT NULL,
        articulo_id INT NULL,
        solicitud_retiro_id INT NULL,
        monto_creditos INT NOT NULL,
        tipo ENUM('bonificacion', 'canje', 'ajuste') NOT NULL,
        origen ENUM('entrega', 'estrellas', 'retirada', 'ajuste') NOT NULL,
        razon TEXT NULL,
        otorgado_por_administrador_id VARCHAR(36) NULL,
        saldo_anterior INT NOT NULL,
        saldo_nuevo INT NOT NULL,
        fecha_transaccion TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_creditos_ciudadano_fecha (usuario_ciudadano_id, fecha_transaccion),
        UNIQUE INDEX uq_creditos_articulo_origen (articulo_id, origen),
        UNIQUE INDEX uq_creditos_solicitud (solicitud_retiro_id),
        CONSTRAINT fk_creditos_ciudadano
          FOREIGN KEY (usuario_ciudadano_id)
          REFERENCES usuarios_ciudadanos(id),
        CONSTRAINT fk_creditos_articulo
          FOREIGN KEY (articulo_id)
          REFERENCES articulos_marketplace(id),
        CONSTRAINT fk_creditos_solicitud
          FOREIGN KEY (solicitud_retiro_id)
          REFERENCES solicitudes_retiro(id),
        CONSTRAINT fk_creditos_administrador
          FOREIGN KEY (otorgado_por_administrador_id)
          REFERENCES usuarios_administradores(id)
      )
    `);

    await queryRunner.query(`
      ALTER TABLE residuos_catalogo
        ADD COLUMN creditos INT NULL AFTER precio
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE residuos_catalogo DROP COLUMN creditos`);
    await queryRunner.query(`DROP TABLE transacciones_circular_credits`);
    await queryRunner.query(`DROP TABLE mensajes_marketplace`);
    await queryRunner.query(`DROP TABLE ratings`);
    await queryRunner.query(`DROP TABLE articulos_marketplace`);
  }
}
