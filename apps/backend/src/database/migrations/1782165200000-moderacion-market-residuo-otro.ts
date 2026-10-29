import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Moderación municipal de Marketplace y soporte para residuos personalizados (fuera de catálogo).
 *
 * 1. `solicitudes_retiro`:
 *    - `residuo_catalogo_id` pasa a ser NULLABLE (para admitir ítems atípicos ingresados por texto libre).
 *    - `nombre_residuo_otro`: texto libre ingresado por el vecino cuando no elige del catálogo.
 *
 * 2. `articulos_marketplace`:
 *    - `estado`: añade 'pendiente_aprobacion' y 'rechazado'. Por defecto 'pendiente_aprobacion'.
 *    - `residuo_catalogo_id` pasa a ser NULLABLE.
 *    - `nombre_residuo_otro`: texto libre del artículo cuando no es de catálogo.
 *    - `motivo_rechazo`, `moderado_por_id`, `fecha_moderacion` para la trazabilidad municipal.
 */
export class ModeracionMarketResiduoOtro1782165200000
  implements MigrationInterface
{
  name = 'ModeracionMarketResiduoOtro1782165200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE solicitudes_retiro
        MODIFY COLUMN residuo_catalogo_id INT NULL,
        ADD COLUMN nombre_residuo_otro VARCHAR(150) NULL AFTER residuo_catalogo_id
    `);

    await queryRunner.query(`
      ALTER TABLE articulos_marketplace
        MODIFY COLUMN residuo_catalogo_id INT NULL,
        ADD COLUMN nombre_residuo_otro VARCHAR(150) NULL AFTER residuo_catalogo_id,
        MODIFY COLUMN estado ENUM('pendiente_aprobacion', 'disponible', 'en_negociacion', 'retirado', 'completado', 'rechazado')
          NOT NULL DEFAULT 'pendiente_aprobacion',
        ADD COLUMN motivo_rechazo TEXT NULL AFTER descripcion,
        ADD COLUMN moderado_por_id VARCHAR(36) NULL AFTER motivo_rechazo,
        ADD COLUMN fecha_moderacion DATETIME NULL AFTER moderado_por_id,
        ADD CONSTRAINT fk_articulos_moderador
          FOREIGN KEY (moderado_por_id)
          REFERENCES usuarios_administradores(id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE articulos_marketplace
        DROP FOREIGN KEY fk_articulos_moderador,
        DROP COLUMN fecha_moderacion,
        DROP COLUMN moderado_por_id,
        DROP COLUMN motivo_rechazo,
        MODIFY COLUMN estado ENUM('disponible', 'en_negociacion', 'retirado', 'completado')
          NOT NULL DEFAULT 'disponible',
        DROP COLUMN nombre_residuo_otro,
        MODIFY COLUMN residuo_catalogo_id INT NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE solicitudes_retiro
        DROP COLUMN nombre_residuo_otro,
        MODIFY COLUMN residuo_catalogo_id INT NOT NULL
    `);
  }
}
