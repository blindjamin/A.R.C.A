import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  GUARDS_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { IS_PUBLIC_KEY } from './core/auth/decorators/public.decorator';
import { ROLES_KEY } from './core/auth/decorators/roles.decorator';
import { RolesGuard } from './core';
import { RolAdministrador } from './core/entities/rol-administrador.enum';

// Escalada de privilegios (SEGURIDAD_ARQUITECTURA §3.3): un vecino no debe
// poder llamar ninguna ruta del panel. RolesGuard deja pasar una ruta que no
// declara roles, así que un endpoint nuevo en /admin sin @Roles quedaría
// abierto a cualquier sesión. Este test recorre TODOS los controladores de la
// app y falla si alguna ruta /admin no exige un rol municipal.

type Clase = abstract new (...args: never[]) => unknown;

function archivosDeControladores(dir: string): string[] {
  return readdirSync(dir).flatMap((nombre) => {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) return archivosDeControladores(ruta);
    return nombre.endsWith('.controller.ts') ? [ruta] : [];
  });
}

function controladores(): Clase[] {
  return archivosDeControladores(__dirname).flatMap((archivo) =>
    // require y no import: la lista de archivos se arma al correr el test, para
    // que un controlador nuevo quede cubierto sin tener que agregarlo aquí.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    Object.values(require(archivo) as Record<string, unknown>).filter(
      (valor): valor is Clase =>
        typeof valor === 'function' &&
        Reflect.hasMetadata(PATH_METADATA, valor),
    ),
  );
}

function rutaDe(clase: Clase): string {
  const ruta = Reflect.getMetadata(PATH_METADATA, clase) as string | string[];
  return (Array.isArray(ruta) ? ruta[0] : ruta).replace(/^\//, '');
}

function manejadores(clase: Clase): [string, object][] {
  const proto = clase.prototype as Record<string, unknown>;
  return Object.getOwnPropertyNames(proto)
    .filter((nombre) => nombre !== 'constructor')
    .map((nombre): [string, unknown] => [nombre, proto[nombre]])
    .filter(
      (par): par is [string, object] =>
        typeof par[1] === 'function' &&
        Reflect.getMetadata(METHOD_METADATA, par[1]) !== undefined,
    );
}

const ROLES_MUNICIPALES: RolAdministrador[] = [
  RolAdministrador.ADMIN,
  RolAdministrador.FUNCIONARIO,
];

describe('Rutas /admin: ninguna queda sin rol municipal', () => {
  const todos = controladores();
  const delPanel = todos.filter((clase) => rutaDe(clase).startsWith('admin'));

  it('encuentra los controladores de la app y los del panel', () => {
    expect(todos.length).toBeGreaterThan(delPanel.length);
    expect(delPanel.length).toBeGreaterThanOrEqual(7);
  });

  it.each(delPanel.map((clase) => [clase.name, clase] as const))(
    '%s: cada ruta tiene RolesGuard y exige admin o funcionario',
    (_nombre, clase) => {
      const rutas = manejadores(clase);
      expect(rutas.length).toBeGreaterThan(0);

      for (const [nombre, manejador] of rutas) {
        const guards = [
          ...((Reflect.getMetadata(GUARDS_METADATA, clase) as unknown[]) ?? []),
          ...((Reflect.getMetadata(GUARDS_METADATA, manejador) as unknown[]) ??
            []),
        ];
        const roles = (Reflect.getMetadata(ROLES_KEY, manejador) ??
          Reflect.getMetadata(ROLES_KEY, clase)) as
          RolAdministrador[] | undefined;
        const publica = (Reflect.getMetadata(IS_PUBLIC_KEY, manejador) ??
          Reflect.getMetadata(IS_PUBLIC_KEY, clase)) as boolean | undefined;

        const ruta = `${clase.name}.${nombre}`;
        expect({ ruta, publica: Boolean(publica) }).toEqual({
          ruta,
          publica: false,
        });
        expect({ ruta, conRolesGuard: guards.includes(RolesGuard) }).toEqual({
          ruta,
          conRolesGuard: true,
        });
        expect({ ruta, roles: roles?.length ?? 0 }).not.toEqual({
          ruta,
          roles: 0,
        });
        for (const rol of roles ?? []) {
          expect(ROLES_MUNICIPALES).toContain(rol);
        }
      }
    },
  );
});
