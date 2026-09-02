import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import { ENTIDADES } from '@arca/core';

config({ path: '.env.local' });

// El glob __dirname + '/../**/*.entity' dejó de encontrar entidades cuando se
// movieron a packages/arca-core (migración de separación del panel admin,
// Fase 2): ya no viven bajo apps/backend/src. ENTIDADES es la lista explícita
// que las reemplaza — cualquier entidad nueva se agrega en
// packages/arca-core/src/entities/index.ts, no acá.
export default new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT ?? '3306', 10),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  entities: ENTIDADES,
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
});
