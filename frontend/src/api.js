// Cliente del backend de Django.
// En desarrollo Vite redirige /api al puerto 8000; en Vercel /api es la función de Django.
const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

async function pedir(ruta, opciones = {}) {
  let res;
  try {
    res = await fetch(`${BASE}/api${ruta}`, {
      headers: { 'Content-Type': 'application/json' },
      ...opciones,
    });
  } catch {
    throw new Error('No se pudo conectar con el backend. Revisa tu conexión o que Django esté corriendo.');
  }
  let datos = null;
  try {
    datos = await res.json();
  } catch {
    /* respuesta sin JSON */
  }
  if (!res.ok) throw new Error(datos?.error || `Error ${res.status} del servidor.`);
  return datos;
}

const post = (ruta, cuerpo) => pedir(ruta, { method: 'POST', body: JSON.stringify(cuerpo) });

let ejemplosCache = null;

export const api = {
  estado: () => pedir('/'),
  ejemplos: () => {
    ejemplosCache ??= pedir('/ejemplos/').catch((e) => {
      ejemplosCache = null;
      throw e;
    });
    return ejemplosCache;
  },
  resolver: (A, b) => post('/sistemas/resolver/', { A, b }),
  ajustar: (datos) => post('/ajuste/', datos),
  gaussJordan: (datos) => post('/directos/gauss-jordan/', datos),
  iterativos: (datos) => post('/iterativos/', datos),
  newton: (datos) => post('/no-lineales/newton/', datos),
  estabilidad: (datos) => post('/estabilidad/', datos),
  hilbert: () => pedir('/estabilidad/hilbert/'),
  historial: () => pedir('/historial/'),
  preguntas: () => pedir('/quiz/preguntas/'),
  enviarQuiz: (datos) => post('/quiz/enviar/', datos),
  ranking: () => pedir('/quiz/ranking/'),
};
