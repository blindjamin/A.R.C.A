import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Darse de baja y volver (HU-38, decisión 011).
 *
 * `usuarios_ciudadanos.fecha_baja`: cuándo el vecino se dio de baja. Distingue
 * la baja voluntaria (con fecha, puede volver solo tras 48 h) de una cuenta
 * desactivada por la Municipalidad (`activo = 0` sin fecha, que no vuelve sola).
 * Al volver se limpia.
 *
 * El `down` borra la columna: una baja en curso queda como desactivación
 * municipal y el vecino ya no puede volver solo.
 */
export class BajaCiudadano1782165000000 implements MigrationInterface {
  name = 'BajaCiudadano1782165000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE usuarios_ciudadanos
        ADD COLUMN fecha_baja DATETIME NULL AFTER activo
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE usuarios_ciudadanos
        DROP COLUMN fecha_baja
    `);
  }
}
