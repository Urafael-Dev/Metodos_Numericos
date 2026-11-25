import { leerNumero } from '../matematicas.js';

/**
 * Editor de matriz aumentada [A | b] reutilizable.
 * - cuadrada: un solo control de tamaño n (A es n × n).
 * - conB: incluye la columna del vector b.
 * Enter en cualquier celda llama a alEnter; las flechas mueven el foco.
 */
export function crearEditor(contenedor, {
  id, m = 3, n = 3, A = null, b = null, cuadrada = false, conB = true,
  maxM = 10, maxN = 8, minN = 1, alEnter = null,
} = {}) {
  const controles = cuadrada
    ? `<label class="campo">Tamaño n <input type="number" min="${minN}" max="${maxN}" value="${n}" data-dim="n"></label>`
    : `<label class="campo">Ecuaciones m <input type="number" min="1" max="${maxM}" value="${m}" data-dim="m"></label>
       <label class="campo">Incógnitas n <input type="number" min="${minN}" max="${maxN}" value="${n}" data-dim="n"></label>`;
  contenedor.innerHTML = `
    <div class="editor" id="${id}">
      <div class="editor-barra">${controles}
        <button type="button" class="btn btn-fantasma btn-pequeno" data-accion="limpiar" title="Poner todo en cero">Limpiar</button>
        <button type="button" class="btn btn-fantasma btn-pequeno" data-accion="aleatorio" title="Valores aleatorios">Aleatorio</button>
      </div>
      <div class="matriz-entrada" role="group" aria-label="Matriz de coeficientes"></div>
      <p class="ayuda">Admite punto o coma decimal y fracciones como <code>1/3</code>. Enter resuelve; las flechas se mueven entre celdas.</p>
    </div>`;
  const raiz = contenedor.querySelector('.editor');
  const rejilla = raiz.querySelector('.matriz-entrada');
  const entradaM = raiz.querySelector('[data-dim="m"]');
  const entradaN = raiz.querySelector('[data-dim="n"]');

  const dims = () => {
    const nn = Math.min(maxN, Math.max(minN, Number(entradaN.value) || minN));
    const mm = cuadrada ? nn : Math.min(maxM, Math.max(1, Number(entradaM.value) || 1));
    entradaN.value = nn;
    if (entradaM) entradaM.value = mm;
    return [mm, nn];
  };

  function dibujar(AA = null, bb = null) {
    const [mm, nn] = dims();
    rejilla.style.setProperty('--cols', nn);
    rejilla.classList.toggle('sin-b', !conB);
    let html = '<div class="fila-cabecera">';
    for (let j = 0; j < nn; j++) html += `<span>x<sub>${j + 1}</sub></span>`;
    if (conB) html += '<span class="sep"></span><span>b</span>';
    html += '</div>';
    for (let i = 0; i < mm; i++) {
      html += '<div class="fila-matriz">';
      for (let j = 0; j < nn; j++) {
        const v = AA?.[i]?.[j] ?? (i === j ? 1 : 0);
        html += `<input inputmode="decimal" autocomplete="off" data-i="${i}" data-j="${j}" value="${formatear(v)}" aria-label="a ${i + 1},${j + 1}">`;
      }
      if (conB) html += `<span class="sep" aria-hidden="true">|</span><input inputmode="decimal" autocomplete="off" data-b="${i}" value="${formatear(bb?.[i] ?? 0)}" aria-label="b ${i + 1}">`;
      html += '</div>';
    }
    rejilla.innerHTML = html;
  }

  function leerValor(texto) {
    const t = String(texto).trim();
    const frac = t.match(/^(-?[\d.,]+)\s*\/\s*(-?[\d.,]+)$/);
    if (frac) return leerNumero(frac[1]) / leerNumero(frac[2]);
    return leerNumero(t);
  }

  function leer({ silencioso = false } = {}) {
    const [mm, nn] = dims();
    const A2 = Array.from({ length: mm }, () => Array(nn).fill(0));
    const b2 = Array(mm).fill(0);
    let malo = null;
    rejilla.querySelectorAll('input').forEach((inp) => {
      const v = leerValor(inp.value);
      const ok = Number.isFinite(v);
      inp.classList.toggle('invalido', !ok && !silencioso);
      if (!ok && !malo) malo = inp;
      if (inp.dataset.b !== undefined) b2[+inp.dataset.b] = v;
      else A2[+inp.dataset.i][+inp.dataset.j] = v;
    });
    if (malo) {
      if (silencioso) return null;
      malo.focus();
      throw new Error('Hay celdas vacías o que no son números (marcadas en rojo).');
    }
    return conB ? { A: A2, b: b2 } : { A: A2 };
  }

  function cargar(AA, bb = null) {
    if (entradaM) entradaM.value = AA.length;
    entradaN.value = AA[0].length;
    dibujar(AA, bb);
  }

  const redimensionar = () => {
    const actual = leer({ silencioso: true });
    dibujar(actual?.A, actual?.b);
  };
  entradaN.addEventListener('change', redimensionar);
  entradaM?.addEventListener('change', redimensionar);

  raiz.addEventListener('click', (e) => {
    const accion = e.target.closest('[data-accion]')?.dataset.accion;
    if (!accion) return;
    const [mm, nn] = dims();
    if (accion === 'limpiar') {
      dibujar(Array.from({ length: mm }, () => Array(nn).fill(0)), Array(mm).fill(0));
    } else {
      // Aleatorio con diagonal reforzada (cuadradas) para que los ejemplos suelan converger.
      const r = () => Math.round((Math.random() * 10 - 5) * 2) / 2;
      const AA = Array.from({ length: mm }, (_, i) => Array.from({ length: nn }, (_, j) => (cuadrada && i === j ? 0 : r())));
      if (cuadrada) AA.forEach((f, i) => { f[i] = f.reduce((s, v) => s + Math.abs(v), 0) + 1 + Math.floor(Math.random() * 4); });
      dibujar(AA, Array.from({ length: mm }, r));
    }
  });

  rejilla.addEventListener('keydown', (e) => {
    const inp = e.target.closest('input');
    if (!inp) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      alEnter?.();
      return;
    }
    const celdas = [...rejilla.querySelectorAll('input')];
    const [, nn] = dims();
    const ancho = nn + (conB ? 1 : 0);
    const k = celdas.indexOf(inp);
    const salto = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: ancho, ArrowUp: -ancho }[e.key];
    const fin = inp.selectionStart === inp.value.length;
    const inicio = inp.selectionStart === 0;
    if (salto && (Math.abs(salto) > 1 || (salto > 0 && fin) || (salto < 0 && inicio))) {
      const destino = celdas[k + salto];
      if (destino) {
        e.preventDefault();
        destino.focus();
        destino.select();
      }
    }
  });
  rejilla.addEventListener('focusin', (e) => e.target.select?.());

  dibujar(A, b);
  return { leer, cargar, dims };
}

function formatear(v) {
  if (typeof v !== 'number') return v;
  if (Number.isInteger(v)) return String(v);
  // Fracciones sencillas (1/3, 1/7…) se muestran exactas y caben en la celda.
  const corto = String(Number(v.toPrecision(10)));
  if (corto.length > 7) {
    for (let q = 2; q <= 30; q++) {
      const p = Math.round(v * q);
      if (Math.abs(v - p / q) < 1e-13) return `${p}/${q}`;
    }
  }
  return corto;
}
