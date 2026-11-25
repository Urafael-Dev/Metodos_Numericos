import { api } from '../api.js';
import { bloqueCodigo } from '../componentes/codigo.js';
import { COLORES, grafica } from '../componentes/graficas.js';
import { crearEditor } from '../componentes/matriz.js';
import { crearPlano, ventana } from '../componentes/plano.js';
import { $, chips, conCarga, css, error, montarTema, selectorEjemplos, vacio } from '../componentes/ui.js';
import { escapar, fmt, fmtTex, leerLista, renderizar, tex, texEcuacion, texVector } from '../matematicas.js';

const TEORIA = String.raw`
<h2>¿Qué es un sistema de ecuaciones?</h2>
<p class="subtitulo">Un conjunto de ecuaciones que deben cumplirse <strong>a la vez</strong></p>
<div class="grid-2">
  <article class="tarjeta">
    <span class="chip">Lineal</span>
    <h3>Sistema lineal</h3>
    <p>Las incógnitas aparecen solo con exponente 1, multiplicadas por constantes:</p>
    $$\begin{cases} a_{11}x_1 + \cdots + a_{1n}x_n = b_1\\ \quad\vdots \\ a_{m1}x_1 + \cdots + a_{mn}x_n = b_m\end{cases}
      \;\Longleftrightarrow\; A\mathbf{x} = \mathbf{b}$$
    <p class="nota">Geométricamente: rectas (2D), planos (3D) o hiperplanos. Se resuelven con métodos directos o iterativos (temas 3.2 a 3.5).</p>
  </article>
  <article class="tarjeta destacada">
    <span class="chip">No lineal</span>
    <h3>Sistema no lineal</h3>
    <p>Aparecen productos de incógnitas, potencias, funciones trigonométricas, exponenciales…</p>
    $$\begin{cases} x^2 + y^2 = 4\\ e^{x} + y = 1\end{cases}
      \;\Longleftrightarrow\; F(\mathbf{x}) = \mathbf{0}$$
    <p class="nota">Pueden tener 0, 1, varias o infinitas soluciones; casi nunca se resuelven a mano, así que se usan métodos iterativos como <strong>Newton-Raphson</strong>.</p>
  </article>
</div>

<h2 class="separado">Clasificación de un sistema lineal</h2>
<p class="subtitulo">Teorema de Rouché-Frobenius, con \(n\) incógnitas</p>
<div class="grid-3">
  <article class="tarjeta">
    <span class="chip chip-ok">Compatible determinado</span>
    $$\operatorname{rango}A = \operatorname{rango}[A\mid\mathbf{b}] = n$$
    <p>Solución <strong>única</strong>. En 2D, dos rectas que se cortan en un punto.</p>
  </article>
  <article class="tarjeta">
    <span class="chip">Compatible indeterminado</span>
    $$\operatorname{rango}A = \operatorname{rango}[A\mid\mathbf{b}] < n$$
    <p><strong>Infinitas</strong> soluciones. En 2D, rectas coincidentes.</p>
  </article>
  <article class="tarjeta">
    <span class="chip chip-alerta">Incompatible</span>
    $$\operatorname{rango}A < \operatorname{rango}[A\mid\mathbf{b}]$$
    <p><strong>Ninguna</strong> solución. En 2D, rectas paralelas distintas.</p>
  </article>
</div>

<h2 class="separado">Método de Newton-Raphson para sistemas</h2>
<div class="grid-2">
  <div class="tarjeta">
    <p>Se aproxima \(F\) cerca de \(\mathbf{x}^{(k)}\) por su recta (plano) tangente, usando la <strong>matriz jacobiana</strong>:</p>
    $$J(\mathbf{x}) = \begin{bmatrix} \dfrac{\partial f_1}{\partial x_1} & \cdots & \dfrac{\partial f_1}{\partial x_n}\\ \vdots & \ddots & \vdots \\ \dfrac{\partial f_n}{\partial x_1} & \cdots & \dfrac{\partial f_n}{\partial x_n}\end{bmatrix}$$
    $$J(\mathbf{x}^{(k)})\,\Delta^{(k)} = -F(\mathbf{x}^{(k)}),\qquad \mathbf{x}^{(k+1)} = \mathbf{x}^{(k)} + \Delta^{(k)}$$
  </div>
  <div class="tarjeta">
    <h3>Lo esencial</h3>
    <ul class="lista-limpia">
      <li><strong>Cada paso resuelve un sistema lineal</strong>: aquí se conectan los dos tipos de sistemas.</li>
      <li>Convergencia <strong>cuadrática</strong> cerca de la raíz: el número de cifras correctas se duplica en cada iteración.</li>
      <li>Necesita un buen punto inicial \(\mathbf{x}^{(0)}\) y que \(J\) no sea singular en el camino.</li>
      <li>Alternativa más simple pero lenta: <strong>punto fijo</strong>, \(\mathbf{x}^{(k+1)} = G(\mathbf{x}^{(k)})\).</li>
    </ul>
  </div>
</div>`;

const AYUDA_EXPR = 'Operadores: + − * / ^ · funciones: sin cos tan exp ln log sqrt abs · constantes: pi, e · se admite «=» (x^2 + y^2 = 4)';

export default async function montar(el, { tema, pestana }) {
  const activar = montarTema(el, tema, [
    { id: 'teoria', titulo: 'Teoría', html: TEORIA },
    {
      id: 'clasificar',
      titulo: 'Clasificar un sistema lineal',
      html: `<div class="panel">
          <p class="nota">Se reduce con Gauss-Jordan y se comparan los rangos. Con 2 incógnitas se dibujan las rectas.</p>
          <div class="controles">
            <button class="btn btn-fantasma btn-pequeno" data-caso="unica">Se cortan</button>
            <button class="btn btn-fantasma btn-pequeno" data-caso="paralelas">Paralelas</button>
            <button class="btn btn-fantasma btn-pequeno" data-caso="coincidentes">Coincidentes</button>
            <button class="btn btn-fantasma btn-pequeno" data-caso="tres">3 rectas, sin punto común</button>
          </div>
          <div id="li-editor"></div>
          <div class="acciones"><button class="btn" id="li-clasificar">Clasificar</button></div>
        </div>
        <div id="li-resultado" class="resultado" aria-live="polite">${vacio('Escribe un sistema o elige un caso.')}</div>`,
    },
    {
      id: 'newton',
      titulo: 'Newton para no lineales',
      html: `<div class="panel">
          <div class="controles"><div id="nw-ejemplos" class="crece"></div></div>
          <div class="controles">
            <label class="campo">Método
              <select id="nw-metodo"><option value="newton">Newton-Raphson</option><option value="punto_fijo">Punto fijo x = G(x)</option><option value="punto_fijo_seidel">Punto fijo tipo Seidel</option></select></label>
            <label class="campo">Variables <input id="nw-vars" value="x, y" title="Separadas por comas"></label>
            <label class="campo">x⁽⁰⁾ <input id="nw-x0" value="1, -1.7"></label>
            <label class="campo">Tolerancia <input id="nw-tol" value="1e-10"></label>
            <label class="campo">Máx. iteraciones <input id="nw-max" type="number" min="1" max="100" value="30"></label>
          </div>
          <div id="nw-ecuaciones" class="ecuaciones"></div>
          <p class="ayuda">${AYUDA_EXPR}</p>
          <p class="ayuda" id="nw-ayuda-pf" hidden>Punto fijo: escribe cada ecuación despejada como <code>x = g(x, y)</code>, p. ej. <code>x = (x^2 + y^2 + 8)/10</code>. Converge si \(\rho(J_G) < 1\) cerca de la solución.</p>
          <div class="acciones"><button class="btn" id="nw-resolver">Resolver con Newton</button></div>
        </div>
        <div id="nw-resultado" class="resultado" aria-live="polite">${vacio('Escribe las ecuaciones y pulsa <strong>Resolver</strong>.')}</div>`,
    },
    {
      id: 'python',
      titulo: 'En Python',
      html: `<h2>Práctica en Python</h2><p class="subtitulo">Clasificación por rangos y Newton-Raphson multivariable.</p>${bloqueCodigo('01_lineales_no_lineales.py')}`,
    },
  ], pestana);

  iniciarClasificador(el);
  await iniciarNewton(el);
  return { activar };
}

// ------------------------------------------------------------ Clasificador
const CASOS = {
  unica: [[[1, 1], [1, -1]], [3, 1]],
  paralelas: [[[1, 1], [2, 2]], [3, 7]],
  coincidentes: [[[1, 1], [2, 2]], [3, 6]],
  tres: [[[1, 0], [0, 1], [1, 1]], [1, 1, 0]],
};

function iniciarClasificador(el) {
  const editor = crearEditor($('#li-editor', el), {
    id: 'li-matriz', m: 2, n: 2, maxM: 10, maxN: 10, A: CASOS.unica[0], b: CASOS.unica[1],
    alEnter: () => $('#li-clasificar', el).click(),
  });
  el.querySelectorAll('[data-caso]').forEach((b) => b.addEventListener('click', () => {
    editor.cargar(...CASOS[b.dataset.caso]);
    $('#li-clasificar', el).click();
  }));
  $('#li-clasificar', el).addEventListener('click', (e) => conCarga(e.currentTarget, async () => {
    const salida = $('#li-resultado', el);
    try {
      const { A, b } = editor.leer();
      const r = await api.gaussJordan({ A, b, modo: 'sistema' });
      const rangoAb = r.clasificacion === 'incompatible' ? r.rango + 1 : r.rango;
      const tipo = { 'compatible determinado': 'ok', 'compatible indeterminado': '', incompatible: 'alerta' }[r.clasificacion];
      const sistema = `\\begin{cases}${A.map((f, i) => texEcuacion(f, b[i])).join('\\\\')}\\end{cases}`;
      let sol = '';
      if (r.x) {
        sol = `\\mathbf{x} = ${texVector(r.x)}`;
        if (r.base_nucleo.length) sol += ` + ${r.base_nucleo.map((v, k) => `t_{${k + 1}}${texVector(v)}`).join(' + ')}`;
      }
      salida.innerHTML = `<div class="grid-2">
        <div class="tarjeta">${chips([[r.clasificacion, tipo]])}
          <div class="formula-scroll">${tex(sistema, true)}</div>
          <p>${tex(`\\operatorname{rango}A = ${r.rango},\\quad \\operatorname{rango}[A\\mid\\mathbf{b}] = ${rangoAb},\\quad n = ${r.n}`)}</p>
          ${sol ? `<div class="formula-scroll">${tex(sol, true)}</div>` : '<p>No existe ningún \\(\\mathbf{x}\\) que cumpla todas las ecuaciones.</p>'}
          <p class="nota"><a href="#/gauss-jordan/simulador">Ver el paso a paso en Gauss-Jordan →</a></p>
        </div>
        <div class="tarjeta">${A[0].length === 2 ? '<div data-plano></div>' : '<p class="nota">La gráfica se muestra para sistemas de 2 incógnitas.</p>'}</div>
      </div>`;
      renderizar(salida);
      if (A[0].length === 2) {
        const c = COLORES();
        const paleta = [css('--acento'), c.jacobi, c.gauss_seidel, c.rojo, c.gris, c.texto];
        const plano = crearPlano(salida.querySelector('[data-plano]'), { alto: 320 });
        const centro = r.x && !r.base_nucleo.length ? [r.x] : [[0, 0]];
        plano.dibujar({
          ...ventana(centro, 8),
          rectas: A.map((f, i) => ({ a: f[0], b: f[1], c: b[i], color: paleta[i % paleta.length], etiqueta: `Ec. ${i + 1}` })),
          puntos: r.x && !r.base_nucleo.length ? [{ x: r.x[0], y: r.x[1], color: c.rojo, etiqueta: `(${fmt(r.x[0], 4)}, ${fmt(r.x[1], 4)})` }] : [],
          descripcion: 'Rectas del sistema',
        });
      }
    } catch (err) {
      salida.innerHTML = error(err.message);
    }
  }));
}

// ------------------------------------------------------------ Newton
async function iniciarNewton(el) {
  const caja = $('#nw-ecuaciones', el);
  const pintarEcuaciones = (lista) => {
    caja.innerHTML = lista
      .map((e, i) => `<label class="campo ecuacion"><span>f<sub>${i + 1}</sub> :</span><input data-ec value="${escapar(e)}" spellcheck="false" autocomplete="off"></label>`)
      .join('');
  };
  const varsInput = $('#nw-vars', el);
  const sincronizar = () => {
    const vars = varsInput.value.split(/[,\s]+/).filter(Boolean);
    const actuales = [...caja.querySelectorAll('[data-ec]')].map((i) => i.value);
    pintarEcuaciones(vars.map((_, i) => actuales[i] ?? ''));
  };
  varsInput.addEventListener('change', sincronizar);
  pintarEcuaciones(['x^2 + y^2 = 4', 'exp(x) + y = 1']);

  try {
    const lista = (await api.ejemplos()).ejemplos.no_lineales;
    $('#nw-ejemplos', el).innerHTML = selectorEjemplos('nw-ejemplo', lista);
    $('#nw-ejemplo', el).addEventListener('change', (e) => {
      const ej = lista.find((x) => x.id === e.target.value);
      if (!ej) return;
      metodoSel.value = 'newton';
      $('#nw-ayuda-pf', el).hidden = true;
      varsInput.value = ej.variables.join(', ');
      $('#nw-x0', el).value = ej.x0.join(', ');
      pintarEcuaciones(ej.ecuaciones);
      $('#nw-resolver', el).click();
    });
  } catch {
    /* sin ejemplos */
  }

  const metodoSel = $('#nw-metodo', el);
  metodoSel.addEventListener('change', () => {
    const pf = metodoSel.value !== 'newton';
    $('#nw-ayuda-pf', el).hidden = !pf;
    if (pf && ![...caja.querySelectorAll('[data-ec]')].every((i) => /^\s*[a-zA-Z]\w*\s*=/.test(i.value))) {
      varsInput.value = 'x, y';
      $('#nw-x0', el).value = '0, 0';
      pintarEcuaciones(['x = (x^2 + y^2 + 8)/10', 'y = (x*y^2 + x + 8)/10']);
    }
    $('#nw-max', el).value = pf ? 100 : 30;
  });

  caja.addEventListener('keydown', (e) => { if (e.key === 'Enter') $('#nw-resolver', el).click(); });

  $('#nw-resolver', el).addEventListener('click', (e) => conCarga(e.currentTarget, async () => {
    const salida = $('#nw-resultado', el);
    try {
      const variables = varsInput.value.split(/[,\s]+/).filter(Boolean);
      const ecuaciones = [...caja.querySelectorAll('[data-ec]')].map((i) => i.value);
      const x0 = leerLista($('#nw-x0', el).value);
      if (x0.length !== variables.length || x0.some((v) => !Number.isFinite(v))) {
        throw new Error(`x⁽⁰⁾ debe tener ${variables.length} números.`);
      }
      const metodo = $('#nw-metodo', el).value;
      const comun = { variables, ecuaciones, x0, tol: $('#nw-tol', el).value, max_iter: $('#nw-max', el).value };
      if (metodo === 'newton') mostrarNewton(salida, await api.newton(comun));
      else mostrarPuntoFijo(salida, await api.puntoFijo({ ...comun, seidel: metodo === 'punto_fijo_seidel' }));
    } catch (err) {
      salida.innerHTML = error(err.message);
    }
  }));
  $('#nw-resolver', el).click();
}

const ESTADOS_NEWTON = {
  converge: ['converge', 'ok'],
  max_iter: ['no alcanzó la tolerancia', 'alerta'],
  diverge: ['diverge', 'alerta'],
  jacobiana_singular: ['jacobiana singular: cambia x⁽⁰⁾', 'alerta'],
  fuera_dominio: ['salió del dominio de alguna función', 'alerta'],
};

export function mostrarNewton(salida, r) {
  const n = r.variables.length;
  const vars = r.variables;
  const [txt, tipo] = ESTADOS_NEWTON[r.estado];
  const F = `F(${vars.join(',')}) = \\begin{bmatrix}${r.F_tex.join('\\\\')}\\end{bmatrix}`;
  const sol = r.x.map((v, i) => `${vars[i]} = ${fmtTex(v, 12)}`).join(',\\quad ');
  const h1 = r.historial.find((h) => h.J && h.delta);
  let html = `<div class="tarjeta">${chips([
    [txt, tipo], [`${r.iteraciones} iteraciones`],
    r.orden_estimado ? [`orden estimado ≈ ${fmt(r.orden_estimado, 3)}`, r.orden_estimado > 1.7 ? 'ok' : ''] : null,
  ])}
    <div class="grid-2">
      <div class="formula-scroll">${tex(F, true)}</div>
      <div class="formula-scroll">${tex(`J = ${r.J_tex}`, true)}</div>
    </div>
    <div class="formula-scroll resaltado-final">${tex(sol, true)}</div>
  </div>`;

  if (h1) {
    html += `<div class="tarjeta"><h3>Primera iteración, desarrollada</h3>
      <div class="formula-scroll">${tex(`J(\\mathbf{x}^{(0)})\\,\\Delta = -F(\\mathbf{x}^{(0)}):\\quad
        \\begin{bmatrix}${h1.J.map((f) => f.map((v) => fmtTex(v, 5)).join('&')).join('\\\\')}\\end{bmatrix}\\Delta =
        ${texVector(h1.F.map((v) => -v))}`, true)}</div>
      <div class="formula-scroll">${tex(`\\Delta = ${texVector(h1.delta)},\\qquad \\mathbf{x}^{(1)} = ${texVector(h1.x)} + ${texVector(h1.delta)} = ${texVector(r.historial[1].x)}`, true)}</div>
      <p class="nota">Este sistema lineal se resuelve con un método directo (tema 3.3) en cada iteración.</p>
    </div>`;
  }

  html += `<div class="grid-2">
    <div class="tarjeta"><h3>‖F(x⁽ᵏ⁾)‖ por iteración</h3><div class="grafica grafica-media"><canvas data-conv></canvas></div>
      <p class="nota">En escala logarítmica, la caída cada vez más empinada es la firma de la convergencia cuadrática.</p></div>
    <div class="tarjeta">${n === 2 ? '<h3>Curvas f₁ = 0 y f₂ = 0</h3><div data-plano></div>' : '<h3>Interpretación</h3><p>Con 3 o más variables, cada ecuación es una superficie; la solución es su intersección común.</p>'}</div>
  </div>`;

  html += `<details class="tarjeta"><summary><h3>Tabla de iteraciones</h3></summary><div class="tabla-contenedor"><table>
    <thead><tr><th>k</th>${vars.map((v) => `<th>${escapar(v)}</th>`).join('')}<th>‖F‖∞</th><th>‖Δ‖∞</th></tr></thead>
    <tbody>${r.historial.map((h) => `<tr><td>${h.k}</td>${h.x.map((v) => `<td>${fmt(v, 12)}</td>`).join('')}<td>${h.norma_F == null ? '—' : fmt(h.norma_F, 3)}</td><td>${h.norma_delta == null ? '—' : fmt(h.norma_delta, 3)}</td></tr>`).join('')}</tbody>
  </table></div></details>`;

  salida.innerHTML = html;
  renderizar(salida);

  const c = COLORES();
  grafica(salida.querySelector('[data-conv]'), {
    type: 'line',
    data: {
      datasets: [{
        label: '‖F‖∞',
        data: r.historial.filter((h) => h.norma_F > 0).map((h) => ({ x: h.k, y: h.norma_F })),
        borderColor: c.sor, backgroundColor: c.sor, pointRadius: 3, borderWidth: 2.5,
      }],
    },
    options: { parsing: false, scales: { x: { type: 'linear', title: { text: 'k' } }, y: { type: 'logarithmic', title: { text: '‖F‖' } } } },
  });

  if (n === 2 && r.malla) {
    const m = r.malla;
    const plano = crearPlano(salida.querySelector('[data-plano]'), { alto: 320 });
    plano.dibujar({
      xr: m.x, yr: m.y,
      contornos: [
        { valores: m.F[0], xr: m.x, yr: m.y, color: css('--acento'), etiqueta: 'f₁ = 0' },
        { valores: m.F[1], xr: m.x, yr: m.y, color: c.jacobi, etiqueta: 'f₂ = 0' },
      ],
      caminos: [{ puntos: r.historial.map((h) => h.x), color: c.gauss_seidel, etiqueta: 'iteraciones de Newton', numerar: true }],
      puntos: [{ x: r.x[0], y: r.x[1], color: c.rojo, etiqueta: 'raíz' }],
      descripcion: 'Curvas de nivel cero de las dos ecuaciones y trayectoria de Newton',
    });
  }
}


export function mostrarPuntoFijo(salida, r) {
  const vars = r.variables;
  const [txt, tipo] = ESTADOS_NEWTON[r.estado] || [r.estado, 'alerta'];
  const sol = r.x.map((v, i) => `${vars[i]} = ${fmtTex(v ?? NaN, 12)}`).join(',\\quad ');
  const rho = (v) => (v == null ? '—' : fmt(v, 4));
  let html = `<div class="tarjeta">${chips([
    [`Punto fijo${r.seidel ? ' (tipo Seidel)' : ''}: ${txt}`, tipo], [`${r.iteraciones} iteraciones`],
    r.rho_final != null ? [`ρ(J_G) en la solución = ${rho(r.rho_final)}`, r.rho_final < 1 ? 'ok' : 'alerta'] : null,
  ])}
    <div class="grid-2">
      <div class="formula-scroll">${tex(`\\begin{cases}${r.G_tex.join('\\\\')}\\end{cases}`, true)}</div>
      <div class="formula-scroll">${tex(`J_G = ${r.JG_tex}`, true)}</div>
    </div>
    <div class="formula-scroll resaltado-final">${tex(sol, true)}</div>
    <p class="nota">Condición de convergencia: \\(\\rho(J_G) < 1\\) cerca de la solución (o \\(\\lVert J_G\\rVert_\\infty < 1\\), suficiente).
      En \\(\\mathbf{x}^{(0)}\\): \\(\\rho = ${r.rho_inicial == null ? '—' : fmtTex(r.rho_inicial, 4)}\\), \\(\\lVert J_G\\rVert_\\infty = ${r.norma_inicial == null ? '—' : fmtTex(r.norma_inicial, 4)}\\).
      Es más lento que Newton (convergencia lineal), pero no necesita la jacobiana ni resolver sistemas.</p>
  </div>`;
  html += `<div class="grid-2">
    <div class="tarjeta"><h3>Error por iteración</h3><div class="grafica grafica-media"><canvas data-conv></canvas></div></div>
    <div class="tarjeta">${vars.length === 2 && r.malla ? '<h3>Curvas x = g₁ y y = g₂</h3><div data-plano></div>' : '<h3>Interpretación</h3><p>La solución es un punto que G deja fijo: G(x*) = x*.</p>'}</div>
  </div>`;
  html += `<details class="tarjeta" open><summary><h3>Tabla de iteraciones</h3></summary><div class="tabla-contenedor"><table>
    <thead><tr><th>k</th>${vars.map((v) => `<th>${escapar(v)}</th>`).join('')}<th>‖x⁽ᵏ⁾ − x⁽ᵏ⁻¹⁾‖∞</th></tr></thead>
    <tbody>${r.historial.map((h) => `<tr><td>${h.k}</td>${h.x.map((v) => `<td>${fmt(v ?? NaN, 10)}</td>`).join('')}<td>${h.error == null ? '—' : fmt(h.error, 3)}</td></tr>`).join('')}</tbody>
  </table></div></details>`;
  salida.innerHTML = html;
  renderizar(salida);
  const c = COLORES();
  grafica(salida.querySelector('[data-conv]'), {
    type: 'line',
    data: { datasets: [{ label: 'error', data: r.historial.filter((h) => h.error > 0).map((h) => ({ x: h.k, y: h.error })), borderColor: c.sor, backgroundColor: c.sor, pointRadius: 2 }] },
    options: { parsing: false, scales: { x: { type: 'linear', title: { text: 'k' } }, y: { type: 'logarithmic', title: { text: 'error' } } } },
  });
  if (vars.length === 2 && r.malla) {
    const m = r.malla;
    crearPlano(salida.querySelector('[data-plano]'), { alto: 320 }).dibujar({
      xr: m.x, yr: m.y,
      contornos: [
        { valores: m.F[0], xr: m.x, yr: m.y, color: css('--acento'), etiqueta: `${vars[0]} = g₁` },
        { valores: m.F[1], xr: m.x, yr: m.y, color: c.jacobi, etiqueta: `${vars[1]} = g₂` },
      ],
      caminos: [{ puntos: r.historial.map((h) => h.x), color: c.gauss_seidel, etiqueta: 'iteraciones', numerar: true }],
      puntos: r.estado === 'converge' ? [{ x: r.x[0], y: r.x[1], color: c.rojo, etiqueta: 'punto fijo' }] : [],
      descripcion: 'Curvas de las ecuaciones y trayectoria del punto fijo',
    });
  }
}
