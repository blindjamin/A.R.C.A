import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Reemplaza el catálogo de residuos (4 ítems genéricos, sin precio) por el
 * listado real de "costo retiro Voluminosos.xlsx" entregado por la
 * Municipalidad de Santo Domingo: 26 ítems específicos con precio real en
 * pesos (columna nueva `precio`).
 *
 * Supuestos NO provistos por el Excel (el archivo solo trae nombre, tamaño
 * estimado en m3 y precio) — a corregir por el equipo si no corresponden:
 *   - categoria/subcategoria: asignadas a mano siguiendo la taxonomía ya
 *     usada en el frontend (Línea Blanca, Electrónica, Muebles, Construcción).
 *   - puedeReutilizarse: true para muebles/electrodomésticos, false para
 *     colchones y artefactos sanitarios (mismo criterio ya usado para
 *     Colchón/Escombros en el seed original).
 *   - "Estufa a parafina" venía duplicado en el Excel (2 tamaños, mismo
 *     nombre) — se distinguen aquí como "(chica)"/"(grande)" porque
 *     `nombre` es UNIQUE.
 *
 * Borra también las solicitudes_retiro existentes: son datos de prueba del
 * usuario dev y referencian (FK) los ítems del catálogo viejo que se
 * eliminan acá. No hay solicitudes reales en este punto del proyecto.
 */
export class ReplaceCatalogoPreciosReales1782163600000
  implements MigrationInterface
{
  name = 'ReplaceCatalogoPreciosReales1782163600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE residuos_catalogo
        ADD COLUMN precio INT NOT NULL DEFAULT 0 COMMENT 'Precio de retiro en CLP (fuente: costo retiro Voluminosos.xlsx, municipalidad)'
    `);

    // Datos de prueba del usuario dev, dependientes del catálogo que se reemplaza.
    await queryRunner.query(`DELETE FROM solicitudes_retiro`);
    await queryRunner.query(`DELETE FROM residuos_catalogo`);

    await queryRunner.query(`
      INSERT INTO residuos_catalogo
        (nombre, descripcion, categoria, subcategoria, puede_reutilizarse, precio)
      VALUES
        ('Refrigerador 2 puertas grande', 'Tamaño estimado: 1.2 m3', 'Línea Blanca', 'Refrigeración', true, 21176),
        ('Refrigerador de 2 puertas', 'Tamaño estimado: 0.38 m3', 'Línea Blanca', 'Refrigeración', true, 6706),
        ('Lavadora 22 kg', 'Tamaño estimado: 0.51 m3', 'Línea Blanca', 'Lavado', true, 9000),
        ('Lavadora 16 kg', 'Tamaño estimado: 0.2 m3', 'Línea Blanca', 'Lavado', true, 3529),
        ('Cocina 4 quemadores', 'Tamaño estimado: 0.27 m3', 'Línea Blanca', 'Cocina', true, 4765),
        ('Cocina 5 quemadores', 'Tamaño estimado: 0.41 m3', 'Línea Blanca', 'Cocina', true, 7235),
        ('Cocina 6 quemadores', 'Tamaño estimado: 0.5 m3', 'Línea Blanca', 'Cocina', true, 8824),
        ('Estufa a parafina (chica)', 'Tamaño estimado: 0.048 m3', 'Línea Blanca', 'Calefacción', true, 847),
        ('Estufa a parafina (grande)', 'Tamaño estimado: 0.09 m3', 'Línea Blanca', 'Calefacción', true, 1588),
        ('Estufa a gas', 'Tamaño estimado: 0.07 m3', 'Línea Blanca', 'Calefacción', true, 1235),
        ('Colchón 1 plaza', 'Tamaño estimado: 0.3 m3', 'Muebles', 'Dormitorio', false, 5294),
        ('Colchón 1,5 plazas', 'Tamaño estimado: 0.54 m3', 'Muebles', 'Dormitorio', false, 9529),
        ('Colchón 2 plazas', 'Tamaño estimado: 0.7125 m3', 'Muebles', 'Dormitorio', false, 12573),
        ('Aspiradora', 'Tamaño estimado: 0.027 m3', 'Electrónica', 'Limpieza', true, 476),
        ('Microondas', 'Tamaño estimado: 0.04 m3', 'Electrónica', 'Cocina', true, 706),
        ('Horno eléctrico', 'Tamaño estimado: 0.033 m3', 'Electrónica', 'Cocina', true, 582),
        ('Televisor 21 pulgadas', 'Tamaño estimado: 0.14 m3', 'Electrónica', 'Entretenimiento', true, 2471),
        ('Sillón 1 cuerpo', 'Tamaño estimado: 0.45 m3', 'Muebles', 'Living', true, 7941),
        ('Sillón 2 cuerpos', 'Tamaño estimado: 0.87 m3', 'Muebles', 'Living', true, 15353),
        ('Sillón 3 cuerpos', 'Tamaño estimado: 1.95 m3', 'Muebles', 'Living', true, 34412),
        ('Silla de playa', 'Tamaño estimado: 0.2 m3', 'Muebles', 'Exterior', true, 3529),
        ('Colgador de ropa', 'Tamaño estimado: 0.06 m3', 'Muebles', 'Accesorios', true, 1059),
        ('Inodoro', 'Tamaño estimado: 0.048 m3', 'Construcción', 'Sanitarios', false, 847),
        ('Estanque de WC', 'Tamaño estimado: 0.033 m3', 'Construcción', 'Sanitarios', false, 582),
        ('Lavamanos', 'Tamaño estimado: 0.055 m3', 'Construcción', 'Sanitarios', false, 971),
        ('Lavaplatos', 'Tamaño estimado: 0.073 m3', 'Construcción', 'Sanitarios', false, 1288)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM solicitudes_retiro`);
    await queryRunner.query(`DELETE FROM residuos_catalogo`);

    await queryRunner.query(`
      INSERT INTO residuos_catalogo (nombre, descripcion, categoria, subcategoria, puede_reutilizarse) VALUES
        ('Sofá', 'Mueble voluminoso de living', 'Muebles', 'Living', true),
        ('Refrigerador', 'Electrodoméstico grande', 'Electrónica', 'Electrodomésticos', true),
        ('Colchón', 'Colchón de cama', 'Muebles', 'Dormitorio', false),
        ('Escombros', 'Restos de construcción', 'Construcción', 'Escombros', false)
    `);

    await queryRunner.query(`ALTER TABLE residuos_catalogo DROP COLUMN precio`);
  }
}
