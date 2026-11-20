import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedOperadoresPrueba1782163900000 implements MigrationInterface {
  name = 'SeedOperadoresPrueba1782163900000';

  private readonly OPS = [
    {
      cId: '00000000-0000-4000-8000-000000000004',
      aId: '00000000-0000-4000-8000-0000000000A4',
      nombre: 'Carlos',
      apellido: 'Rojas',
      rol: 'operador',
    },
    {
      cId: '00000000-0000-4000-8000-000000000005',
      aId: '00000000-0000-4000-8000-0000000000A5',
      nombre: 'María',
      apellido: 'Silva',
      rol: 'operador',
    },
    {
      cId: '00000000-0000-4000-8000-000000000006',
      aId: '00000000-0000-4000-8000-0000000000A6',
      nombre: 'Tomás',
      apellido: 'Ortega',
      rol: 'operador',
    },
    {
      cId: '00000000-0000-4000-8000-000000000007',
      aId: '00000000-0000-4000-8000-0000000000A7',
      nombre: 'Valentina',
      apellido: 'Ruiz',
      rol: 'admin',
    },
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const op of this.OPS) {
      await queryRunner.query(`
        INSERT INTO usuarios_ciudadanos (id, clave_unica_id, fecha_registro, activo)
        VALUES (
          '${op.cId}',
          'demo-op-claveunica-${op.aId}',
          CURRENT_TIMESTAMP,
          true
        )
        ON DUPLICATE KEY UPDATE id = id
      `);

      await queryRunner.query(`
        INSERT INTO usuarios_administradores (
          id, usuario_ciudadano_id, nombre, apellido, email_institucional,
          telefono_institucional, rol, cargo, fecha_ingreso, activo
        )
        VALUES (
          '${op.aId}',
          '${op.cId}',
          '${op.nombre}',
          '${op.apellido}',
          '${op.nombre.toLowerCase()}.${op.apellido.toLowerCase()}@santodomingo.cl',
          '+5690000000X',
          '${op.rol}',
          'Demo',
          CURRENT_TIMESTAMP,
          true
        )
        ON DUPLICATE KEY UPDATE id = id
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const op of this.OPS) {
      await queryRunner.query(
        `DELETE FROM usuarios_administradores WHERE id = '${op.aId}'`
      );
      await queryRunner.query(
        `DELETE FROM usuarios_ciudadanos WHERE id = '${op.cId}'`
      );
    }
  }
}
