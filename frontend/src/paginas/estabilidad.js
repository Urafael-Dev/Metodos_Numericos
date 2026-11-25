import { api } from '../api.js';
import { bloqueCodigo } from '../componentes/codigo.js';
import { COLORES, grafica } from '../componentes/graficas.js';
import { crearEditor } from '../componentes/matriz.js';
import { crearPlano, ventana } from '../componentes/plano.js';
import { $, chips, conCarga, css, error, metricas, montarTema, selectorEjemplos, vacio } from '../componentes/ui.js';
import { fmt, fmtTex, renderizar, tex, texVector } from '../matematicas.js';

const TEORIA = String.raw`
<h2>Estabilidad: ¿cuánto se amplifican los errores?</h2>
<p class="subtitulo">Los datos casi nunca son exactos: mediciones, redondeo a 16 cifras…</p>
<div class="grid-2">
  <div class="tarjeta">
    <h3>Número de condición</h3>
    $$\kappa(A) = \lVert A\rVert\,\lVert A^{-1}\rVert = \frac{\sigma_{\max}}{\sigma_{\min}} \ (\text{norma 2})$$
    <p>Si \(\mathbf{b}\) tiene un error relativo \(\varepsilon\), la solución puede tenerlo hasta \(\kappa\) veces mayor:</p>
    $$\frac{\lVert\delta\mathbf{x}\rVert}{\lVert\mathbf{x}\rVert} \le \kappa(A)\,\frac{\lVert\delta\mathbf{b}\rVert}{\lVert\mathbf{b}\rVert}$$
  </div>
  <div class="tarjeta">
    <h3>Regla práctica</h3>
    <ul class="lista-limpia">
      <li><span class="chip chip-ok">κ &lt; 10²</span> bien condicionado.</li>
      <li><span class="chip">10² ≤ κ &lt; 10⁶</span> moderado: se pierden algunas cifras.</li>
      <li><span class="chip chip-alerta">κ ≥ 10⁶</span> mal condicionado.</li>
    </ul>
    <p>Se pierden unas \(\log_{10}\kappa(A)\) cifras de las ≈16 de la doble precisión.</p>
    <p class="nota">Ojo: un determinante pequeño <strong>no</strong> implica mal condicionamiento (\(\det(10^{-3}I_{10}) = 10^{-30}\) pero \(\kappa = 1\)).</p>
  </div>
</div>

<h2 class="separado">Convergencia de los métodos iterativos</h2>
<div class="grid-2">
  <div class="tarjeta">
    <p>Con \(\mathbf{e}^{(k)} = \mathbf{x}^{(k)} - \mathbf{x}\), cada iteración multiplica el error por \(T\):</p>
    $$\mathbf{e}^{(k)} = T^{k}\,\mathbf{e}^{(0)} \longrightarrow \mathbf{0} \iff \rho(T) < 1$$
    <p>Para ganar \(d\) cifras se necesitan unas \(k \approx \dfrac{d}{-\log_{10}\rho(T)}\) iteraciones.</p>
  </div>
  <div class="tarjeta">
    <h3>Estabilidad de los algoritmos</h3>
    <ul class="lista-limpia">
      <li><strong>Pivoteo parcial</strong>: evita dividir entre números pequeños en Gauss/Gauss-Jordan.</li>
      <li><strong>QR en vez de ecuaciones normales</strong>: \(\kappa(A^TA)=\kappa(A)^2\).</li>
      <li><strong>Escalar</strong> filas con magnitudes muy distintas.</li>
      <li>Un algoritmo estable no arregla un problema mal condicionado: solo evita empeorarlo.</li>
    </ul>
  </div>
</div>`;

export default async function montar(el, { tema, pestana }) {
  const activar = montarTema(el, tema, [
    { id: 'teoria', titulo: 'Teoría', html: TEORIA },
    {
      id: 'analizador',
      titulo: 'Analizador',
      html: `<div class="panel">
        <div class="controles">
          <div id="es-ejemplos" class="crece"></div>
          <label class="campo">Perturbación ε <input id="es-eps" value="1e-6"></label>
        </div>
        <div id="es-editor"></div>
        <div class="acciones"><button class="btn" id="es-analizar">Analizar</button></div>
      </div>
      <div id="es-resultado" class="resultado" aria-live="polite">${vacio('Elige un ejemplo o escribe una matriz cuadrada.')}</div>`,
    },
    {
      id: 'hilbert',
      titulo: 'Experimento de Hilbert',
      html: `<div class="tarjeta">
        <h2>Matrices de Hilbert: el ejemplo clásico de mal condicionamiento</h2>
        <p>\\(H_{ij} = \\dfrac{1}{i+j-1}\\). Se resuelve \\(H\\mathbf{x} = H\\mathbf{1}\\), cuya solución exacta es \\(\\mathbf{x} = (1,\\dots,1)\\), con eliminación en doble precisión.</p>
        <div class="grafica"><canvas id="es-hilbert" aria-label="Número de condición y error en función de n"></canvas></div>
        <div id="es-hilbert-tabla"></div>
      </div>`,
    },
    {
      id: 'python',
      titulo: 'En Python',
      html: `<h2>Práctica en Python</h2><p class="subtitulo">κ de matrices de Hilbert, experimento de perturbación y radio espectral.</p>${bloqueCodigo('06_estabilidad_convergencia.py')}`,
    },
  ], pestana);

  const editor = crearEditor($('#es-editor', el), {
    id: 'es-matriz', n: 2, cuadrada: true, maxN: 8, minN: 1,
    A: [[1, 1], [1, 1.0001]], b: [2, 2.0001],
    alEnter: () => $('#es-analizar', el).click(),
  });

  try {
    const lista = (await api.ejemplos()).ejemplos.estabilidad;
    $('#es-ejemplos', el).innerHTML = selectorEjemplos('es-ejemplo', lista);
    $('#es-ejemplo', el).addEventListener('change', (e) => {
      const ej = lista.find((x) => x.id === e.target.value);
      if (!ej) return;
      editor.cargar(ej.A, ej.b || ej.A.map((f) => f.reduce((s, v) => s + v, 0)));
      $('#es-analizar', el).click();
    });
  } catch {
    /* sin ejemplos */
  }

  $('#es-analizar', el).addEventListener('click', (e) => conCarga(e.currentTarget, async () => {
    const salida = $('#es-resultado', el);
    try {
      const { A, b } = editor.leer();
      const r = await api.estabilidad({ A, b, epsilon: $('#es-eps', el).value });
      mostrar(salida, r, A, b);
    } catch (err) {
      salida.innerHTML = error(err.message);
    }
  }));

  // El experimento de Hilbert se carga al abrir su pestaña por primera vez.
  let hilbertCargado = false;
  const cargarHilbert = async () => {
    if (hilbertCargado || $('#panel-estabilidad-hilbert', el).hidden) return;
    hilbertCargado = true;
    try {
      const { hilbert } = await api.hilbert();
      const c = COLORES();
      grafica($('#es-hilbert', el), {
        type: 'line',
        data: {
          datasets: [
            { label: 'κ(Hₙ)', data: hilbert.map((h) => ({ x: h.n, y: h.kappa })), borderColor: c.rojo, backgroundColor: c.rojo, yAxisID: 'y' },
            { label: 'error en x', data: hilbert.map((h) => ({ x: h.n, y: Math.max(h.error, 1e-17) })), borderColor: c.jacobi, backgroundColor: c.jacobi, yAxisID: 'y' },
          ],
        },
        options: { parsing: false, scales: { x: { type: 'linear', title: { text: 'n' }, ticks: { stepSize: 1 } }, y: { type: 'logarithmic', title: { text: 'escala log' } } } },
      });
      $('#es-hilbert-tabla', el).innerHTML = `<div class="tabla-contenedor"><table>
        <thead><tr><th>n</th><th>κ(Hₙ)</th><th>cifras perdidas</th><th>error máx. en x</th></tr></thead>
        <tbody>${hilbert.map((h) => `<tr><td>${h.n}</td><td>${fmt(h.kappa, 3)}</td><td>${fmt(Math.log10(h.kappa), 3)}</td><td>${fmt(h.error, 3)}</td></tr>`).join('')}</tbody>
      </table></div><p class="nota">Con n = 12 se pierden ~16 cifras: la «solución» calculada ya no tiene ninguna cifra correcta, aunque el algoritmo es estable.</p>`;
    } catch (err) {
      hilbertCargado = false;
      $('#es-hilbert-tabla', el).innerHTML = error(err.message);
    }
  };
  window.addEventListener('pestana-cambiada', (e) => e.detail.tema === 'estabilidad' && cargarHilbert());
  cargarHilbert();
  $('#es-analizar', el).click();
  return { activar };
}

function mostrar(salida, r, A, b) {
  const tipo = { 'bien condicionado': 'ok', 'moderadamente condicionado': '', 'mal condicionado': 'alerta', singular: 'alerta' }[r.clasificacion];
  const p = r.perturbacion;
  const conv = (rho) => (rho == null ? '—' : rho < 1 ? `${fmt(rho, 4)} → converge` : `${fmt(rho, 4)} → no converge`);
  let html = `<div class="tarjeta">${chips([
    [r.clasificacion, tipo],
    r.simetrica ? ['simétrica'] : null,
    r.spd ? ['definida positiva', 'ok'] : null,
    [r.dominancia.estricta ? 'diagonal dominante' : 'no dominante', r.dominancia.estricta ? 'ok' : ''],
  ])}
  ${medidor(r.kappa_2)}
  ${metricas([
    ['κ₂(A)', r.kappa_2 == null ? '∞' : fmt(r.kappa_2, 4)],
    ['κ₁(A)', r.kappa_1 == null ? '∞' : fmt(r.kappa_1, 4)],
    ['κ∞(A)', r.kappa_inf == null ? '∞' : fmt(r.kappa_inf, 4)],
    ['det(A)', r.determinante !== 0 && Math.abs(r.determinante) < 1e-4 ? r.determinante.toExponential(3).replace('e', '·10^') : fmt(r.determinante, 4)],
    ['Cifras perdidas', r.cifras_perdidas == null ? 'todas' : fmt(r.cifras_perdidas, 3)],
    ['Cifras confiables', r.cifras_confiables == null ? '0' : `≈ ${fmt(r.cifras_confiables, 3)}`],
  ])}</div>`;

  html += `<div class="grid-2">
    <div class="tarjeta"><h3>Convergencia de métodos iterativos</h3>
      ${metricas([['ρ(T_J) Jacobi', conv(r.rho_jacobi)], ['ρ(T_GS) Gauss-Seidel', conv(r.rho_gauss_seidel)]])}
      ${r.omega_optimo ? `<p class="nota">ω óptimo de SOR (si es tridiagonal): ${fmt(r.omega_optimo, 4)}</p>` : ''}
      ${!r.dominancia.estricta && r.rho_jacobi != null && r.rho_jacobi < 1 ? '<p class="nota">No es diagonal dominante y aun así Jacobi converge: la dominancia es suficiente, no necesaria.</p>' : ''}
      ${r.spd && r.rho_gauss_seidel < 1 ? '<p class="nota">Al ser simétrica definida positiva, Gauss-Seidel converge con seguridad.</p>' : ''}
    </div>
    <div class="tarjeta"><h3>Valores singulares y propios</h3>
      <p>${tex(`\\sigma = (${r.valores_singulares.map((s) => fmtTex(s, 4)).join(',\\ ')})`)}</p>
      <p>${tex(`\\lambda = (${r.autovalores.map((z) => (Math.abs(z.im) > 1e-12 ? `${fmtTex(z.re, 4)} ${z.im < 0 ? '-' : '+'} ${fmtTex(Math.abs(z.im), 4)}i` : fmtTex(z.re, 4))).join(',\\ ')})`)}</p>
      <p class="nota">κ₂ = σ<sub>máx</sub> / σ<sub>mín</sub>: si σ<sub>mín</sub> ≈ 0 la matriz está cerca de ser singular.</p>
    </div>
  </div>`;

  if (p) {
    html += `<div class="tarjeta destacada"><h3>Experimento: perturbar los datos un ${fmt(p.epsilon * 100, 3)} %</h3>
      <div class="grid-2">
        <div>
          <div class="formula-scroll">${tex(`\\mathbf{x} = ${texVector(p.x)},\\quad \\mathbf{x}+\\delta\\mathbf{x} = ${texVector(p.x_perturbado_b)}`, true)}</div>
        </div>
        <div>${metricas([
          ['Cambio relativo en b', fmt(p.epsilon, 3)],
          ['Cambio relativo en x', fmt(p.cambio_relativo_b, 3)],
          ['Amplificación', `× ${fmt(p.amplificacion_b, 4)}`],
          ['Cota κ·ε', fmt(p.cota, 3)],
        ])}${p.cambio_relativo_A != null ? `<p class="nota">Perturbando A en lugar de b, x cambia un ${fmt(p.cambio_relativo_A, 3)} relativo.</p>` : ''}</div>
      </div>
    </div>`;
  }
  if (A.length === 2) {
    html += '<div class="tarjeta"><h3>Interpretación geométrica</h3><p class="nota">Rectas casi paralelas ⇒ un pequeño movimiento de una de ellas desplaza mucho el punto de corte.</p><div data-plano></div></div>';
  }
  salida.innerHTML = html;
  renderizar(salida);

  if (A.length === 2) {
    const c = COLORES();
    const plano = crearPlano(salida.querySelector('[data-plano]'), { alto: 300 });
    const puntos = p ? [p.x, p.x_perturbado_b] : [[0, 0]];
    plano.dibujar({
      ...ventana(puntos, 4),
      rectas: [
        { a: A[0][0], b: A[0][1], c: b[0], color: css('--acento'), etiqueta: 'Ec. 1' },
        { a: A[1][0], b: A[1][1], c: b[1], color: c.jacobi, etiqueta: 'Ec. 2' },
        ...(p ? [{ a: A[1][0], b: A[1][1], c: p.b[1] + p.delta_b[1], color: c.gris, etiqueta: 'Ec. 2 perturbada' }] : []),
      ],
      puntos: p ? [
        { x: p.x[0], y: p.x[1], color: c.gauss_seidel, etiqueta: 'x' },
        { x: p.x_perturbado_b[0], y: p.x_perturbado_b[1], color: c.rojo, etiqueta: 'x + δx' },
      ] : [],
      descripcion: 'Rectas del sistema original y perturbado',
    });
  }
}

function medidor(k) {
  const pos = k == null ? 100 : Math.min(100, (Math.log10(Math.max(k, 1)) / 16) * 100);
  return `<div class="medidor" role="img" aria-label="Número de condición en escala de 1 a 10^16">
    <div class="medidor-barra"><span style="left:${pos}%"></span></div>
    <div class="medidor-escala"><span>10⁰</span><span>10⁴</span><span>10⁸</span><span>10¹²</span><span>10¹⁶</span></div>
  </div>`;
}
