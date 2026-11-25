import katex from 'katex';
import renderMathInElement from 'katex/contrib/auto-render';

// Formato corto y estable: hasta 6 cifras significativas, sin "-0".
export function fmt(v, cifras = 6) {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  if (!Number.isFinite(v)) return v > 0 ? '∞' : '−∞';
  if (Math.abs(v) < 1e-10) return '0';
  const a = Math.abs(v);
  if (a >= 1e6 || a < 1e-4) return v.toExponential(3).replace('e', '·10^').replace('+', '');
  return String(Number(v.toPrecision(cifras)));
}

// Versión para LaTeX (notación científica como potencia de 10).
export function fmtTex(v, cifras = 6) {
  const s = fmt(v, cifras);
  const m = s.match(/^(-?[\d.]+)·10\^(-?\d+)$/);
  return m ? `${m[1]}\\times10^{${m[2]}}` : s.replace('∞', '\\infty');
}

export const texMatriz = (M) =>
  `\\begin{bmatrix}${M.map((f) => f.map((v) => fmtTex(v)).join('&')).join('\\\\')}\\end{bmatrix}`;

export const texVector = (v) => texMatriz(v.map((x) => [x]));

export function texAumentada(M) {
  const n = M[0].length - 1;
  const cols = `${'c'.repeat(n)}|c`;
  return `\\left[\\begin{array}{${cols}}${M.map((f) => f.map((v) => fmtTex(v)).join('&')).join('\\\\')}\\end{array}\\right]`;
}

export const tex = (s, display = false) =>
  katex.renderToString(s, { displayMode: display, throwOnError: false, strict: false });

export function renderizar(el) {
  renderMathInElement(el, {
    delimiters: [
      { left: '$$', right: '$$', display: true },
      { left: '\\(', right: '\\)', display: false },
    ],
    throwOnError: false,
    strict: false,
  });
}

// Admite "1,5" o "1.5" como decimal.
export function leerNumero(texto) {
  const limpio = String(texto).trim().replace(',', '.');
  if (limpio === '') return NaN;
  return Number(limpio);
}

export const escapar = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/**
 * Matriz aumentada con la barra vertical tras `sep` columnas y, opcionalmente,
 * el pivote [fila, col] (base 0) resaltado con un recuadro.
 */
export function texAumentadaCon(M, sep, pivote = null) {
  const total = M[0].length;
  const cols = `${'c'.repeat(sep)}|${'c'.repeat(total - sep)}`;
  const filas = M.map((f, i) =>
    f
      .map((v, j) => {
        const t = fmtTex(v, 5);
        return pivote && pivote[0] === i && pivote[1] === j ? `\\boxed{${t}}` : t;
      })
      .join('&'),
  );
  return `\\left[\\begin{array}{${cols}}${filas.join('\\\\')}\\end{array}\\right]`;
}

/** Ecuación lineal "a1 x1 + a2 x2 ... = b" en LaTeX, omitiendo coeficientes nulos. */
export function texEcuacion(fila, b, nombres = null) {
  let s = '';
  fila.forEach((a, j) => {
    if (Math.abs(a) < 1e-14) return;
    const v = nombres ? nombres[j] : `x_{${j + 1}}`;
    const abs = Math.abs(a);
    const coef = Math.abs(abs - 1) < 1e-14 ? '' : fmtTex(abs, 5);
    s += s ? (a < 0 ? ' - ' : ' + ') : a < 0 ? '-' : '';
    s += `${coef}${v}`;
  });
  return `${s || '0'} = ${fmtTex(b, 5)}`;
}

/** Lista de números escrita a mano: «1, 2, 3», «1 2 3», «1,5; 2,5» (coma decimal con ;). */
export function leerLista(texto) {
  const t = String(texto).trim();
  let partes;
  if (t.includes(';')) partes = t.split(';');
  else if (/\s/.test(t)) partes = t.split(/\s+/).map((p) => p.replace(/,$/, ''));
  else partes = t.split(',');
  return partes.map((p) => p.trim()).filter(Boolean).map(leerNumero);
}
