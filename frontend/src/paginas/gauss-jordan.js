import { api } from '../api.js';
import { bloqueCodigo } from '../componentes/codigo.js';
import { crearEditor } from '../componentes/matriz.js';
import { $, chips, conCarga, error, metricas, montarTema, selectorEjemplos, vacio } from '../componentes/ui.js';
import { fmt, fmtTex, renderizar, tex, texAumentadaCon, texMatriz, texVector } from '../matematicas.js';

const TEORIA = String.raw`
<h2>Idea del método</h2>
<p class="subtitulo">Transformar \([A\mid\mathbf{b}]\) con operaciones elementales de fila hasta \([I\mid\mathbf{x}]\)</p>
<div class="grid-3">
  <article class="tarjeta">
    <span class="chip">Operación 1</span><h3>Intercambiar filas</h3>
    $$F_i \leftrightarrow F_j$$
    <p class="nota">Se usa para traer a la diagonal un pivote no nulo (y, con pivoteo parcial, el de mayor valor absoluto).</p>
  </article>
  <article class="tarjeta">
    <span class="chip">Operación 2</span><h3>Escalar una fila</h3>
    $$F_i \leftarrow \tfrac{1}{a_{ii}}\,F_i$$
    <p class="nota">Convierte el pivote en 1.</p>
  </article>
  <article class="tarjeta">
    <span class="chip">Operación 3</span><h3>Sumar un múltiplo</h3>
    $$F_k \leftarrow F_k - a_{ki}\,F_i,\quad k\neq i$$
    <p class="nota">Anula todos los demás elementos de la columna del pivote, <strong>arriba y abajo</strong>.</p>
  </article>
</div>

<div class="grid-2 separado">
  <div class="tarjeta">
    <h3>Algoritmo</h3>
    <ol class="lista-pasos">
      <li>Para cada columna \(j = 1,\dots,n\): elegir el pivote (fila con \(\max|a_{ij}|\) desde la fila actual).</li>
      <li>Intercambiar para subirlo; dividir su fila entre el pivote.</li>
      <li>Restar múltiplos de esa fila a <em>todas</em> las demás para hacer ceros en la columna.</li>
      <li>Al final, la matriz está en <strong>forma escalonada reducida</strong> (RREF) y la solución se lee en la última columna.</li>
    </ol>
  </div>
  <div class="tarjeta">
    <h3>Gauss frente a Gauss-Jordan</h3>
    <table class="tabla-comparar">
      <thead><tr><th></th><th>Gauss</th><th>Gauss-Jordan</th></tr></thead>
      <tbody>
        <tr><td>Forma final</td><td>Triangular superior</td><td>Identidad (RREF)</td></tr>
        <tr><td>Sustitución regresiva</td><td>Sí</td><td>No</td></tr>
        <tr><td>Operaciones (aprox.)</td><td>\(\tfrac{n^3}{3}\)</td><td>\(\tfrac{n^3}{2}\)</td></tr>
        <tr><td>Uso típico</td><td>Resolver \(A\mathbf{x}=\mathbf{b}\)</td><td>Inversa, rango, RREF</td></tr>
      </tbody>
    </table>
    <p class="nota">Gauss-Jordan hace ~50 % más operaciones, pero deja el resultado listo para leer.</p>
  </div>
</div>

<div class="grid-2 separado">
  <div class="tarjeta">
    <h3>Clasificación al terminar (Rouché-Frobenius)</h3>
    <ul class="lista-limpia">
      <li><span class="chip chip-ok">Única</span> un pivote en cada columna de \(A\): \(\operatorname{rango}A = n\).</li>
      <li><span class="chip">Infinitas</span> columnas sin pivote: esas \(x_j\) son <strong>variables libres</strong>.</li>
      <li><span class="chip chip-alerta">Ninguna</span> aparece una fila \([0\ \cdots\ 0 \mid c]\) con \(c \neq 0\).</li>
    </ul>
  </div>
  <div class="tarjeta">
    <h3>Inversa con \([A \mid I]\)</h3>
    <p>Aplicando las mismas operaciones a la identidad:</p>
    $$[A \mid I] \;\longrightarrow\; [I \mid A^{-1}]$$
    <p class="nota">Si alguna columna de \(A\) se queda sin pivote, \(A\) es singular y no tiene inversa.</p>
  </div>
</div>

<div class="banner">
  <h4>Ejemplo rápido</h4>
  $$\left[\begin{array}{cc|c}2&1&5\\1&-1&1\end{array}\right]
    \xrightarrow{F_1/2}
    \left[\begin{array}{cc|c}1&0.5&2.5\\1&-1&1\end{array}\right]
    \xrightarrow{F_2-F_1}
    \left[\begin{array}{cc|c}1&0.5&2.5\\0&-1.5&-1.5\end{array}\right]
    \xrightarrow[F_1-0.5F_2]{F_2/(-1.5)}
    \left[\begin{array}{cc|c}1&0&2\\0&1&1\end{array}\right]$$
  <p>Solución: \(x = 2,\ y = 1\).</p>
</div>`;

export default async function montar(el, { tema, pestana }) {
  const activar = montarTema(el, tema, [
    { id: 'teoria', titulo: 'Teoría', html: TEORIA },
    {
      id: 'simulador',
      titulo: 'Simulador paso a paso',
      html: `<div class="panel">
          <div class="controles">
            <div id="gj-ejemplos" class="crece"></div>
            <label class="campo">Modo
              <select id="gj-modo"><option value="sistema">Resolver [A | b]</option><option value="inversa">Inversa [A | I]</option></select>
            </label>
            <label class="interruptor"><input type="checkbox" id="gj-pivoteo" checked> Pivoteo parcial</label>
            <label class="interruptor" title="Resultados como fracciones (7/3) en lugar de decimales"><input type="checkbox" id="gj-exacto" checked> Fracciones exactas</label>
          </div>
          <div id="gj-editor"></div>
          <div class="acciones"><button class="btn" id="gj-resolver">Resolver con Gauss-Jordan</button></div>
        </div>
        <div id="gj-resultado" class="resultado" aria-live="polite">${vacio('Elige un ejemplo o escribe tu sistema y pulsa <strong>Resolver</strong>.')}</div>`,
    },
    {
      id: 'python',
      titulo: 'En Python',
      html: `<h2>Práctica en Python</h2><p class="subtitulo">Gauss-Jordan con pivoteo parcial y cálculo de la inversa.</p>${bloqueCodigo('03_gauss_jordan.py')}`,
    },
  ], pestana);

  const editor = crearEditor($('#gj-editor', el), {
    id: 'gj-matriz', m: 3, n: 3, maxM: 10, maxN: 10,
    A: [[2, 1, -1], [-3, -1, 2], [-2, 1, 2]], b: [8, -11, -3],
    alEnter: () => $('#gj-resolver', el).click(),
  });
  const modo = $('#gj-modo', el);

  try {
    const { ejemplos } = await api.ejemplos();
    const lista = ejemplos.gauss_jordan;
    $('#gj-ejemplos', el).innerHTML = selectorEjemplos('gj-ejemplo', lista);
    $('#gj-ejemplo', el).addEventListener('change', (e) => {
      const ej = lista.find((x) => x.id === e.target.value);
      if (!ej) return;
      modo.value = ej.modo;
      editor.cargar(ej.A, ej.b || ej.A.map(() => 0));
      $('#gj-resolver', el).click();
    });
  } catch {
    /* sin ejemplos: el editor sigue funcionando */
  }

  $('#gj-resolver', el).addEventListener('click', (e) =>
    conCarga(e.currentTarget, async () => {
      const salida = $('#gj-resultado', el);
      try {
        const { A, b } = editor.leer();
        const r = await api.gaussJordan({ A, b, modo: modo.value, pivoteo: $('#gj-pivoteo', el).checked, exacto: $('#gj-exacto', el).checked });
        const nombres = editor.nombres()?.map((v) => v.replace(/^([a-zA-Z]+)(\d+)$/, '$1_{$2}'));
        mostrar(salida, nombres ? { ...r, nombres } : r);
      } catch (err) {
        salida.innerHTML = error(err.message);
      }
    }),
  );
  return { activar };
}

export function mostrar(salida, r) {
  const sep = r.n;
  const pasos = r.pasos;
  let html = '';

  if (r.modo === 'sistema') {
    const tipo = { 'compatible determinado': 'ok', 'compatible indeterminado': '', incompatible: 'alerta' }[r.clasificacion];
    html += `<div class="tarjeta">${chips([
      [r.clasificacion, tipo], [`${r.m} × ${r.n}`], [`rango = ${r.rango}`],
      [`pivotes en columnas ${r.columnas_pivote.join(', ') || '—'}`],
      r.variables_libres.length ? [`libres: ${r.variables_libres.map((v) => `x${v}`).join(', ')}`] : null,
    ])}</div>`;
  } else {
    html += `<div class="tarjeta">${chips([
      [r.invertible ? 'invertible' : 'singular: no tiene inversa', r.invertible ? 'ok' : 'alerta'],
      [tex(`\\det A = ${r.determinante_tex}`)], [`rango = ${r.rango}`],
    ])}</div>`;
  }

  // Paso a paso con controles
  html += `<div class="tarjeta pasos-gj">
    <div class="pasos-barra">
      <h3>Paso <span data-num>1</span> de ${pasos.length}</h3>
      <div class="pasos-controles">
        <button class="btn btn-fantasma btn-pequeno" data-ir="-1" aria-label="Paso anterior">◀</button>
        <input type="range" min="0" max="${pasos.length - 1}" value="0" data-rango aria-label="Elegir paso">
        <button class="btn btn-fantasma btn-pequeno" data-ir="1" aria-label="Paso siguiente">▶</button>
        <button class="btn btn-fantasma btn-pequeno" data-todos>Ver todos</button>
      </div>
    </div>
    <div data-paso></div>
    <ol class="todos-pasos" data-lista hidden>${pasos.map((p, i) => `<li>${pasoHtml(p, sep, i)}</li>`).join('')}</ol>
  </div>`;

  if (r.modo === 'sistema') {
    if (r.clasificacion === 'incompatible') {
      html += `<div class="tarjeta alerta-suave"><h3>Sin solución</h3><p>Una fila quedó como \\([0\\ \\cdots\\ 0 \\mid c]\\) con \\(c \\neq 0\\): la ecuación \\(0 = c\\) es imposible.</p>
        <p class="nota">Si necesitas «la mejor aproximación», ese es el tema <a href="#/no-cuadrados/calculadora">3.5 · mínimos cuadrados</a>.</p></div>`;
    } else {
      const nombres = r.nombres || r.x.map((_, j) => `x_{${j + 1}}`);
      const xs = r.x_exacto || r.x;
      let sol = `\\begin{bmatrix}${nombres.join('\\\\')}\\end{bmatrix} = ${texVector(xs)}`;
      if (r.base_nucleo.length) {
        const libres = r.variables_libres.map((v) => nombres[v - 1]);
        sol += ` + ${r.base_nucleo_tex.map((v, k) => `${libres[k]}${texVector(v)}`).join(' + ')}`;
      }
      html += `<div class="grid-2">
        <div class="tarjeta destacada"><h3>Solución</h3><div class="formula-scroll">${tex(sol, true)}</div>
          ${r.base_nucleo.length ? `<p class="nota">Las variables libres ${r.variables_libres.map((v) => `x<sub>${v}</sub>`).join(', ')} pueden tomar cualquier valor real.</p>` : ''}
          <p class="nota">Comprobación: \\(\\lVert A\\mathbf{x}-\\mathbf{b}\\rVert = ${fmtTex(r.residuo)}\\)</p></div>
        <div class="tarjeta"><h3>Costo computacional</h3>${metricas([
          ['× y ÷ realizadas', r.operaciones.multiplicaciones_divisiones],
          ['Teórico G-J ≈ n³/2+n²', r.teoricas.gauss_jordan],
          ['Teórico Gauss ≈ n³/3+n²', r.teoricas.gauss],
        ])}</div>
      </div>`;
    }
  } else if (r.invertible) {
    html += `<div class="tarjeta destacada"><h3>Inversa</h3><div class="formula-scroll">${tex(`A^{-1} = ${texMatriz(r.inversa_exacta || r.inversa)}`, true)}</div>
      <p class="nota">Comprobación: \\(\\max|AA^{-1} - I| = ${fmtTex(r.verificacion)}\\)</p></div>`;
  }

  salida.innerHTML = html;
  renderizar(salida);

  const caja = salida.querySelector('.pasos-gj');
  const rango = caja.querySelector('[data-rango]');
  const ver = (i) => {
    i = Math.max(0, Math.min(pasos.length - 1, i));
    rango.value = i;
    caja.querySelector('[data-num]').textContent = i + 1;
    const destino = caja.querySelector('[data-paso]');
    destino.innerHTML = pasoHtml(pasos[i], sep, i);
    renderizar(destino);
  };
  caja.addEventListener('click', (e) => {
    const ir = e.target.closest('[data-ir]');
    if (ir) ver(Number(rango.value) + Number(ir.dataset.ir));
    if (e.target.closest('[data-todos]')) {
      const lista = caja.querySelector('[data-lista]');
      lista.hidden = !lista.hidden;
      caja.querySelector('[data-paso]').hidden = !lista.hidden;
      e.target.textContent = lista.hidden ? 'Ver todos' : 'Ver uno a uno';
    }
  });
  rango.addEventListener('input', () => ver(Number(rango.value)));
  ver(0);
}

function pasoHtml(p, sep, i) {
  const ops = p.operaciones.length
    ? `<div class="ops">${p.operaciones.map((o) => tex(o.tex)).join('<span class="sep-op">·</span>')}</div>`
    : '';
  return `<p class="desc-paso"><strong>${i === 0 ? 'Inicio' : `Paso ${i + 1}`}.</strong> ${p.descripcion}</p>${ops}
    <div class="formula-scroll">${tex(texAumentadaCon(p.exacta || p.matriz, sep, p.pivote), true)}</div>`;
}
