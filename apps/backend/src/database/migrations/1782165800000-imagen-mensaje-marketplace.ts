import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Foto en un mensaje del chat del Marketplace. Se guarda la ruta relativa a
 * `UPLOADS_DIR`, como las fotos de artículos; un mensaje solo con foto lleva
 * `contenido` vacío.
 */
export class ImagenMensajeMarketplace1782165800000 implements MigrationInterface {
  name = 'ImagenMensajeMarketplace1782165800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE mensajes_marketplace
        ADD COLUMN imagen_path VARCHAR(255) NULL AFTER contenido
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE mensajes_marketplace
        DROP COLUMN imagen_path
    `);
  }
}
