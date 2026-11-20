import { generarHtmlCodigo, lineaContacto } from './mail-templates';

describe('mail-templates: contacto del pie', () => {
  const previo = process.env.MAIL_CONTACTO;
  afterEach(() => {
    if (previo === undefined) delete process.env.MAIL_CONTACTO;
    else process.env.MAIL_CONTACTO = previo;
  });

  it('usa MAIL_CONTACTO, escapado como texto', () => {
    expect(lineaContacto('dimao@santodomingo.cl')).toBe(
      'Para dudas comunícate a dimao@santodomingo.cl',
    );
    expect(lineaContacto('<b>x</b>')).toBe(
      'Para dudas comunícate a &lt;b&gt;x&lt;/b&gt;',
    );
  });

  it('sin MAIL_CONTACTO remite a la Municipalidad, sin correo', () => {
    expect(lineaContacto('')).toBe(
      'Para dudas comunícate con la Municipalidad',
    );
  });

  it('el correo nunca lleva el correo del equipo y lee la variable al generarse', () => {
    process.env.MAIL_CONTACTO = 'dimao@santodomingo.cl';
    const html = generarHtmlCodigo('123456');
    expect(html).toContain('dimao@santodomingo.cl');
    expect(html).not.toContain('soporte.arcaa');
  });
});
