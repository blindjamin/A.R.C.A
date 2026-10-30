import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  NotFoundException,
} from '@nestjs/common';
import type { Repository } from 'typeorm';
import {
  type ArticuloMarketplace,
  type AuditoriaService,
  type AuthUser,
  type Denuncia,
  EstadoArticuloMarketplace,
  type InteresadoMarketplace,
  type MensajeMarketplace,
  MotivoDenuncia,
  OrigenDenuncia,
} from '../core';
import { DenunciasService } from './denuncias.service';
import { TOPE_DENUNCIAS_POR_DIA } from './reglas-denuncias';

const PUBLICADOR = '00000000-0000-4000-8000-000000000001';
const INTERESADO = '00000000-0000-4000-8000-000000000002';
const OTRO = '00000000-0000-4000-8000-000000000003';
const AHORA = new Date('2026-10-29T12:00:00Z');

const usuario = (ciudadanoId: string) =>
  ({ ciudadanoId, esAdministrador: false }) as AuthUser;

const articulo = (extra: Partial<ArticuloMarketplace> = {}) =>
  ({
    id: 10,
    titulo: 'Silla de madera',
    usuarioPublicadorId: PUBLICADOR,
    usuarioCompradorId: null,
    estado: EstadoArticuloMarketplace.DISPONIBLE,
    fechaExpiracion: new Date('2026-11-20T00:00:00Z'),
    ...extra,
  }) as ArticuloMarketplace;

const conversacion = { id: 7, articuloId: 10, usuarioInteresadoId: INTERESADO };

const mensaje = (id: number, remitente: string) =>
  ({
    id,
    articuloId: 10,
    interesadoId: INTERESADO,
    usuarioRemitenteId: remitente,
    contenido: `mensaje ${id}`,
    fechaMensaje: new Date('2026-10-28T10:00:00Z'),
  }) as MensajeMarketplace;

function montar({
  art = articulo(),
  interes = conversacion,
  repetidas = 0,
  hoy = 0,
  mensajes = [] as MensajeMarketplace[],
} = {}) {
  const denunciaRepo = {
    count: jest
      .fn()
      .mockResolvedValueOnce(repetidas)
      .mockResolvedValueOnce(hoy),
    create: jest.fn((d: Partial<Denuncia>) => d),
    save: jest.fn((d: Partial<Denuncia>) => Promise.resolve({ ...d, id: 99 })),
    find: jest.fn(),
  };
  const articuloRepo = { findOne: jest.fn().mockResolvedValue(art) };
  const interesadoRepo = { findOne: jest.fn().mockResolvedValue(interes) };
  const mensajeRepo = { find: jest.fn().mockResolvedValue(mensajes) };
  const auditoria = { registrar: jest.fn().mockResolvedValue(undefined) };
  const service = new DenunciasService(
    denunciaRepo as unknown as Repository<Denuncia>,
    articuloRepo as unknown as Repository<ArticuloMarketplace>,
    interesadoRepo as unknown as Repository<InteresadoMarketplace>,
    mensajeRepo as unknown as Repository<MensajeMarketplace>,
    auditoria as unknown as AuditoriaService,
  );
  service.ahora = () => AHORA;
  return { service, denunciaRepo, interesadoRepo, mensajeRepo, auditoria };
}

const base = {
  articuloId: 10,
  origen: OrigenDenuncia.ARTICULO,
  motivo: MotivoDenuncia.NO_SE_PRESENTO,
};

describe('DenunciasService.crear', () => {
  it('el interesado denuncia a quien publicó, sin saber su id', async () => {
    const { service, denunciaRepo } = montar();

    await expect(service.crear(base, usuario(INTERESADO))).resolves.toEqual({
      id: 99,
    });
    expect(denunciaRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        usuarioDenuncianteId: INTERESADO,
        usuarioDenunciadoId: PUBLICADOR,
        articuloId: 10,
        mensajesAdjuntos: null,
        fechaDenuncia: AHORA,
      }),
    );
  });

  it('cualquier vecino que ve el artículo puede denunciar a quien lo publicó', async () => {
    const { service, denunciaRepo } = montar({ interes: null });

    await service.crear(
      { ...base, origen: OrigenDenuncia.PERFIL },
      usuario(OTRO),
    );
    expect(denunciaRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ usuarioDenunciadoId: PUBLICADOR }),
    );
  });

  it('un artículo que el vecino ya no puede ver responde 404', async () => {
    const { service } = montar({
      interes: null,
      art: articulo({ estado: EstadoArticuloMarketplace.EN_NEGOCIACION }),
    });

    await expect(service.crear(base, usuario(OTRO))).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('quien publicó denuncia al interesado de la conversación indicada', async () => {
    const { service, denunciaRepo, interesadoRepo } = montar();

    await service.crear(
      { ...base, origen: OrigenDenuncia.CHAT, conversacion: 7 },
      usuario(PUBLICADOR),
    );
    expect(interesadoRepo.findOne).toHaveBeenCalledWith({
      where: { id: 7, articuloId: 10 },
    });
    expect(denunciaRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ usuarioDenunciadoId: INTERESADO }),
    );
  });

  it('quien publicó tiene que indicar la conversación', async () => {
    const { service } = montar();

    await expect(
      service.crear(base, usuario(PUBLICADOR)),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('nadie se denuncia a sí mismo', async () => {
    const { service } = montar({
      interes: { ...conversacion, usuarioInteresadoId: PUBLICADOR },
    });

    await expect(
      service.crear({ ...base, conversacion: 7 }, usuario(PUBLICADOR)),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('no repite una denuncia abierta por el mismo intercambio', async () => {
    const { service, denunciaRepo } = montar({ repetidas: 1 });

    await expect(
      service.crear(base, usuario(INTERESADO)),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(denunciaRepo.save).not.toHaveBeenCalled();
  });

  it('corta en el tope diario', async () => {
    const { service } = montar({ hoy: TOPE_DENUNCIAS_POR_DIA });

    await expect(service.crear(base, usuario(INTERESADO))).rejects.toThrow(
      HttpException,
    );
  });

  it('copia los mensajes adjuntos de la conversación, marcando de quién es cada uno', async () => {
    const { service, denunciaRepo, mensajeRepo } = montar({
      mensajes: [mensaje(1, INTERESADO), mensaje(2, PUBLICADOR)],
    });

    await service.crear(
      { ...base, origen: OrigenDenuncia.CHAT, mensajes: [1, 2, 2] },
      usuario(INTERESADO),
    );
    expect(mensajeRepo.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          articuloId: 10,
          interesadoId: INTERESADO,
        }) as unknown,
      }),
    );
    expect(denunciaRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        mensajesAdjuntos: [
          {
            deQuien: 'denunciante',
            contenido: 'mensaje 1',
            fecha: '2026-10-28T10:00:00.000Z',
          },
          {
            deQuien: 'denunciado',
            contenido: 'mensaje 2',
            fecha: '2026-10-28T10:00:00.000Z',
          },
        ],
      }),
    );
  });

  it('rechaza mensajes que no son de esa conversación', async () => {
    const { service, denunciaRepo } = montar({
      mensajes: [mensaje(1, INTERESADO)],
    });

    await expect(
      service.crear({ ...base, mensajes: [1, 50] }, usuario(INTERESADO)),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(denunciaRepo.save).not.toHaveBeenCalled();
  });

  it('sin conversación no se pueden adjuntar mensajes', async () => {
    const { service } = montar({ interes: null });

    await expect(
      service.crear({ ...base, mensajes: [1] }, usuario(OTRO)),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('la auditoría no copia la descripción ni los mensajes', async () => {
    const { service, auditoria } = montar({
      mensajes: [mensaje(1, INTERESADO)],
    });

    await service.crear(
      { ...base, descripcion: 'No llegó y no contestó', mensajes: [1] },
      usuario(INTERESADO),
    );
    expect(auditoria.registrar).toHaveBeenCalledWith(
      expect.objectContaining({
        entidad: 'denuncias',
        entidadId: 99,
        datosNuevos: {
          articuloId: 10,
          motivo: MotivoDenuncia.NO_SE_PRESENTO,
          origen: OrigenDenuncia.ARTICULO,
          mensajesAdjuntos: 1,
        },
      }),
    );
  });
});

describe('DenunciasService.mias', () => {
  it('devuelve el estado de las propias, sin el denunciado ni la resolución', async () => {
    const { service, denunciaRepo } = montar();
    denunciaRepo.find.mockResolvedValue([
      {
        id: 1,
        articuloId: 10,
        articulo: { titulo: 'Silla de madera' },
        usuarioDenunciadoId: PUBLICADOR,
        resolucion: 'Se habló con el vecino',
        motivo: MotivoDenuncia.OTRO,
        origen: OrigenDenuncia.CHAT,
        estado: 'resuelta',
        fechaDenuncia: AHORA,
        fechaResolucion: AHORA,
      },
    ]);

    const [propia] = await service.mias(usuario(INTERESADO));
    expect(propia).toEqual({
      id: 1,
      articuloId: 10,
      articuloTitulo: 'Silla de madera',
      motivo: MotivoDenuncia.OTRO,
      origen: OrigenDenuncia.CHAT,
      estado: 'resuelta',
      fechaDenuncia: AHORA,
      fechaResolucion: AHORA,
    });
    expect(denunciaRepo.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { usuarioDenuncianteId: INTERESADO },
      }),
    );
  });
});
