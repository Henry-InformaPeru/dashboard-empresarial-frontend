// Enlaces de un periodo: el del reporte de Power BI y el de descarga (MEGA).
//
// En Power BI, «Publicar en la web» muestra dos cosas en «Código para insertar»: el vínculo (https://app.powerbi.com/view?r=…) y el «HTML para pegar en un
// sitio web» (<iframe … src="ese mismo vínculo" …>). Quien carga los periodos pega cualquiera de los dos, o todo el mensaje que le mandó quien publicó el
// reporte. Aquí se saca el vínculo limpio: es lo único que se guarda y lo que dibuja el visor. Nunca se guarda ni se muestra el HTML pegado.
// Es la misma regla que aplica el servidor (backend: src/modules/periodos/domain/services/enlacesPeriodo.ts); aquí sirve para mostrar al instante qué se detectó
// y qué falta, antes de guardar. El servidor vuelve a validar.

export type EnlaceInvalido = { ok: false; motivo: string };
export type ResultadoPowerBi =
  { ok: true; url: string; titulo: string | null } | EnlaceInvalido;
export type ResultadoDescarga =
  { ok: true; url: string | null } | EnlaceInvalido;

const MAX_URL = 2048; // el largo de las columnas url_powerbi y url_mega

// Power BI (app.powerbi.com y sus subdominios) y su nuevo portal Fabric. Cualquier otro sitio no se acepta: el visor lo abriría dentro de la web.
const HOSTS_POWER_BI = /(^|\.)powerbi\.com$|^app\.fabric\.microsoft\.com$/i;
const HOSTS_MEGA = /(^|\.)(mega\.nz|mega\.io|mega\.co\.nz)$/i;

// El HTML escapa los & de la dirección como &amp;: se deshace para recuperar la dirección tal cual.
function sinEntidades(valor: string): string {
  return valor
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&');
}

// Valor de un atributo de una etiqueta (entre comillas dobles, simples o sin comillas). `(?:^|\s)` evita confundir src con data-src.
function atributo(etiqueta: string, nombre: string): string | null {
  const m = new RegExp(
    `(?:^|\\s)${nombre}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`,
    'i',
  ).exec(etiqueta);
  const valor = m ? (m[1] ?? m[2] ?? m[3]) : undefined;
  return valor === undefined ? null : sinEntidades(valor).trim();
}

function direccion(valor: string): URL | null {
  try {
    return new URL(valor);
  } catch {
    return null;
  }
}

function validarPowerBi(url: string, titulo: string | null): ResultadoPowerBi {
  const u = direccion(url);
  if (!u) {
    return {
      ok: false,
      motivo:
        'Ese texto no es un vínculo válido. El de Power BI empieza con https://app.powerbi.com/view?r=',
    };
  }
  if (u.protocol !== 'https:') {
    return {
      ok: false,
      motivo: 'El vínculo de Power BI debe empezar con https://',
    };
  }
  if (HOSTS_MEGA.test(u.hostname)) {
    return {
      ok: false,
      motivo:
        'Ese es un vínculo de MEGA. En este campo va el de Power BI; el de MEGA va en «Link Descarga».',
    };
  }
  if (!HOSTS_POWER_BI.test(u.hostname)) {
    return {
      ok: false,
      motivo: `Ese vínculo no es de Power BI (${u.hostname}). Debe empezar con https://app.powerbi.com/view?r=`,
    };
  }
  if (url.length > MAX_URL) {
    return { ok: false, motivo: 'El vínculo de Power BI es demasiado largo.' };
  }
  return { ok: true, url, titulo: titulo || null };
}

// Saca el vínculo del reporte de lo que se pegó: el HTML del iframe, el vínculo solo o un mensaje que trae uno de los dos.
// Si trae más de un reporte distinto se rechaza: elegir uno en silencio podría poner el reporte de otra empresa.
export function extraerEnlacePowerBi(entrada: unknown): ResultadoPowerBi {
  const texto = typeof entrada === 'string' ? entrada.trim() : '';
  if (!texto) {
    return {
      ok: false,
      motivo:
        'Pega el HTML de «Código para insertar» de Power BI, o su vínculo.',
    };
  }

  const candidatos = new Map<string, string | null>(); // vínculo -> título del iframe
  const marcos = texto.match(/<iframe\b[^>]*>/gi) ?? [];
  for (const marco of marcos) {
    const src = atributo(marco, 'src');
    if (src) candidatos.set(src, atributo(marco, 'title'));
  }
  if (marcos.length > 0 && candidatos.size === 0) {
    return {
      ok: false,
      motivo:
        'El HTML pegado no trae la dirección del reporte (src). Copia de nuevo el «HTML para pegar en un sitio web» de Power BI.',
    };
  }
  if (candidatos.size === 0) {
    for (const hallado of texto.match(/https?:\/\/[^\s"'<>]+/gi) ?? []) {
      candidatos.set(sinEntidades(hallado).replace(/[.,;:)\]]+$/, ''), null);
    }
  }

  if (candidatos.size === 0) {
    return {
      ok: false,
      motivo:
        'No encontré el vínculo del reporte. Pega el HTML de «Código para insertar» de Power BI, o su vínculo (https://app.powerbi.com/view?r=…).',
    };
  }
  if (candidatos.size > 1) {
    return {
      ok: false,
      motivo: `Pegaste ${candidatos.size} vínculos distintos. Pega solo el de este reporte.`,
    };
  }
  const [[url, titulo]] = [...candidatos];
  return validarPowerBi(url, titulo);
}

// Enlace de descarga (MEGA). Es opcional: vacío = sin descarga. Solo se acepta un vínculo https suelto; se rechaza HTML y el vínculo de Power BI
// (el error más fácil de cometer es pegar uno en el campo del otro).
export function validarEnlaceDescarga(entrada: unknown): ResultadoDescarga {
  const texto = typeof entrada === 'string' ? entrada.trim() : '';
  if (!texto) return { ok: true, url: null };

  if (/<\s*[a-z]/i.test(texto)) {
    return {
      ok: false,
      motivo: 'En «Link Descarga» va solo el vínculo de MEGA, sin HTML.',
    };
  }
  if (/\s/.test(texto)) {
    return {
      ok: false,
      motivo:
        'El vínculo de descarga no debe llevar espacios ni saltos de línea.',
    };
  }
  const u = direccion(texto);
  if (!u || u.protocol !== 'https:') {
    return {
      ok: false,
      motivo:
        'El vínculo de descarga debe empezar con https:// (el de MEGA empieza con https://mega.nz/).',
    };
  }
  if (HOSTS_POWER_BI.test(u.hostname)) {
    return {
      ok: false,
      motivo:
        'Ese es el vínculo de Power BI. En «Link Descarga» va el de MEGA.',
    };
  }
  if (texto.length > MAX_URL) {
    return {
      ok: false,
      motivo: 'El vínculo de descarga es demasiado largo.',
    };
  }
  return { ok: true, url: texto };
}

// Periodo siguiente al último cargado (AAAAMM); sin periodos, el mes actual.
export function periodoSiguiente(ultimo?: string | null, ahora = new Date()): string {
  if (ultimo && /^\d{4}(0[1-9]|1[0-2])$/.test(ultimo)) {
    let anio = Number(ultimo.slice(0, 4));
    let mes = Number(ultimo.slice(4)) + 1;
    if (mes > 12) {
      anio += 1;
      mes = 1;
    }
    return `${anio}${String(mes).padStart(2, '0')}`;
  }
  return `${ahora.getFullYear()}${String(ahora.getMonth() + 1).padStart(2, '0')}`;
}
