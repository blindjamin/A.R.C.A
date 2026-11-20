import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Contacto del vecino en su propia tabla (HU-37, decisión 016).
 *
 * El teléfono y la dirección de contacto vivían en `sesiones_ciudadano`, que
 * vence a los 7 días: el perfil quedaba vacío al volver a entrar y las
 * sesiones vencidas guardaban versiones viejas. Pasan a `contacto_ciudadano`,
 * una fila por vecino que dura lo que la cuenta. Va aparte de
 * `usuarios_ciudadanos` para que la identidad siga sin datos personales.
 *
 * Se copia el último valor que haya en una sesión y después se vacían las
 * columnas de la sesión, para no dejar copias.
 */
export class ContactoCiudadano1782164600000 implements MigrationInterface {
  name = 'ContactoCiudadano1782164600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE contacto_ciudadano (
        usuario_ciudadano_id VARCHAR(36) NOT NULL PRIMARY KEY,
        telefono VARCHAR(20) NULL,
        direccion TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_contacto_ciudadano_usuario
          FOREIGN KEY (usuario_ciudadano_id)
          REFERENCES usuarios_ciudadanos(id)
          ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      INSERT INTO contacto_ciudadano (usuario_ciudadano_id, telefono, direccion)
      SELECT s.usuario_ciudadano_id,
             MAX(s.telefono_sesion), MAX(s.direccion_sesion)
      FROM sesiones_ciudadano s
      JOIN (
        SELECT usuario_ciudadano_id, MAX(fecha_inicio) AS ultima
        FROM sesiones_ciudadano
        WHERE telefono_sesion IS NOT NULL OR direccion_sesion IS NOT NULL
        GROUP BY usuario_ciudadano_id
      ) m ON m.usuario_ciudadano_id = s.usuario_ciudadano_id
         AND m.ultima = s.fecha_inicio
      GROUP BY s.usuario_ciudadano_id
    `);

    await queryRunner.query(`
      UPDATE sesiones_ciudadano
        SET telefono_sesion = NULL, direccion_sesion = NULL
        WHERE telefono_sesion IS NOT NULL OR direccion_sesion IS NOT NULL
    `);
  }

  /** Pierde el contacto guardado: no se devuelve a las sesiones. */
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS contacto_ciudadano`);
  }
}
