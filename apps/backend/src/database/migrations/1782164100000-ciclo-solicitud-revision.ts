import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Ciclo de revisión y derivación de solicitudes (spec `ciclo-solicitud`).
 *
 * Los retiros los ejecuta una empresa externa: el municipio ya no asigna
 * operadores, revisa y deriva. Por eso:
 * - `estado` pasa al ciclo nuevo y se agregan `estado_pago`, `monto`,
 *   `fecha_revision` y `revisado_por_id`.
 * - Se quitan `operador_asignado_id` y `fecha_programada`.
 * - `fecha_completada` pasa a `fecha_cierre` (cubre `retirada` y `no_realizada`).
 * - El rol `operador` pasa a `funcionario`.
 *
 * Los ENUM se cambian en tres pasos —ampliar, convertir, reducir— y antes de
 * reducir se verifica que no quede ningún valor viejo: en modo estricto MySQL
 * rechazaría el cambio y en modo no estricto dejaría el campo vacío. Mismo
 * criterio que `remove-rol-patrocinador`.
 *
 * El `down` es CON PÉRDIDA: los estados nuevos no tienen equivalente exacto
 * (`requiere_modificacion` → `pendiente`, `rechazada` → `cancelada`,
 * `no_realizada` → `asignada`) y se pierden monto, pago y revisor. Las
 * solicitudes quedan sin operador asignado.
 */
export class CicloSolicitudRevision1782164100000 implements MigrationInterface {
  name = 'CicloSolicitudRevision1782164100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // --- estado ---------------------------------------------------------------
    await queryRunner.query(`
      ALTER TABLE solicitudes_retiro
      MODIFY estado ENUM(
        'pendiente', 'asignada', 'en_proceso', 'completada', 'cancelada',
        'en_revision', 'requiere_modificacion', 'aprobada', 'rechazada',
        'derivada', 'retirada', 'no_realizada'
      ) DEFAULT 'en_revision'
    `);

    await this.convertir(queryRunner, 'solicitudes_retiro', 'estado', {
      pendiente: 'en_revision',
      asignada: 'aprobada',
      en_proceso: 'derivada',
      completada: 'retirada',
    });

    await queryRunner.query(`
      ALTER TABLE solicitudes_retiro
      MODIFY estado ENUM(
        'en_revision', 'requiere_modificacion', 'aprobada', 'rechazada',
        'derivada', 'retirada', 'no_realizada', 'cancelada'
      ) DEFAULT 'en_revision'
    `);

    // --- columnas -------------------------------------------------------------
    const fkOperador = await this.nombreFk(
      queryRunner,
      'solicitudes_retiro',
      'operador_asignado_id',
    );
    if (fkOperador) {
      await queryRunner.query(
        `ALTER TABLE solicitudes_retiro DROP FOREIGN KEY \`${fkOperador}\``,
      );
    }

    await queryRunner.query(`
      ALTER TABLE solicitudes_retiro
        DROP COLUMN operador_asignado_id,
        DROP COLUMN fecha_programada
    `);
    await queryRunner.query(`
      ALTER TABLE solicitudes_retiro
        RENAME COLUMN fecha_completada TO fecha_cierre
    `);
    await queryRunner.query(`
      ALTER TABLE solicitudes_retiro
        ADD COLUMN estado_pago ENUM('no_aplica', 'pendiente', 'pagado')
          NOT NULL DEFAULT 'no_aplica' AFTER estado
    `);
    await queryRunner.query(`
      ALTER TABLE solicitudes_retiro ADD COLUMN monto INT NULL AFTER estado_pago
    `);
    await queryRunner.query(`
      ALTER TABLE solicitudes_retiro
        ADD COLUMN fecha_revision TIMESTAMP NULL AFTER fecha_solicitud
    `);
    await queryRunner.query(`
      ALTER TABLE solicitudes_retiro
        ADD COLUMN revisado_por_id VARCHAR(36) NULL AFTER fecha_revision,
        ADD CONSTRAINT fk_solicitudes_revisado_por
          FOREIGN KEY (revisado_por_id)
          REFERENCES usuarios_administradores(id)
    `);

    // --- rol ------------------------------------------------------------------
    await queryRunner.query(`
      ALTER TABLE usuarios_administradores
      MODIFY rol ENUM('admin', 'operador', 'funcionario') NOT NULL
    `);

    await this.convertir(queryRunner, 'usuarios_administradores', 'rol', {
      operador: 'funcionario',
    });

    await queryRunner.query(`
      ALTER TABLE usuarios_administradores
      MODIFY rol ENUM('admin', 'funcionario') NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // --- rol ------------------------------------------------------------------
    await queryRunner.query(`
      ALTER TABLE usuarios_administradores
      MODIFY rol ENUM('admin', 'operador', 'funcionario') NOT NULL
    `);

    await this.convertir(queryRunner, 'usuarios_administradores', 'rol', {
      funcionario: 'operador',
    });

    await queryRunner.query(`
      ALTER TABLE usuarios_administradores
      MODIFY rol ENUM('admin', 'operador') NOT NULL
    `);

    // --- columnas -------------------------------------------------------------
    await queryRunner.query(`
      ALTER TABLE solicitudes_retiro
        DROP FOREIGN KEY fk_solicitudes_revisado_por
    `);

    await queryRunner.query(`
      ALTER TABLE solicitudes_retiro
        DROP COLUMN revisado_por_id,
        DROP COLUMN fecha_revision,
        DROP COLUMN monto,
        DROP COLUMN estado_pago
    `);
    await queryRunner.query(`
      ALTER TABLE solicitudes_retiro
        RENAME COLUMN fecha_cierre TO fecha_completada
    `);
    await queryRunner.query(`
      ALTER TABLE solicitudes_retiro
        ADD COLUMN fecha_programada TIMESTAMP NULL AFTER fecha_solicitud
    `);
    await queryRunner.query(`
      ALTER TABLE solicitudes_retiro
        ADD COLUMN operador_asignado_id VARCHAR(36) NULL AFTER fecha_completada,
        ADD CONSTRAINT fk_solicitudes_operador
          FOREIGN KEY (operador_asignado_id)
          REFERENCES usuarios_administradores(id)
    `);

    // --- estado ---------------------------------------------------------------
    await queryRunner.query(`
      ALTER TABLE solicitudes_retiro
      MODIFY estado ENUM(
        'pendiente', 'asignada', 'en_proceso', 'completada', 'cancelada',
        'en_revision', 'requiere_modificacion', 'aprobada', 'rechazada',
        'derivada', 'retirada', 'no_realizada'
      ) DEFAULT 'pendiente'
    `);

    await this.convertir(queryRunner, 'solicitudes_retiro', 'estado', {
      en_revision: 'pendiente',
      requiere_modificacion: 'pendiente',
      aprobada: 'asignada',
      no_realizada: 'asignada',
      derivada: 'en_proceso',
      retirada: 'completada',
      rechazada: 'cancelada',
    });

    await queryRunner.query(`
      ALTER TABLE solicitudes_retiro
      MODIFY estado ENUM(
        'pendiente', 'asignada', 'en_proceso', 'completada', 'cancelada'
      ) DEFAULT 'pendiente'
    `);
  }

  /**
   * Reemplaza valores de un ENUM y verifica que no quede ninguno de los viejos
   * antes de que el llamador reduzca la columna.
   */
  private async convertir(
    queryRunner: QueryRunner,
    tabla: string,
    columna: string,
    conversion: Record<string, string>,
  ): Promise<void> {
    for (const [viejo, nuevo] of Object.entries(conversion)) {
      await queryRunner.query(
        `UPDATE ${tabla} SET ${columna} = ? WHERE ${columna} = ?`,
        [nuevo, viejo],
      );
    }

    const viejos = Object.keys(conversion);
    const filas = (await queryRunner.query(
      `SELECT COUNT(*) AS total FROM ${tabla} WHERE ${columna} IN (${viejos
        .map(() => '?')
        .join(', ')})`,
      viejos,
    )) as Array<{ total: string | number }>;

    if (Number(filas[0]?.total ?? 0) > 0) {
      throw new Error(
        `Quedaron filas de ${tabla}.${columna} sin convertir (${viejos.join(', ')}).`,
      );
    }
  }

  /**
   * Nombre real de la FK de una columna. Se lee de `information_schema` porque
   * en bases creadas con `synchronize` TypeORM la nombra con un hash en vez de
   * `fk_solicitudes_operador`.
   */
  private async nombreFk(
    queryRunner: QueryRunner,
    tabla: string,
    columna: string,
  ): Promise<string | null> {
    const filas = (await queryRunner.query(
      `SELECT CONSTRAINT_NAME AS nombre
       FROM information_schema.KEY_COLUMN_USAGE
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = ?
         AND COLUMN_NAME = ?
         AND REFERENCED_TABLE_NAME IS NOT NULL`,
      [tabla, columna],
    )) as Array<{ nombre: string }>;

    return filas[0]?.nombre ?? null;
  }
}
