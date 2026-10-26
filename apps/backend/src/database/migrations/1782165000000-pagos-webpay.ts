import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Comprobante de Webpay Plus (HU-44).
 *
 * Cada intento tiene su propia orden: anular o agotar el tiempo no impide
 * volver a pagar, y confirmar dos veces el mismo token no crea otro cobro.
 * El timestamp 1782165000000 queda después de contacto-ciudadano (…460) y de
 * los 1782164700000–490 que usan los PR de chat todavía abiertos.
 */
export class PagosWebpay1782165000000 implements MigrationInterface {
  name = 'PagosWebpay1782165000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE pagos_webpay (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        solicitud_retiro_id INT NOT NULL,
        buy_order VARCHAR(26) NOT NULL,
        session_id VARCHAR(61) NOT NULL,
        token VARCHAR(64) NOT NULL,
        monto INT NOT NULL,
        estado ENUM('iniciado', 'autorizado', 'anulado', 'agotado', 'rechazado') NOT NULL,
        codigo_autorizacion VARCHAR(6) NULL,
        fecha_transaccion TIMESTAMP NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_pagos_webpay_buy_order (buy_order),
        UNIQUE KEY uq_pagos_webpay_token (token),
        KEY idx_pagos_webpay_solicitud (solicitud_retiro_id),
        CONSTRAINT fk_pagos_webpay_solicitud
          FOREIGN KEY (solicitud_retiro_id)
          REFERENCES solicitudes_retiro(id)
          ON DELETE RESTRICT
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE pagos_webpay');
  }
}
