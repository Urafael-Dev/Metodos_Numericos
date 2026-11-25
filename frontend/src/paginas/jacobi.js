import { api } from '../api.js';
import { bloqueCodigo } from '../componentes/codigo.js';
import { COLORES, grafica } from '../componentes/graficas.js';
import { crearEditor } from '../componentes/matriz.js';
import { crearPlano, ventana } from '../componentes/plano.js';
import { $, chips, conCarga, css, error, metricas, montarTema, selectorEjemplos, vacio } from '../componentes/ui.js';
import { fmt, fmtTex, leerLista, renderizar, tex, texMatriz, texVector } from '../matematicas.js';

const TEORIA = String.raw`
<h2>Despejar e iterar</h2>
<p class="subtitulo">De la ecuación \(i\) se despeja \(x_i\) y se repite hasta que los valores dejan de cambiar</p>
<div class="grid-3">
  <article class="tarjeta">
    <span class="chip">Procesamiento en paralelo</span>
    <h3>Jacobi</h3>
    <p>Calcula toda la nueva iteración usando <strong>solo</strong> valores de la iteración anterior.</p>
    $$x_i^{(k+1)} = \frac{1}{a_{ii}}\Big(b_i - \sum_{j\neq i} a_{ij}\,x_j^{(k)}\Big)$$
    <p class="nota">Forma matricial: \(T_J = -D^{-1}(L+U)\).</p>
  </article>
  <article class="tarjeta destacada">
    <span class="chip">Actualización inmediata</span>
    <h3>Gauss-Seidel</h3>
    <p>Usa <strong>al instante</strong> los valores que ya calculó en esta misma iteración.</p>
    $$x_i^{(k+1)} = \frac{1}{a_{ii}}\Big(b_i - \sum_{j<i} a_{ij}\,x_j^{(k+1)} - \sum_{j>i} a_{ij}\,x_j^{(k)}\Big)$$
    <p class="nota">\(T_{GS} = -(D+L)^{-1}U\). Suele converger más rápido y usa un solo vector en memoria.</p>
  </article>
  <article class="tarjeta">
    <span class="chip">Aceleración</span>
    <h3>SOR (sobrerrelajación)</h3>
    <p>Mezcla el valor anterior con el de Gauss-Seidel mediante un factor \(\omega\).</p>
    $$x_i^{(k+1)} = (1-\omega)\,x_i^{(k)} + \omega\,\tilde{x}_i^{GS}$$
    <p class="nota">\(\omega=1\) es Gauss-Seidel; \(1<\omega<2\) acelera. Para matrices tridiagonales, \(\omega^* = \frac{2}{1+\sqrt{1-\rho(T_J)^2}}\).</p>
  </article>
</div>

<div class="grid-2 separado">
  <div class="tarjeta">
    <h3>¿Cuándo converge?</h3>
    <p>Todos son de la forma \(\mathbf{x}^{(k+1)} = T\mathbf{x}^{(k)} + \mathbf{c}\), con \(A = D + L + U\).</p>
    <ul class="lista-limpia">
      <li><span class="chip chip-ok">Necesaria y suficiente</span> \(\rho(T) = \max|\lambda_i(T)| < 1\).</li>
      <li><span class="chip">Suficiente</span> \(A\) estrictamente diagonal dominante: \(|a_{ii}| > \sum_{j\ne i}|a_{ij}|\) ⇒ Jacobi y Gauss-Seidel convergen.</li>
      <li><span class="chip">Suficiente</span> \(A\) simétrica definida positiva ⇒ Gauss-Seidel (y SOR con \(0<\omega<2\)) convergen.</li>
    </ul>
    <p class="nota">Cuanto menor es \(\rho(T)\), más rápido: el error se reduce aproximadamente en un factor \(\rho\) por iteración.</p>
  </div>
  <div class="tarjeta">
    <h3>Criterios de parada</h3>
    $$\lVert\mathbf{x}^{(k+1)}-\mathbf{x}^{(k)}\rVert_\infty < \varepsilon
      \quad\text{o}\quad
      \frac{\lVert\mathbf{x}^{(k+1)}-\mathbf{x}^{(k)}\rVert_\infty}{\lVert\mathbf{x}^{(k+1)}\rVert_\infty} < \varepsilon$$
    <p>Siempre con un <strong>máximo de iteraciones</strong> para no quedar en un bucle infinito si el método diverge.</p>
    <p class="nota">Truco: si \(A\) no es dominante, a veces basta con <strong>reordenar las ecuaciones</strong>. El simulador lo intenta por ti.</p>
  </div>
</div>`;

export default async function montar(el, { tema, pestana }) {
  const activar = montarTema(el, tema, [
    { id: 'teoria', titulo: 'Teoría', html: TEORIA },
    {
      id: 'simulador',
      titulo: 'Simulador',
      html: `<div class="panel">
        <div class="controles"><div id="it-ejemplos" class="crece"></div></div>
        <div id="it-editor"></div>
        <div class="controles parametros">
          <label class="campo">Método
            <select id="it-metodo"><option value="jacobi">Jacobi</option><option value="gauss_seidel" selected>Gauss-Seidel</option><option value="sor">SOR</option></select>
          </label>
          <label class="campo">x⁽⁰⁾ <input id="it-x0" placeholder="0, 0, 0" title="Vector inicial separado por comas o espacios"></label>
          <label class="campo">Tolerancia ε <input id="it-tol" value="1e-6"></label>
          <label class="campo">Máx. iteraciones <input id="it-max" type="number" min="1" max="500" value="60"></label>
          <label class="campo" id="it-omega-campo">ω (SOR) <input id="it-omega" value="1.25"></label>
          <label class="campo" title="Cuántas iteraciones se muestran desarrolladas con la fórmula">Desarrollar <input id="it-desarrollar" type="number" min="0" max="30" value="3"></label>
          <label class="campo">Criterio
            <select id="it-criterio"><option value="absoluto">Error absoluto</option><option value="relativo">Error relativo</option></select>
          </label>
          <label class="interruptor"><input type="checkbox" id="it-reordenar"> Reordenar si no es dominante</label>
        </div>
        <div class="acciones"><button class="btn" id="it-resolver">Iterar</button></div>
      </div>
      <div id="it-resultado" class="resultado" aria-live="polite">${vacio('Elige un ejemplo o escribe un sistema cuadrado y pulsa <strong>Iterar</strong>. Se ejecutan los tres métodos para compararlos.')}</div>`,
    },
    {
      id: 'python',
      titulo: 'En Python',
      html: `<h2>Práctica en Python</h2><p class="subtitulo">Jacobi, Gauss-Seidel y SOR, con dominancia diagonal y radio espectral.</p>${bloqueCodigo('04_jacobi_gauss_seidel.py')}`,
    },
  ], pestana);

  const editor = crearEditor($('#it-editor', el), {
    id: 'it-matriz', n: 3, cuadrada: true, maxN: 10, minN: 2,
    A: [[10, -2, -1], [-1, 8, -2], [-2, -1, 5]], b: [7, 5, 2],
    alEnter: () => $('#it-resolver', el).click(),
  });
  const metodo = $('#it-metodo', el);
  const omegaCampo = $('#it-omega-campo', el);
  const sincronizar = () => { omegaCampo.hidden = metodo.value !== 'sor'; };
  metodo.addEventListener('change', sincronizar);
  sincronizar();

  try {
    const lista = (await api.ejemplos()).ejemplos.iterativos;
    $('#it-ejemplos', el).innerHTML = selectorEjemplos('it-ejemplo', lista);
    $('#it-ejemplo', el).addEventListener('change', (e) => {
      const ej = lista.find((x) => x.id === e.target.value);
      if (!ej) return;
      editor.cargar(ej.A, ej.b);
      $('#it-x0', el).value = '';
      $('#it-reordenar', el).checked = Boolean(ej.reordenar);
      $('#it-resolver', el).click();
    });
  } catch {
    /* sin ejemplos */
  }

  $('#it-resolver', el).addEventListener('click', (e) =>
    conCarga(e.currentTarget, async () => {
      const salida = $('#it-resultado', el);
      try {
        const { A, b } = editor.leer();
        const textoX0 = $('#it-x0', el).value.trim();
        const x0 = textoX0 ? leerLista(textoX0) : null;
        if (x0 && (x0.length !== A.length || x0.some((v) => !Number.isFinite(v)))) {
          throw new Error(`x⁽⁰⁾ debe tener ${A.length} números separados por comas o espacios.`);
        }
        const comun = {
          A, b, x0,
          tol: $('#it-tol', el).value, max_iter: $('#it-max', el).value,
          omega: $('#it-omega', el).value, criterio: $('#it-criterio', el).value,
          reordenar: $('#it-reordenar', el).checked,
          desarrollar: $('#it-desarrollar', el).value,
        };
        const [rj, rg, rs] = await Promise.all(
          ['jacobi', 'gauss_seidel', 'sor'].map((m) => api.iterativos({ ...comun, metodo: m })),
        );
        const todos = { jacobi: rj, gauss_seidel: rg, sor: rs };
        mostrar(salida, todos[metodo.value], todos);
      } catch (err) {
        salida.innerHTML = error(err.message);
      }
    }),
  );
  return { activar };
}

const ESTADO = {
  converge: ['converge', 'ok'],
  diverge: ['diverge', 'alerta'],
  max_iter: ['no alcanzó la tolerancia', 'alerta'],
};

export function mostrar(salida, r, todos) {
  const [estadoTxt, estadoTipo] = ESTADO[r.estado];
  const n = r.n;
  let html = `<div class="tarjeta">
    ${chips([
      [`${r.nombre}: ${estadoTxt}`, estadoTipo],
      [`${r.iteraciones} iteraciones`],
      [`ρ(T) = ${fmt(r.rho, 4)}`, r.rho < 1 ? 'ok' : 'alerta'],
      [r.dominancia.estricta ? 'diagonal dominante' : 'no es diagonal dominante', r.dominancia.estricta ? 'ok' : ''],
      r.spd ? ['simétrica definida positiva', 'ok'] : null,
    ])}
    ${r.permutacion ? `<p class="nota">Se reordenaron las ecuaciones (orden ${r.permutacion.join(', ')}) para lograr dominancia diagonal.</p>` : ''}
    <p>La teoría predice que <strong>${r.prediccion}</strong> porque \\(\\rho(T) ${r.rho < 1 ? '<' : '\\ge'} 1\\).</p>
  </div>`;

  html += `<div class="grid-2">
    <div class="tarjeta destacada"><h3>Resultado (${r.nombre})</h3>
      <div class="formula-scroll">${tex(`\\mathbf{x}^{(${r.iteraciones})} = ${texVector(r.x.map((v) => v ?? NaN))}`, true)}</div>
      ${r.solucion_exacta ? `<p class="nota">Solución exacta (directa): \\(${texVector(r.solucion_exacta)}^T\\)</p>` : ''}
    </div>
    <div class="tarjeta"><h3>Comparación de los tres métodos</h3>
      ${metricas(['jacobi', 'gauss_seidel', 'sor'].map((k) => {
        const t = todos[k];
        return [t.nombre + (k === 'sor' ? ` (ω=${fmt(t.omega, 3)})` : ''), t.estado === 'converge' ? `${t.iteraciones} it.` : ESTADO[t.estado][0], `ρ = ${fmt(t.rho, 4)}`];
      }))}
      ${r.omega_optimo ? `<p class="nota">ω óptimo teórico (tridiagonal): ${fmt(r.omega_optimo, 4)}</p>` : ''}
    </div>
  </div>`;

  html += `<div class="tarjeta"><h3>Convergencia: error por iteración (escala logarítmica)</h3>
    <div class="grafica"><canvas data-conv aria-label="Error por iteración de Jacobi, Gauss-Seidel y SOR"></canvas></div></div>`;

  if (n === 2) {
    html += `<div class="tarjeta"><h3>Trayectoria en el plano</h3>
      <p class="nota">Cada recta es una ecuación; su cruce es la solución. Gauss-Seidel avanza en «escalera» porque actualiza una coordenada a la vez.</p>
      <div data-plano></div></div>`;
  }

  if (r.desarrollo.length) {
    html += `<details class="tarjeta" open><summary><h3>Desarrollo de las primeras ${r.desarrollo.length} iteraciones</h3></summary>${r.desarrollo
      .map((it) => `<div class="iteracion"><h4>k = ${it.k}</h4>${it.componentes.map((c) => formulaComponente(c, it.k, r.metodo, r.omega)).join('')}</div>`)
      .join('')}</details>`;
  }

  html += `<details class="tarjeta"><summary><h3>Tabla de iteraciones</h3></summary><div class="tabla-contenedor"><table>
    <thead><tr><th>k</th>${Array.from({ length: n }, (_, i) => `<th>x<sub>${i + 1}</sub></th>`).join('')}<th>error</th><th>‖b − Ax‖∞</th></tr></thead>
    <tbody>${r.historial.map((h) => `<tr><td>${h.k}</td>${h.x.map((v) => `<td>${fmt(v ?? NaN, 7)}</td>`).join('')}<td>${h.error === null ? '—' : fmt(h.error, 3)}</td><td>${h.residuo === null ? '—' : fmt(h.residuo, 3)}</td></tr>`).join('')}</tbody>
  </table></div></details>`;

  html += `<details class="tarjeta"><summary><h3>Análisis: dominancia y matriz de iteración</h3></summary>
    <div class="grid-2"><div><div class="tabla-contenedor"><table>
      <thead><tr><th>Fila</th><th>|a<sub>ii</sub>|</th><th>Σ|a<sub>ij</sub>|, j≠i</th><th></th></tr></thead>
      <tbody>${r.dominancia.filas.map((f) => `<tr><td>${f.fila}</td><td>${fmt(f.diagonal)}</td><td>${fmt(f.suma_resto)}</td><td>${f.cumple ? '✔' : '✘'}</td></tr>`).join('')}</tbody>
    </table></div></div>
    <div class="formula-scroll">${tex(`T_{${{ jacobi: 'J', gauss_seidel: 'GS', sor: '\\omega' }[r.metodo]}} = ${texMatriz(r.T)}`, true)}
      <p class="nota">\\(\\rho(T_J) = ${fmtTex(r.rho_jacobi, 4)}\\), \\(\\rho(T_{GS}) = ${fmtTex(r.rho_gauss_seidel, 4)}\\)</p></div></div>
  </details>`;

  salida.innerHTML = html;
  renderizar(salida);

  const c = COLORES();
  const series = ['jacobi', 'gauss_seidel', 'sor'].map((k) => ({
    label: todos[k].nombre,
    data: todos[k].historial.filter((h) => h.error !== null && h.error > 0).map((h) => ({ x: h.k, y: h.error })),
    borderColor: c[k], backgroundColor: c[k], borderWidth: k === r.metodo ? 3 : 1.6,
    pointRadius: 2, tension: 0.15,
  }));
  grafica(salida.querySelector('[data-conv]'), {
    type: 'line',
    data: { datasets: series },
    options: {
      parsing: false,
      scales: {
        x: { type: 'linear', title: { text: 'iteración k' } },
        y: { type: 'logarithmic', title: { text: 'error' } },
      },
    },
  });

  if (n === 2) {
    const plano = crearPlano(salida.querySelector('[data-plano]'), { alto: 340 });
    const pts = r.historial.map((h) => h.x).filter((p) => p.every((v) => Number.isFinite(v)));
    const todosPts = [...pts, ...(r.solucion_exacta ? [r.solucion_exacta] : [])];
    const v = ventana(todosPts.filter((p) => Math.abs(p[0]) < 1e3 && Math.abs(p[1]) < 1e3));
    const caminos = [];
    if (r.metodo === 'gauss_seidel' || r.metodo === 'sor') {
      // Escalera: primero cambia x1 (con x2 viejo) y luego x2.
      const esc = [];
      pts.forEach((p, k) => { if (k) esc.push([p[0], pts[k - 1][1]]); esc.push(p); });
      caminos.push({ puntos: esc, color: c[r.metodo], etiqueta: `${r.nombre} (k = 0, 1, 2, …)` });
    } else {
      caminos.push({ puntos: pts, color: c.jacobi, etiqueta: 'Jacobi (k = 0, 1, 2, …)', numerar: true });
    }
    plano.dibujar({
      ...v,
      rectas: r.A.map((f, i) => ({ a: f[0], b: f[1], c: r.b[i], color: i ? c.gris : css('--acento'), etiqueta: `Ecuación ${i + 1}` })),
      caminos,
      puntos: r.solucion_exacta ? [{ x: r.solucion_exacta[0], y: r.solucion_exacta[1], color: c.rojo, etiqueta: 'solución' }] : [],
      descripcion: 'Rectas de las ecuaciones y trayectoria de las iteraciones',
    });
  }
}

function formulaComponente(c, k, metodo, omega) {
  const usados = c.terminos.filter((t) => Math.abs(t.a) > 1e-14);
  const signo = (a) => (a < 0 ? '+' : '-');
  const coef = (a) => (Math.abs(Math.abs(a) - 1) < 1e-14 ? '' : fmtTex(Math.abs(a)));
  const sup = (t) => (metodo === 'jacobi' || t.j > c.i ? k - 1 : k);
  const simbolico = usados.map((t) => `${signo(t.a)} ${coef(t.a)}x_{${t.j}}^{(${sup(t)})}`).join(' ');
  const numerico = usados.map((t) => `${signo(t.a)} ${coef(t.a)}(${fmtTex(t.x)})`).join(' ');
  const div = Math.abs(c.a_ii - 1) < 1e-14 ? (x) => x : (x) => `\\frac{${x}}{${fmtTex(c.a_ii)}}`;
  let s = `x_{${c.i}}^{(${k})} = ${div(`${fmtTex(c.b)} ${simbolico}`)} = ${div(`${fmtTex(c.b)} ${numerico}`)} = ${fmtTex(c.gs)}`;
  let html = `<div class="formula-scroll">${tex(s, true)}</div>`;
  if (metodo === 'sor') {
    const mezcla = `x_{${c.i}}^{(${k})} \\leftarrow (1-${fmtTex(omega)})(${fmtTex(c.anterior)}) + ${fmtTex(omega)}(${fmtTex(c.gs)}) = ${fmtTex(c.valor)}`;
    html += `<div class="formula-scroll op">${tex(mezcla, true)}</div>`;
  }
  return html;
}
