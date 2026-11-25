import { api } from '../api.js';
import { bloqueCodigo } from '../componentes/codigo.js';
import { COLORES, grafica } from '../componentes/graficas.js';
import { crearEditor } from '../componentes/matriz.js';
import { $, conCarga, error, montarTema, vacio } from '../componentes/ui.js';
import { mostrarDirecto } from '../componentes/render-directos.js';
import { fmt, renderizar, tex, texVector } from '../matematicas.js';

const TEORIA = String.raw`
<h2>Dos formas de resolver \(A\mathbf{x}=\mathbf{b}\)</h2>
<p class="subtitulo">Para sistemas cuadrados con solución única</p>
<div class="grid-2">
  <article class="tarjeta">
    <span class="chip">Directos</span>
    <h3>Número finito de pasos</h3>
    <p>Transforman el sistema en otro equivalente fácil de resolver. Sin errores de redondeo, darían la solución <strong>exacta</strong>.</p>
    <ul class="lista-limpia">
      <li>Eliminación de Gauss y <a href="#/gauss-jordan">Gauss-Jordan</a></li>
      <li>Factorizaciones \(LU\), Cholesky (\(LL^T\)), \(QR\)</li>
      <li>Costo \(O(n^3)\); memoria para toda la matriz</li>
    </ul>
  </article>
  <article class="tarjeta destacada">
    <span class="chip">Iterativos</span>
    <h3>Aproximaciones sucesivas</h3>
    <p>Parten de un \(\mathbf{x}^{(0)}\) y generan \(\mathbf{x}^{(1)}, \mathbf{x}^{(2)},\dots\) que se acercan a la solución.</p>
    <ul class="lista-limpia">
      <li><a href="#/jacobi-gauss-seidel">Jacobi, Gauss-Seidel, SOR</a>; gradiente conjugado</li>
      <li>Costo \(O(n^2)\) por iteración (o \(O(\text{nnz})\) si la matriz es dispersa)</li>
      <li>Solo convergen si \(\rho(T)<1\) (ver <a href="#/estabilidad">estabilidad</a>)</li>
    </ul>
  </article>
</div>

<div class="tarjeta separado">
  <h3>Comparación</h3>
  <div class="tabla-contenedor"><table class="tabla-comparar">
    <thead><tr><th>Criterio</th><th>Directos</th><th>Iterativos</th></tr></thead>
    <tbody>
      <tr><td>Resultado</td><td>Exacto (salvo redondeo)</td><td>Aproximado, con la tolerancia que se pida</td></tr>
      <tr><td>Número de pasos</td><td>Fijo y conocido</td><td>Depende de \(\rho(T)\) y de \(\varepsilon\)</td></tr>
      <tr><td>Convergencia</td><td>Siempre (si \(A\) no es singular)</td><td>Solo bajo condiciones (dominancia, SPD, \(\rho<1\))</td></tr>
      <tr><td>Matrices dispersas grandes</td><td>Rellenan ceros: mucha memoria</td><td>Ideales: solo tocan los no nulos</td></tr>
      <tr><td>Errores de redondeo</td><td>Se acumulan durante la eliminación</td><td>Se autocorrigen en las siguientes iteraciones</td></tr>
      <tr><td>Varios \(\mathbf{b}\) con la misma \(A\)</td><td>Muy eficientes (se reutiliza \(LU\))</td><td>Hay que iterar de nuevo</td></tr>
      <tr><td>Uso típico</td><td>\(n\) hasta miles, matriz densa</td><td>\(n\) en millones (EDP, redes, imágenes)</td></tr>
    </tbody>
  </table></div>
</div>

<div class="flujo separado" aria-label="Guía para elegir el método">
  <div class="nodo">¿El sistema es cuadrado?</div>
  <div class="ramas">
    <div><span class="etq">No</span><div class="nodo hoja"><a href="#/no-cuadrados">Mínimos cuadrados (3.5)</a></div></div>
    <div><span class="etq">Sí</span>
      <div class="nodo">¿Es grande y disperso?</div>
      <div class="ramas">
        <div><span class="etq">No</span><div class="nodo hoja"><a href="#/gauss-jordan">Directo: Gauss / LU (3.3)</a></div></div>
        <div><span class="etq">Sí</span><div class="nodo hoja"><a href="#/jacobi-gauss-seidel">Iterativo: Gauss-Seidel / SOR (3.4)</a><br><small>si \(\rho(T)<1\)</small></div></div>
      </div>
    </div>
  </div>
</div>`;

export default async function montar(el, { tema, pestana }) {
  const activar = montarTema(el, tema, [
    { id: 'teoria', titulo: 'Teoría', html: TEORIA },
    {
      id: 'comparador',
      titulo: 'Comparador',
      html: `<div class="panel">
        <p class="nota">Se resuelve el mismo sistema con Gauss-Jordan (directo) y con Jacobi, Gauss-Seidel y SOR (iterativos, ε = 10⁻⁸).</p>
        <div id="cmp-editor"></div>
        <div class="acciones"><button class="btn" id="cmp-resolver">Comparar métodos</button></div>
      </div>
      <div id="cmp-resultado" class="resultado" aria-live="polite">${vacio('Pulsa <strong>Comparar métodos</strong>.')}</div>`,
    },
    {
      id: 'directos',
      titulo: 'Gauss, LU, Cholesky, Cramer',
      html: `<div class="panel">
        <div class="controles">
          <label class="campo">Método
            <select id="dir-metodo">
              <option value="gauss">Eliminación de Gauss + sustitución regresiva</option>
              <option value="lu">Factorización LU (PA = LU)</option>
              <option value="cholesky">Cholesky (A simétrica definida positiva)</option>
              <option value="cramer">Regla de Cramer (hasta 6 × 6)</option>
            </select></label>
          <label class="interruptor"><input type="checkbox" id="dir-pivoteo" checked> Pivoteo parcial</label>
          <label class="interruptor"><input type="checkbox" id="dir-exacto" checked> Fracciones exactas</label>
        </div>
        <div id="dir-editor"></div>
        <div class="acciones"><button class="btn" id="dir-resolver">Resolver</button></div>
      </div>
      <div id="dir-resultado" class="resultado" aria-live="polite">${vacio('Escribe el sistema (o pulsa <strong>✎ Escribir ecuaciones</strong>), elige el método y resuelve.')}</div>`,
    },
    {
      id: 'python',
      titulo: 'En Python',
      html: `<h2>Práctica en Python</h2><p class="subtitulo">Tiempo y error de un método directo frente a Gauss-Seidel en sistemas de tamaño creciente.</p>${bloqueCodigo('02_directos_vs_iterativos.py')}`,
    },
  ], pestana);

  const editor = crearEditor($('#cmp-editor', el), {
    id: 'cmp-matriz', n: 4, cuadrada: true, maxN: 10, minN: 2,
    A: [[10, -1, 2, 0], [-1, 11, -1, 3], [2, -1, 10, -1], [0, 3, -1, 8]], b: [6, 25, -11, 15],
    alEnter: () => $('#cmp-resolver', el).click(),
  });

  const editorDir = crearEditor($('#dir-editor', el), {
    id: 'dir-matriz', n: 3, cuadrada: true, maxN: 10, minN: 1,
    A: [[4, -2, 1], [-2, 4, -2], [1, -2, 4]], b: [11, -16, 17],
    alEnter: () => $('#dir-resolver', el).click(),
  });
  const metodoDir = $('#dir-metodo', el);
  const sincronizarDir = () => {
    $('#dir-pivoteo', el).closest('label').hidden = !['gauss', 'lu'].includes(metodoDir.value);
    $('#dir-exacto', el).closest('label').hidden = metodoDir.value === 'cholesky';
  };
  metodoDir.addEventListener('change', sincronizarDir);
  sincronizarDir();
  $('#dir-resolver', el).addEventListener('click', (e) => conCarga(e.currentTarget, async () => {
    const salida = $('#dir-resultado', el);
    try {
      const { A, b } = editorDir.leer();
      const r = await api.directo(metodoDir.value, {
        A, b, pivoteo: $('#dir-pivoteo', el).checked, exacto: $('#dir-exacto', el).checked,
      });
      const nombres = editorDir.nombres();
      await mostrarDirecto(salida, r, nombres);
    } catch (err) {
      salida.innerHTML = error(err.message);
    }
  }));

  $('#cmp-resolver', el).addEventListener('click', (e) => conCarga(e.currentTarget, async () => {
    const salida = $('#cmp-resultado', el);
    try {
      const { A, b } = editor.leer();
      const n = A.length;
      const comun = { A, b, tol: 1e-8, max_iter: 300 };
      const [gj, ...its] = await Promise.all([
        api.gaussJordan({ A, b, modo: 'sistema' }),
        ...['jacobi', 'gauss_seidel', 'sor'].map((metodo) =>
          api.iterativos({ ...comun, metodo, omega: 1.1 }).catch((err) => ({ error: err.message, metodo }))),
      ]);
      const exacta = gj.x;
      const err = (x) => (exacta && x ? Math.max(...x.map((v, i) => Math.abs((v ?? NaN) - exacta[i]))) : NaN);
      // Multiplicaciones por iteración de un método iterativo denso: n·(n−1) + n = n².
      const filas = [
        { nombre: 'Gauss-Jordan', tipo: 'Directo', pasos: `${gj.pasos.length - 1} operaciones de fila`,
          ops: gj.operaciones.multiplicaciones_divisiones, error: 0, estado: `${gj.clasificacion} (referencia)` },
        ...its.map((r) => (r.error
          ? { nombre: r.metodo, tipo: 'Iterativo', pasos: '—', ops: NaN, error: NaN, estado: r.error }
          : { nombre: r.nombre + (r.metodo === 'sor' ? ' (ω = 1.1)' : ''), tipo: 'Iterativo', pasos: `${r.iteraciones} iteraciones`,
              ops: r.iteraciones * n * n, error: err(r.x), estado: r.estado === 'converge' ? `converge (ρ = ${fmt(r.rho, 3)})` : `${r.estado} (ρ = ${fmt(r.rho, 3)})` })),
      ];
      salida.innerHTML = `
        ${exacta ? `<div class="tarjeta"><div class="formula-scroll">${tex(`\\mathbf{x} = ${texVector(exacta)}`, true)}</div></div>` : ''}
        <div class="tarjeta"><div class="tabla-contenedor"><table>
          <thead><tr><th>Método</th><th>Tipo</th><th>Pasos</th><th>× y ÷ (aprox.)</th><th>Error máx. vs. directo</th><th>Estado</th></tr></thead>
          <tbody>${filas.map((f) => `<tr><td><strong>${f.nombre}</strong></td><td>${f.tipo}</td><td>${f.pasos}</td><td>${fmt(f.ops)}</td><td>${fmt(f.error, 3)}</td><td>${f.estado}</td></tr>`).join('')}</tbody>
        </table></div>
        <p class="nota">Con n = ${n}, el directo gana. La ventaja de los iterativos aparece con n grande y matrices dispersas,
          donde cada iteración cuesta O(nnz) en lugar de O(n²): mira la práctica en Python.</p></div>
        <div class="tarjeta"><h3>Multiplicaciones y divisiones</h3><div class="grafica grafica-media"><canvas data-ops></canvas></div></div>`;
      renderizar(salida);
      const c = COLORES();
      grafica(salida.querySelector('[data-ops]'), {
        type: 'bar',
        data: {
          labels: filas.map((f) => f.nombre),
          datasets: [{ label: 'operaciones', data: filas.map((f) => f.ops), backgroundColor: [c.rojo, c.jacobi, c.gauss_seidel, c.sor], borderRadius: 6 }],
        },
        options: { plugins: { legend: { display: false } }, scales: { x: {}, y: { beginAtZero: true } } },
      });
    } catch (err) {
      salida.innerHTML = error(err.message);
    }
  }));
  return { activar };
}
