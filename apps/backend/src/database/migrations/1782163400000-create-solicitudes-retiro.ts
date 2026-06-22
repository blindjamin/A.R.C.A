import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSolicitudesRetiro1782163400000 implements MigrationInterface {
  name = 'CreateSolicitudesRetiro1782163400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE solicitudes_retiro (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        usuario_ciudadano_id VARCHAR(36) NOT NULL,
        residuo_catalogo_id INT NOT NULL,
        estado ENUM('pendiente', 'asignada', 'en_proceso', 'completada', 'cancelada') DEFAULT 'pendiente',
        descripcion TEXT NULL,
        direccion_anonimizada VARCHAR(255) NULL,
        latitud_capturada DECIMAL(10,8) NULL,
        longitud_capturada DECIMAL(11,8) NULL,
        fecha_solicitud TIMESTAMP NOT NULL,
        fecha_programada TIMESTAMP NULL,
        fecha_completada TIMESTAMP NULL,
        operador_asignado_id VARCHAR(36) NULL,
        razon_rechazo TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_solicitudes_usuario_ciudadano
          FOREIGN KEY (usuario_ciudadano_id)
          REFERENCES usuarios_ciudadanos(id),
        CONSTRAINT fk_solicitudes_residuo_catalogo
          FOREIGN KEY (residuo_catalogo_id)
          REFERENCES residuos_catalogo(id),
        CONSTRAINT fk_solicitudes_operador
          FOREIGN KEY (operador_asignado_id)
          REFERENCES usuarios_administradores(id)
      )
    `);

    await queryRunner.query(`
      INSERT INTO usuarios_ciudadanos (id, clave_unica_id, fecha_registro, activo)
      VALUES (
        '00000000-0000-4000-8000-000000000001',
        'dev-claveunica-test',
        CURRENT_TIMESTAMP,
        true
      )
      ON DUPLICATE KEY UPDATE id = id
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS solicitudes_retiro`);
  }
}
