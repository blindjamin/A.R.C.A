import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Agrega la columna `creditos` a `articulos_marketplace` para almacenar
 * el valor en Circular Credits asignado por el funcionario al momento
 * de aprobar la publicación en el Marketplace.
 */
export class CreditosArticulosMarketplace1782165100000
  implements MigrationInterface
{
  name = 'CreditosArticulosMarketplace1782165100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE articulos_marketplace
        ADD COLUMN creditos INT NULL AFTER estado
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE articulos_marketplace
        DROP COLUMN creditos
    `);
  }
}
