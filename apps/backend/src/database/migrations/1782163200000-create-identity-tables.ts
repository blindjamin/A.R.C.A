import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateIdentityTables1782163200000 implements MigrationInterface {
  name = 'CreateIdentityTables1782163200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE usuarios_ciudadanos (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        clave_unica_id VARCHAR(255) NOT NULL UNIQUE,
        fecha_registro TIMESTAMP NOT NULL,
        fecha_ultima_actividad TIMESTAMP NULL,
        activo BOOLEAN DEFAULT TRUE,
        ip_primera_login VARCHAR(45) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await queryRunner.query(`
      CREATE TABLE sesiones_ciudadano (
        session_id VARCHAR(36) NOT NULL PRIMARY KEY,
        usuario_ciudadano_id VARCHAR(36) NOT NULL,
        nombre_sesion VARCHAR(255) NULL,
        apellido_sesion VARCHAR(255) NULL,
        email_sesion VARCHAR(255) NULL,
        telefono_sesion VARCHAR(20) NULL,
        direccion_sesion TEXT NULL,
        latitud_sesion DECIMAL(10,8) NULL,
        longitud_sesion DECIMAL(11,8) NULL,
        jwt_token_hash VARCHAR(255) NULL,
        ip_sesion VARCHAR(45) NULL,
        user_agent TEXT NULL,
        fecha_inicio TIMESTAMP NOT NULL,
        fecha_expiracion TIMESTAMP NOT NULL,
        activa BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_sesiones_ciudadano_usuario
          FOREIGN KEY (usuario_ciudadano_id)
          REFERENCES usuarios_ciudadanos(id)
          ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE usuarios_administradores (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        usuario_ciudadano_id VARCHAR(36) NOT NULL UNIQUE,
        nombre VARCHAR(255) NOT NULL,
        apellido VARCHAR(255) NOT NULL,
        email_institucional VARCHAR(255) NOT NULL UNIQUE,
        telefono_institucional VARCHAR(20) NULL,
        rol ENUM('admin', 'operador', 'patrocinador') NOT NULL,
        cargo VARCHAR(150) NULL,
        fecha_ingreso TIMESTAMP NOT NULL,
        activo BOOLEAN DEFAULT TRUE,
        ip_ultimo_login VARCHAR(45) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_administradores_ciudadano
          FOREIGN KEY (usuario_ciudadano_id)
          REFERENCES usuarios_ciudadanos(id)
          ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE TABLE sesiones_administrador (
        session_id VARCHAR(36) NOT NULL PRIMARY KEY,
        usuario_administrador_id VARCHAR(36) NOT NULL,
        jwt_token_hash VARCHAR(255) NULL,
        ip_sesion VARCHAR(45) NULL,
        user_agent TEXT NULL,
        fecha_inicio TIMESTAMP NOT NULL,
        fecha_expiracion TIMESTAMP NOT NULL,
        activa BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_sesiones_administrador_usuario
          FOREIGN KEY (usuario_administrador_id)
          REFERENCES usuarios_administradores(id)
          ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS sesiones_administrador`);
    await queryRunner.query(`DROP TABLE IF EXISTS usuarios_administradores`);
    await queryRunner.query(`DROP TABLE IF EXISTS sesiones_ciudadano`);
    await queryRunner.query(`DROP TABLE IF EXISTS usuarios_ciudadanos`);
  }
}
