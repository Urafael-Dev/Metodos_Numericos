import { chips, metricas } from './ui.js';
import { renderizar, tex, texAumentadaCon, texMatriz, texVector } from '../matematicas.js';

const NOMBRE = { gauss: 'Eliminación de Gauss', lu: 'Factorización LU', cholesky: 'Factorización de Cholesky', cramer: 'Regla de Cramer' };

/** Muestra el resultado de /api/directos/<metodo>/ (Gauss, LU, Cholesky o Cramer). */
export async function mostrarDirecto(salida, r, nombres = null) {
  if (r.metodo === 'gauss' && r.aviso) {
    // Sin solución única: el backend devolvió el análisis de Gauss-Jordan.
    const { mostrar } = await import('../paginas/gauss-jordan.js');
    mostrar(salida, { ...r, nombres });
    salida.insertAdjacentHTML('afterbegin', `<div class="alerta">${r.aviso}</div>`);
    return;
  }
  const n = r.n;
  const vars = nombres || Array.from({ length: n }, (_, i) => `x_{${i + 1}}`);
  const solucion = `\\begin{bmatrix}${vars.join('\\\\')}\\end{bmatrix} = ${texVector(r.x_exacto || r.x_tex)}`;
  let html = `<div class="tarjeta">${chips([[NOMBRE[r.metodo], 'ok'], [`${n} × ${n}`], r.exacto ? ['fracciones exactas'] : ['decimales']])}</div>`;

  if (r.metodo === 'gauss') {
    html += `<div class="tarjeta"><h3>1 · Eliminación hacia adelante (triangular superior)</h3>
      ${r.pasos.map((p, i) => `<div class="iteracion"><p class="desc-paso"><strong>${i === 0 ? 'Inicio' : `Paso ${i + 1}`}.</strong> ${p.descripcion}</p>
        ${p.operaciones.length ? `<div class="ops">${p.operaciones.map((o) => tex(o.tex)).join('<span class="sep-op">·</span>')}</div>` : ''}
        <div class="formula-scroll">${tex(texAumentadaCon(p.exacta || p.matriz, n, p.pivote), true)}</div></div>`).join('')}
    </div>
    <div class="tarjeta"><h3>2 · Sustitución regresiva</h3>${r.sustitucion.map((s) => `<div class="formula-scroll">${tex(s.tex, true)}</div>`).join('')}</div>`;
  }

  if (r.metodo === 'lu') {
    html += `<div class="tarjeta"><h3>1 · Factorización PA = LU (Doolittle${r.permutacion.some((p, i) => p !== i + 1) ? ', con intercambios' : ''})</h3>
      ${r.pasos.map((p) => `<div class="iteracion"><h4>${p.descripcion}</h4>
        ${p.operaciones.length ? `<div class="ops">${p.operaciones.map((o) => tex(o.tex)).join('<span class="sep-op">·</span>')}</div>` : ''}
        <div class="formula-scroll">${tex(`L = ${texMatriz(p.L_exacta || p.L)},\\quad U = ${texMatriz(p.U_exacta || p.U)}`, true)}</div></div>`).join('')}
      <div class="formula-scroll">${tex(`P = ${texMatriz(r.P)},\\quad L = ${texMatriz(r.L_exacta || r.L)},\\quad U = ${texMatriz(r.U_exacta || r.U)}`, true)}</div>
      <p class="nota">Los multiplicadores \\(m_{ij}\\) son los elementos de \\(L\\) bajo la diagonal. Una vez factorizada, A sirve para cualquier \\(\\mathbf{b}\\).</p>
    </div>
    <div class="grid-2">
      <div class="tarjeta"><h3>2 · Sustitución progresiva \\(L\\mathbf{y} = P\\mathbf{b}\\)</h3>
        <p>${tex(`P\\mathbf{b} = ${texVector(r.Pb_tex)}`)}</p>${r.progresiva.map((s) => `<div class="formula-scroll">${tex(s.tex, true)}</div>`).join('')}</div>
      <div class="tarjeta"><h3>3 · Sustitución regresiva \\(U\\mathbf{x} = \\mathbf{y}\\)</h3>${r.regresiva.map((s) => `<div class="formula-scroll">${tex(s.tex, true)}</div>`).join('')}</div>
    </div>`;
  }

  if (r.metodo === 'cholesky') {
    html += `<div class="tarjeta"><h3>1 · Factorización \\(A = LL^T\\)</h3>
      <p class="nota">\\(l_{jj} = \\sqrt{a_{jj} - \\sum_{k \\lt j} l_{jk}^2}\\), \\(\\;l_{ij} = \\big(a_{ij} - \\sum_{k \\lt j} l_{ik}l_{jk}\\big)/l_{jj}\\)</p>
      ${r.pasos.map((s) => `<div class="formula-scroll">${tex(s.tex, true)}</div>`).join('')}
      <div class="formula-scroll">${tex(`L = ${texMatriz(r.L)}`, true)}</div></div>
    <div class="grid-2">
      <div class="tarjeta"><h3>2 · \\(L\\mathbf{y} = \\mathbf{b}\\)</h3>${r.progresiva.map((s) => `<div class="formula-scroll">${tex(s.tex, true)}</div>`).join('')}</div>
      <div class="tarjeta"><h3>3 · \\(L^T\\mathbf{x} = \\mathbf{y}\\)</h3>${r.regresiva.map((s) => `<div class="formula-scroll">${tex(s.tex, true)}</div>`).join('')}</div>
    </div>`;
  }

  if (r.metodo === 'cramer') {
    html += `<div class="tarjeta"><h3>Determinante del sistema</h3>
      <div class="formula-scroll">${tex(`\\det A = \\det ${texMatriz(r.A_exacta || r.A)} = ${r.det_tex}`, true)}</div></div>
      <div class="tarjeta"><h3>\\(x_i = \\det A_i / \\det A\\), con \\(A_i\\) = A con la columna i cambiada por b</h3>
      ${r.columnas.map((c) => `<div class="iteracion"><div class="formula-scroll">${tex(`\\det A_{${c.i}} = \\det ${texMatriz(c.Ai_exacta || c.Ai)} = ${c.det_tex}`, true)}</div>
        <div class="formula-scroll">${tex(c.tex, true)}</div></div>`).join('')}
      <p class="nota">Cramer necesita n + 1 determinantes: es cómodo a mano para 2 × 2 y 3 × 3, pero muy costoso para n grande.</p></div>`;
  }

  html += `<div class="tarjeta destacada"><h3>Solución</h3><div class="formula-scroll">${tex(solucion, true)}</div>
    ${r.operaciones ? metricas([['× y ÷ realizadas', r.operaciones.multiplicaciones_divisiones]]) : ''}</div>`;
  salida.innerHTML = html;
  renderizar(salida);
}
