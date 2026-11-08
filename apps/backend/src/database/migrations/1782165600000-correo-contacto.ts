import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Correo verificado del vecino (HU-37).
 *
 * Hasta ahora vivía en memoria y en `sesiones_ciudadano.email_sesion`: se
 * perdía al cerrar sesión o al reiniciar. Pasa a `contacto_ciudadano`, que la
 * baja ya borra entera. No se copia el correo de la sesión: ese campo también
 * lo puede llenar ClaveÚnica y no prueba que el vecino lo haya verificado.
 */
export class CorreoContacto1782165600000 implements MigrationInterface {
  name = 'CorreoContacto1782165600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE contacto_ciudadano
        ADD COLUMN email VARCHAR(255) NULL AFTER direccion
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE contacto_ciudadano
        DROP COLUMN email
    `);
  }
}
