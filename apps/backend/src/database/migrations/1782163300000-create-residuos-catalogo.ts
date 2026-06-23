import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateResiduosCatalogo1782163300000 implements MigrationInterface {
  name = 'CreateResiduosCatalogo1782163300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE residuos_catalogo (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(255) NOT NULL UNIQUE,
        descripcion TEXT NULL,
        categoria VARCHAR(100) NOT NULL,
        subcategoria VARCHAR(100) NULL,
        puede_reutilizarse BOOLEAN DEFAULT TRUE,
        instrucciones_recogida TEXT NULL,
        foto_referencia_path VARCHAR(500) NULL,
        codigo_rae VARCHAR(50) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await queryRunner.query(`
      INSERT INTO residuos_catalogo (nombre, descripcion, categoria, subcategoria, puede_reutilizarse) VALUES
        ('Sofá', 'Mueble voluminoso de living', 'Muebles', 'Living', true),
        ('Refrigerador', 'Electrodoméstico grande', 'Electrónica', 'Electrodomésticos', true),
        ('Colchón', 'Colchón de cama', 'Muebles', 'Dormitorio', false),
        ('Escombros', 'Restos de construcción', 'Construcción', 'Escombros', false)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS residuos_catalogo`);
  }
}
