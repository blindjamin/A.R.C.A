import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Siembra un usuario demo con DOBLE ROL: la misma persona es ciudadano
 * (identidad base) Y funcionario municipal (extensión 1:1 sobre usuarios_ciudadanos).
 *
 * Modela el caso descrito en el schema: una persona entra con ClaveÚnica y, al
 * tener extensión de administrador, puede elegir "modo Vecino" o "modo Funcionario"
 * (el inicio diferido del frontend).
 *
 * TEMPORAL — solo para desarrollo/demo. No usar en producción: cuando entre la
 * auth real (JWT/ClaveÚnica), los funcionarios se darán de alta desde el panel.
 *
 * IDs fijos para poder copiarlos en el panel admin:
 *   - Ciudadano (identidad base): 00000000-0000-4000-8000-000000000002
 *   - Operador (operador_asignado_id en solicitudes): 00000000-0000-4000-8000-0000000000A2
 *
 * El ciudadano dev existente (…0001) se deja intacto, solo como ciudadano.
 */
export class SeedOperadorDemo1782163500000 implements MigrationInterface {
  name = 'SeedOperadorDemo1782163500000';

  private readonly CIUDADANO_ID = '00000000-0000-4000-8000-000000000002';
  private readonly OPERADOR_ID = '00000000-0000-4000-8000-0000000000A2';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1) Identidad base: la persona como ciudadano (requerida por la FK del admin).
    await queryRunner.query(`
      INSERT INTO usuarios_ciudadanos (id, clave_unica_id, fecha_registro, activo)
      VALUES (
        '${this.CIUDADANO_ID}',
        'demo-doble-rol-claveunica',
        CURRENT_TIMESTAMP,
        true
      )
      ON DUPLICATE KEY UPDATE id = id
    `);

    // 2) Extensión de administrador: la MISMA persona como operador municipal.
    await queryRunner.query(`
      INSERT INTO usuarios_administradores (
        id, usuario_ciudadano_id, nombre, apellido, email_institucional,
        telefono_institucional, rol, cargo, fecha_ingreso, activo
      )
      VALUES (
        '${this.OPERADOR_ID}',
        '${this.CIUDADANO_ID}',
        'Camila',
        'Operadora',
        'camila.operadora@santodomingo.cl',
        '+56900000002',
        'operador',
        'Operadora de retiros municipales',
        CURRENT_TIMESTAMP,
        true
      )
      ON DUPLICATE KEY UPDATE id = id
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Orden inverso: primero la extensión admin, luego la identidad base.
    await queryRunner.query(
      `DELETE FROM usuarios_administradores WHERE id = '${this.OPERADOR_ID}'`,
    );
    await queryRunner.query(
      `DELETE FROM usuarios_ciudadanos WHERE id = '${this.CIUDADANO_ID}'`,
    );
  }
}
