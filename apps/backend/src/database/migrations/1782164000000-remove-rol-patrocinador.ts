import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Quita `patrocinador` de los roles de funcionario.
 *
 * El modelo definido por el equipo tiene tres roles: vecino (toda persona que
 * entra con ClaveÚnica, sin fila en `usuarios_administradores`), `operador` y
 * `admin`. `patrocinador` había quedado en el esquema sin corresponder a ese
 * modelo y sin que nadie lo tuviera asignado. El patrocinador municipal accede
 * al panel con rol `admin`.
 *
 * Antes de modificar la columna se verifica que ninguna fila use el valor. Con
 * filas existentes, MySQL rechaza el cambio en modo estricto y, en modo no
 * estricto, deja el rol vacío: ninguna de las dos cosas debe pasar en silencio.
 */
export class RemoveRolPatrocinador1782164000000 implements MigrationInterface {
  name = 'RemoveRolPatrocinador1782164000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const filas = (await queryRunner.query(
      `SELECT COUNT(*) AS total FROM usuarios_administradores WHERE rol = 'patrocinador'`,
    )) as Array<{ total: string | number }>;

    if (Number(filas[0]?.total ?? 0) > 0) {
      throw new Error(
        'Hay funcionarios con rol patrocinador: asignarles admin u operador antes de migrar.',
      );
    }

    await queryRunner.query(`
      ALTER TABLE usuarios_administradores
      MODIFY rol ENUM('admin', 'operador') NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE usuarios_administradores
      MODIFY rol ENUM('admin', 'operador', 'patrocinador') NOT NULL
    `);
  }
}
