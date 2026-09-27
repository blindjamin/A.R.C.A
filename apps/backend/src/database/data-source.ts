import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import { ENTIDADES } from '../core';

config({ path: '.env.local' });

// ENTIDADES es la lista explícita de entidades: cualquier entidad nueva se
// agrega en src/core/entities/index.ts, no acá.
export default new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT ?? '3306', 10),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  // Igual que en app.module.ts: sin esto, las fechas que escriba una migración
  // quedarían en la hora local del proceso y no en UTC.
  timezone: 'Z',
  entities: ENTIDADES,
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
});
