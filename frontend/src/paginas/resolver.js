import { api } from '../api.js';
import { mostrarDirecto } from '../componentes/render-directos.js';
import { $, aviso, chips, conCarga, error, leer, guardar, vacio } from '../componentes/ui.js';
import { escapar, leerLista, renderizar, tex } from '../matematicas.js';

const EJEMPLOS = [
  { t: '3 × 3, solución única', x: '2x + y - z = 8\n-3x - y + 2z = -11\n-2x + y + 2z = -3' },
  { t: 'Con fracciones', x: 'x/2 + y/3 = 1\nx - y = 1/6' },
  { t: 'Infinitas soluciones', x: 'x + 2y - z = 3\n2x + 4y - 2z = 6\nx + y + z = 4' },
  { t: 'Sin solución', x: 'x + y = 3\n2x + 2y = 7' },
  { t: 'Jacobi / Gauss-Seidel', x: '10x - y + 2z = 6\n-x + 11y - z + 3w = 25\n2x - y + 10z - w = -11\n3y - z + 8w = 15', m: 'gauss_seidel' },
  { t: 'Cholesky (simétrica)', x: '4x + 2y = 6\n2x + 5y + 2z = 9\n2y + 5z = 7', m: 'cholesky' },
  { t: 'Más ecuaciones que incógnitas', x: 'c + d = 2\nc + 2d = 3\nc + 3d = 5\nc + 4d = 6' },
  { t: 'Menos ecuaciones que incógnitas', x: 'x + y + z = 6\nx + 2y + 3z = 14', m: 'minimos' },
  { t: 'No lineal (Newton)', x: 'x^2 + y^2 = 4\ne^x + y = 1', x0: '1, -1.7' },
  { t: 'No lineal 3 × 3', x: '3x - cos(yz) - 1/2 = 0\nx^2 - 81(y + 0,1)^2 + sin(z) + 1,06 = 0\ne^(-xy) + 20z + (10pi - 3)/3 = 0', x0: '0.1, 0.1, -0.1' },
  { t: 'Punto fijo', x: 'x = (x^2 + y^2 + 8)/10\ny = (xy^2 + x + 8)/10', x0: '0, 0', m: 'punto_fijo' },
];

const METODOS = [
  { id: 'auto', t: 'Automático (recomendado)' },
  { id: 'gauss_jordan', t: 'Gauss-Jordan (3.3)', lineal: true },
  { id: 'gauss', t: 'Eliminación de Gauss + sustitución regresiva', lineal: true },
  { id: 'lu', t: 'Factorización LU', lineal: true, cuadrado: true },
  { id: 'cholesky', t: 'Cholesky', lineal: true, cuadrado: true },
  { id: 'cramer', t: 'Regla de Cramer', lineal: true, cuadrado: true, max: 6 },
  { id: 'inversa', t: 'Inversa de A con [A | I]', lineal: true, cuadrado: true },
  { id: 'jacobi', t: 'Jacobi (3.4)', lineal: true, cuadrado: true, iterativo: true },
  { id: 'gauss_seidel', t: 'Gauss-Seidel (3.4)', lineal: true, cuadrado: true, iterativo: true },
  { id: 'sor', t: 'SOR (3.4)', lineal: true, cuadrado: true, iterativo: true },
  { id: 'minimos', t: 'Mínimos cuadrados (3.5)', lineal: true },
  { id: 'estabilidad', t: 'Análisis de estabilidad y convergencia (3.6)', lineal: true, cuadrado: true },
  { id: 'newton', t: 'Newton-Raphson (3.1)', lineal: false },
  { id: 'punto_fijo', t: 'Punto fijo (3.1)', lineal: false, pf: true },
  { id: 'punto_fijo_seidel', t: 'Punto fijo tipo Seidel (3.1)', lineal: false, pf: true },
];

/** Nombre de variable en LaTeX: x1 → x_{1}. */
const texVar = (v) => v.replace(/^([a-zA-Z]+)(\d+)$/, '$1_{$2}');

export default function montar(el) {
  el.innerHTML = `
    <header class="cabecera-tema">
      <p class="miga">Unidad 03 · Herramienta general</p>
      <h1>Resolver un ejercicio</h1>
      <p class="lead">Escribe el sistema como en el cuaderno, una ecuación por línea. La app detecta las incógnitas, si es lineal
        o no y si es cuadrado; te recomienda un método (o eliges tú) y lo resuelve paso a paso.</p>
    </header>
    <div class="grid-resolver">
      <div class="panel">
        <label class="campo">Ecuaciones
          <textarea id="rs-texto" rows="6" spellcheck="false" placeholder="2x + y - z = 8&#10;-3x - y + 2z = -11&#10;-2x + y + 2z = -3"></textarea></label>
        <p class="ayuda">Admite <code>2x</code>, <code>xy</code>, <code>x^2</code> o <code>x²</code>, <code>2,5</code> o <code>2.5</code>, <code>1/3</code>,
          paréntesis, <code>sin cos tan exp ln sqrt</code>, <code>pi</code> y <code>e</code>. Variables: x, y, z, w, a, b, x1, x2…</p>
        <div class="ejemplos-rapidos" aria-label="Ejercicios de ejemplo">${EJEMPLOS.map((e, i) => `<button type="button" class="btn btn-fantasma btn-pequeno" data-ej="${i}">${e.t}</button>`).join('')}</div>
      </div>
      <div class="panel" id="rs-deteccion" aria-live="polite">${vacio('Aquí verás cómo se interpretó tu sistema.')}</div>
    </div>

    <div class="panel separado-s">
      <div class="controles">
        <label class="campo crece">Método <select id="rs-metodo"></select></label>
        <label class="interruptor" data-op="exacto"><input type="checkbox" id="rs-exacto" checked> Fracciones exactas</label>
        <label class="interruptor" data-op="pivoteo"><input type="checkbox" id="rs-pivoteo" checked> Pivoteo parcial</label>
      </div>
      <div class="controles parametros" data-op="iter">
        <label class="campo">x⁽⁰⁾ <input id="rs-x0" placeholder="ceros"></label>
        <label class="campo">Tolerancia <input id="rs-tol" value="1e-8"></label>
        <label class="campo">Máx. iteraciones <input id="rs-max" type="number" min="1" max="500" value="100"></label>
        <label class="campo" data-op="omega">ω <input id="rs-omega" value="1.1"></label>
        <label class="campo" data-op="desarrollar">Desarrollar <input id="rs-desarrollar" type="number" min="0" max="30" value="3"></label>
      </div>
      <div class="acciones"><button class="btn" id="rs-resolver">Resolver</button></div>
    </div>
    <div id="rs-resultado" class="resultado" aria-live="polite"></div>`;

  const texto = $('#rs-texto', el);
  const metodo = $('#rs-metodo', el);
  let info = null;
  let temporizador = null;

  texto.value = leer('resolver:texto') || EJEMPLOS[0].x;

  async function interpretar() {
    const caja = $('#rs-deteccion', el);
    guardar('resolver:texto', texto.value);
    if (!texto.value.trim()) {
      info = null;
      caja.innerHTML = vacio('Escribe al menos una ecuación.');
      actualizarMetodos();
      return;
    }
    try {
      info = await api.interpretar(texto.value);
      const tipo = info.lineal ? 'lineal' : 'no lineal';
      const forma = info.m === info.n ? 'cuadrado' : info.m > info.n ? 'sobredeterminado (m > n)' : 'subdeterminado (m < n)';
      caja.innerHTML = `<h3>Así lo entendí</h3>
        ${chips([[tipo, info.lineal ? 'ok' : ''], [`${info.m} ecuaciones`], [`${info.n} incógnitas: ${info.variables.join(', ')}`], [forma]])}
        <div class="formula-scroll">${tex(`\\begin{cases}${info.sistema_tex.join('\\\\')}\\end{cases}`, true)}</div>
        <p class="nota" data-recomendacion></p>`;
      renderizar(caja);
    } catch (err) {
      info = null;
      caja.innerHTML = error(err.message);
    }
    actualizarMetodos();
  }

  function aplicable(m) {
    if (!info) return [false, 'Escribe primero el sistema'];
    if (m.id === 'auto') return [true];
    if (m.lineal === true && !info.lineal) return [false, 'solo sistemas lineales'];
    if (m.lineal === false && info.lineal && !m.pf) return [true];
    if (m.pf && !info.forma_punto_fijo) return [false, 'escribe cada ecuación como x = g(...)'];
    if (m.lineal === false && info.lineal && m.pf) return [false, 'para sistemas no lineales'];
    if (m.cuadrado && info.m !== info.n) return [false, 'necesita un sistema cuadrado'];
    if (m.max && info.n > m.max) return [false, `máximo ${m.max} × ${m.max}`];
    if (!info.lineal && m.id === 'newton' && info.m !== info.n) return [false, 'necesita tantas ecuaciones como incógnitas'];
    return [true];
  }

  function recomendado() {
    if (!info) return null;
    if (!info.lineal) return info.forma_punto_fijo ? 'punto_fijo' : 'newton';
    if (info.m > info.n) return 'auto_sobre';
    return 'gauss_jordan';
  }

  function actualizarMetodos() {
    const previo = metodo.value;
    metodo.innerHTML = METODOS.map((m) => {
      const [ok, motivo] = aplicable(m);
      return `<option value="${m.id}" ${ok ? '' : 'disabled'}>${m.t}${ok ? '' : ` — ${motivo}`}</option>`;
    }).join('');
    const opcion = [...metodo.options].find((o) => o.value === previo && !o.disabled);
    metodo.value = opcion ? previo : 'auto';
    const rec = recomendado();
    const nota = $('[data-recomendacion]', el);
    if (nota && rec) {
      const textos = {
        newton: 'Recomendado: <strong>Newton-Raphson</strong> (necesita un x⁽⁰⁾ cercano a la solución).',
        punto_fijo: 'Está escrito como x = G(x): recomendado <strong>punto fijo</strong> (también puedes usar Newton).',
        auto_sobre: 'Más ecuaciones que incógnitas: se comprueba con <strong>Gauss-Jordan</strong> si hay solución exacta y, si no, se usa <strong>mínimos cuadrados</strong>.',
        gauss_jordan: info.m === info.n
          ? 'Recomendado: <strong>Gauss-Jordan</strong> con fracciones exactas. Para ver la convergencia, elige Jacobi o Gauss-Seidel.'
          : 'Menos ecuaciones que incógnitas: <strong>Gauss-Jordan</strong> da la solución general; mínimos cuadrados, la de norma mínima.',
      };
      nota.innerHTML = textos[rec];
    }
    sincronizarOpciones();
  }

  function sincronizarOpciones() {
    const m = METODOS.find((x) => x.id === metodo.value) || METODOS[0];
    const lineal = info?.lineal;
    const efectivo = m.id === 'auto' ? (lineal ? 'gauss_jordan' : recomendado()) : m.id;
    const conExacto = ['gauss_jordan', 'gauss', 'lu', 'cramer', 'inversa', 'auto_sobre'].includes(efectivo);
    el.querySelector('[data-op="exacto"]').hidden = !conExacto;
    el.querySelector('[data-op="pivoteo"]').hidden = !['gauss_jordan', 'gauss', 'lu', 'inversa', 'auto_sobre'].includes(efectivo);
    const iter = m.iterativo || ['newton', 'punto_fijo', 'punto_fijo_seidel'].includes(efectivo);
    el.querySelector('[data-op="iter"]').hidden = !iter;
    el.querySelector('[data-op="omega"]').hidden = m.id !== 'sor';
    el.querySelector('[data-op="desarrollar"]').hidden = !m.iterativo;
  }

  texto.addEventListener('input', () => {
    clearTimeout(temporizador);
    temporizador = setTimeout(interpretar, 450);
  });
  metodo.addEventListener('change', sincronizarOpciones);
  el.querySelector('.ejemplos-rapidos').addEventListener('click', async (e) => {
    const b = e.target.closest('[data-ej]');
    if (!b) return;
    const ej = EJEMPLOS[Number(b.dataset.ej)];
    texto.value = ej.x;
    $('#rs-x0', el).value = ej.x0 || '';
    await interpretar();
    metodo.value = ej.m || 'auto';
    sincronizarOpciones();
    $('#rs-resolver', el).click();
  });
  texto.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) $('#rs-resolver', el).click();
  });

  $('#rs-resolver', el).addEventListener('click', (e) => conCarga(e.currentTarget, async () => {
    const salida = $('#rs-resultado', el);
    try {
      if (!info) await interpretar();
      if (!info) throw new Error('Corrige primero las ecuaciones.');
      await resolver(salida, info, metodo.value === 'auto' ? recomendado() : metodo.value, el);
      salida.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      salida.innerHTML = error(err.message);
    }
  }));

  interpretar();
  return {};
}

async function resolver(salida, info, metodo, el) {
  const nombres = info.variables.map(texVar);
  const exacto = $('#rs-exacto', el).checked;
  const pivoteo = $('#rs-pivoteo', el).checked;
  const A = info.A;
  const b = info.b;
  const x0Texto = $('#rs-x0', el).value.trim();
  const x0 = x0Texto ? leerLista(x0Texto) : null;
  if (x0 && (x0.length !== info.n || x0.some((v) => !Number.isFinite(v)))) {
    throw new Error(`x⁽⁰⁾ debe tener ${info.n} números (uno por incógnita: ${info.variables.join(', ')}).`);
  }
  const iter = { tol: $('#rs-tol', el).value, max_iter: $('#rs-max', el).value };
  const cabecera = (t) => `<div class="tarjeta cabecera-resultado"><span class="etiqueta">Método</span><h2>${t}</h2></div>`;

  if (metodo === 'gauss_jordan' || metodo === 'inversa') {
    const { mostrar } = await import('./gauss-jordan.js');
    const r = await api.gaussJordan({ A, b, modo: metodo === 'inversa' ? 'inversa' : 'sistema', pivoteo, exacto });
    mostrar(salida, { ...r, nombres });
    salida.insertAdjacentHTML('afterbegin', cabecera(metodo === 'inversa' ? 'Inversa con Gauss-Jordan' : 'Gauss-Jordan'));
    if (r.clasificacion === 'incompatible') {
      salida.insertAdjacentHTML('beforeend', `<div class="alerta">El sistema no tiene solución exacta.
        <button class="btn btn-pequeno" data-ir-minimos>Calcular la mejor aproximación (mínimos cuadrados)</button></div>`);
      salida.querySelector('[data-ir-minimos]').addEventListener('click', () => {
        $('#rs-metodo', el).value = 'minimos';
        $('#rs-resolver', el).click();
      });
    }
    return;
  }
  if (metodo === 'auto_sobre') {
    const gj = await api.gaussJordan({ A, b, modo: 'sistema', pivoteo, exacto });
    if (gj.clasificacion !== 'incompatible') {
      const { mostrar } = await import('./gauss-jordan.js');
      mostrar(salida, { ...gj, nombres });
      salida.insertAdjacentHTML('afterbegin', cabecera('Gauss-Jordan: el sistema sobredeterminado sí es compatible'));
      return;
    }
    return resolver(salida, info, 'minimos', el);
  }
  if (['gauss', 'lu', 'cholesky', 'cramer'].includes(metodo)) {
    const r = await api.directo(metodo, { A, b, pivoteo, exacto });
    await mostrarDirecto(salida, r, nombres);
    return;
  }
  if (['jacobi', 'gauss_seidel', 'sor'].includes(metodo)) {
    const { mostrar } = await import('./jacobi.js');
    const comun = { A, b, x0, ...iter, omega: $('#rs-omega', el).value, desarrollar: $('#rs-desarrollar', el).value };
    const [rj, rg, rs] = await Promise.all(['jacobi', 'gauss_seidel', 'sor'].map((m) => api.iterativos({ ...comun, metodo: m })));
    const todos = { jacobi: rj, gauss_seidel: rg, sor: rs };
    mostrar(salida, todos[metodo], todos);
    salida.insertAdjacentHTML('afterbegin', cabecera(todos[metodo].nombre));
    if (todos[metodo].estado !== 'converge' && !todos[metodo].dominancia.estricta) {
      aviso('No es diagonal dominante: prueba a reordenar las ecuaciones o usa un método directo.', 'error');
    }
    return;
  }
  if (metodo === 'minimos') {
    const { mostrar } = await import('./nc-calculadora.js');
    const r = await api.resolver(A, b);
    mostrar(r, A, b, salida);
    salida.insertAdjacentHTML('afterbegin', cabecera('Mínimos cuadrados'));
    return;
  }
  if (metodo === 'estabilidad') {
    const { mostrar } = await import('./estabilidad.js');
    const r = await api.estabilidad({ A, b });
    mostrar(salida, r, A, b);
    salida.insertAdjacentHTML('afterbegin', cabecera('Estabilidad y convergencia'));
    return;
  }
  if (metodo === 'newton' || metodo.startsWith('punto_fijo')) {
    const pagina = await import('./lineales.js');
    const datos = { ecuaciones: info.ecuaciones, variables: info.variables, x0: x0 || info.variables.map(() => (metodo === 'newton' ? 1 : 0)), ...iter };
    if (metodo === 'newton') {
      pagina.mostrarNewton(salida, await api.newton(datos));
    } else {
      pagina.mostrarPuntoFijo(salida, await api.puntoFijo({ ...datos, seidel: metodo === 'punto_fijo_seidel' }));
    }
    salida.insertAdjacentHTML('afterbegin', cabecera(metodo === 'newton' ? 'Newton-Raphson' : 'Punto fijo'));
    if (!x0) salida.insertAdjacentHTML('beforeend', `<p class="nota">Se usó x⁽⁰⁾ = (${datos.x0.join(', ')}). Si no converge o da otra raíz, escribe un x⁽⁰⁾ cercano.</p>`);
    return;
  }
  throw new Error(`Método no disponible: ${escapar(metodo)}`);
}
