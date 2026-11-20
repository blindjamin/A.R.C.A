import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Siembra un funcionario con rol `admin`, distinto del operador demo.
 *
 * Hasta ahora el único funcionario sembrado era Camila (rol `operador`), así
 * que ninguna identidad podía alcanzar los endpoints restringidos a `admin` —
 * entre ellos la consulta del registro de auditoría (HU-14), que por decisión
 * del equipo solo puede leer una jefatura.
 *
 * Se siembra un segundo funcionario en vez de cambiarle el rol a Camila: con
 * los dos conviviendo se puede demostrar la diferencia entre roles, que es
 * justamente lo que hay que mostrar del control de acceso. Camila gestiona
 * solicitudes pero no ve la auditoría; Carlos ve ambas.
 *
 * La persona corresponde al perfil de administrador municipal documentado en
 * CLAUDE_proyecto.md §11 (Carlos Álvarez, funcionario TI municipal).
 *
 * TEMPORAL — solo para desarrollo y demo, igual que seed-operador-demo. Cuando
 * entre la auth real, los funcionarios se dan de alta desde el panel y el
 * municipio asigna los roles sobre identidades de ClaveÚnica reales.
 *
 * IDs fijos:
 *   - Ciudadano (identidad base): 00000000-0000-4000-8000-000000000003
 *   - Administrador:              00000000-0000-4000-8000-0000000000A3
 */
export class SeedAdminDemo1782163800000 implements MigrationInterface {
  name = 'SeedAdminDemo1782163800000';

  private readonly CIUDADANO_ID = '00000000-0000-4000-8000-000000000003';
  private readonly ADMIN_ID = '00000000-0000-4000-8000-0000000000A3';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1) Identidad base: requerida por la FK de usuarios_administradores.
    await queryRunner.query(`
      INSERT INTO usuarios_ciudadanos (id, clave_unica_id, fecha_registro, activo)
      VALUES (
        '${this.CIUDADANO_ID}',
        'demo-admin-claveunica',
        CURRENT_TIMESTAMP,
        true
      )
      ON DUPLICATE KEY UPDATE id = id
    `);

    // 2) Extensión de administrador con rol `admin`.
    await queryRunner.query(`
      INSERT INTO usuarios_administradores (
        id, usuario_ciudadano_id, nombre, apellido, email_institucional,
        telefono_institucional, rol, cargo, fecha_ingreso, activo
      )
      VALUES (
        '${this.ADMIN_ID}',
        '${this.CIUDADANO_ID}',
        'Carlos',
        'Álvarez',
        'carlos.alvarez@santodomingo.cl',
        '+56900000003',
        'admin',
        'Encargado de gestión de residuos voluminosos',
        CURRENT_TIMESTAMP,
        true
      )
      ON DUPLICATE KEY UPDATE id = id
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Orden inverso: primero la extensión admin, luego la identidad base.
    await queryRunner.query(
      `DELETE FROM usuarios_administradores WHERE id = '${this.ADMIN_ID}'`,
    );
    await queryRunner.query(
      `DELETE FROM usuarios_ciudadanos WHERE id = '${this.CIUDADANO_ID}'`,
    );
  }
}
