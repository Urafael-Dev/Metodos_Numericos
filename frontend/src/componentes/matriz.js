import { api } from '../api.js';
import { escapar, leerNumero } from '../matematicas.js';

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
        ${conB ? '<button type="button" class="btn btn-fantasma btn-pequeno" data-accion="texto" aria-expanded="false">✎ Escribir ecuaciones</button>' : ''}
      </div>
      ${conB ? `<div class="entrada-texto" hidden>
        <label class="campo">Una ecuación por línea (o separadas por «;»)
          <textarea rows="4" spellcheck="false" placeholder="2x + y - z = 8&#10;-3x - y + 2z = -11&#10;-2x + y + 2z = -3"></textarea></label>
        <div class="acciones"><button type="button" class="btn btn-pequeno" data-accion="convertir">Pasar a la matriz</button>
          <span class="nota" data-estado-texto></span></div>
      </div>` : ''}
      <div class="matriz-entrada" role="group" aria-label="Matriz de coeficientes"></div>
      <p class="ayuda">Admite punto o coma decimal y fracciones como <code>1/3</code>. Enter resuelve; las flechas se mueven entre celdas.</p>
    </div>`;
  const raiz = contenedor.querySelector('.editor');
  const rejilla = raiz.querySelector('.matriz-entrada');
  const entradaM = raiz.querySelector('[data-dim="m"]');
  const entradaN = raiz.querySelector('[data-dim="n"]');
  let nombres = null;

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
    for (let j = 0; j < nn; j++) html += `<span>${nombres?.[j] ? escapar(nombres[j]) : `x<sub>${j + 1}</sub>`}</span>`;
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
    nombres = null;
    if (entradaM) entradaM.value = AA.length;
    entradaN.value = AA[0].length;
    dibujar(AA, bb);
  }

  const redimensionar = () => {
    nombres = null;
    const actual = leer({ silencioso: true });
    dibujar(actual?.A, actual?.b);
  };
  entradaN.addEventListener('change', redimensionar);
  entradaM?.addEventListener('change', redimensionar);

  raiz.addEventListener('click', (e) => {
    const accion = e.target.closest('[data-accion]')?.dataset.accion;
    if (!accion) return;
    if (accion === 'texto') {
      const caja = raiz.querySelector('.entrada-texto');
      caja.hidden = !caja.hidden;
      e.target.setAttribute('aria-expanded', String(!caja.hidden));
      if (!caja.hidden) caja.querySelector('textarea').focus();
      return;
    }
    if (accion === 'convertir') {
      convertirTexto();
      return;
    }
    nombres = null;
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

  async function convertirTexto() {
    const caja = raiz.querySelector('.entrada-texto');
    const estado = caja.querySelector('[data-estado-texto]');
    estado.classList.remove('error');
    estado.textContent = 'Interpretando…';
    try {
      const r = await api.interpretar(caja.querySelector('textarea').value);
      if (!r.lineal) throw new Error('El sistema no es lineal: resuélvelo con Newton o punto fijo (tema 3.1) o en «Resolver ejercicio».');
      if (cuadrada && r.m !== r.n) throw new Error(`Este método necesita un sistema cuadrado y el tuyo es ${r.m} × ${r.n}.`);
      if (r.m > maxM || r.n > maxN) throw new Error(`Este simulador admite hasta ${maxM} × ${maxN}.`);
      cargar(r.A_exacta, r.b_exacta);
      nombres = r.variables;
      dibujar(r.A_exacta, r.b_exacta);
      estado.textContent = `Listo: ${r.m} ecuaciones, incógnitas ${r.variables.join(', ')}.`;
      alEnter?.();
    } catch (err) {
      estado.classList.add('error');
      estado.textContent = err.message;
    }
  }

  dibujar(A, b);
  return { leer, cargar, dims, nombres: () => nombres };
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
