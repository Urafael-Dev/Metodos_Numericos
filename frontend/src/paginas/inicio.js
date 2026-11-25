import { escapar } from '../matematicas.js';

export default function montar(el, { temas }) {
  el.innerHTML = String.raw`
  <section class="hero">
    <div class="hero-texto">
      <p class="etiqueta">Métodos Numéricos · Unidad 03</p>
      <h1>Métodos de solución de <span class="resaltado">sistemas de ecuaciones</span></h1>
      <p class="lead">Teoría, simuladores paso a paso calculados por un backend en Django, gráficas interactivas y prácticas en Python
        para cada tema de la unidad: de Gauss-Jordan a mínimos cuadrados.</p>
      <div class="hero-botones">
        <a href="#/resolver" class="btn">⚡ Resolver un ejercicio</a>
        <a href="#/lineales" class="btn btn-secundario">Empezar por el tema 3.1</a>
        <a href="#/no-cuadrados" class="btn btn-secundario">★ Sistemas no cuadrados</a>
      </div>
    </div>
    <div class="hero-formula" aria-hidden="true">
      $$A\mathbf{x} = \mathbf{b}$$
      $$\left[\begin{array}{ccc|c}1&0&0&x_1\\0&1&0&x_2\\0&0&1&x_3\end{array}\right]$$
      $$\mathbf{x}^{(k+1)} = T\mathbf{x}^{(k)} + \mathbf{c}$$
      $$A^TA\,\hat{\mathbf{x}} = A^T\mathbf{b}$$
    </div>
  </section>

  <h2>Temas de la unidad</h2>
  <div class="grid-temas">
    ${temas.map((t) => `<a class="tarjeta-tema${t.destacado ? ' destacada' : ''}" href="#/${t.id}">
      <span class="icono" aria-hidden="true">${escapar(t.icono)}</span>
      <span class="num">Tema ${t.numero}${t.destacado ? ' · ★ exposición' : ''}</span>
      <strong>${t.titulo}</strong>
      <span class="desc">${t.resumen}</span>
    </a>`).join('')}
  </div>

  <h2 class="separado">¿Qué método uso?</h2>
  <div class="flujo" aria-label="Guía para elegir el método">
    <div class="nodo">¿Las ecuaciones son lineales?</div>
    <div class="ramas">
      <div><span class="etq">No</span><div class="nodo hoja"><a href="#/lineales/newton">Newton-Raphson (3.1)</a><br><small>resuelve un sistema lineal por paso</small></div></div>
      <div><span class="etq">Sí</span>
        <div class="nodo">¿A es cuadrada (m = n)?</div>
        <div class="ramas">
          <div><span class="etq">No</span><div class="nodo hoja"><a href="#/no-cuadrados/calculadora">Mínimos cuadrados (3.5)</a></div></div>
          <div><span class="etq">Sí</span>
            <div class="nodo">¿Grande y dispersa?</div>
            <div class="ramas">
              <div><span class="etq">No</span><div class="nodo hoja"><a href="#/gauss-jordan/simulador">Gauss-Jordan (3.3)</a></div></div>
              <div><span class="etq">Sí</span><div class="nodo hoja"><a href="#/jacobi-gauss-seidel/simulador">Jacobi / Gauss-Seidel (3.4)</a></div></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <p class="nota centrado">Y siempre: revisa el <a href="#/estabilidad/analizador">número de condición (3.6)</a> antes de confiar en las cifras.</p>

  <div class="grid-3 separado">
    <div class="tarjeta"><h3>Paso a paso</h3><p>Cada simulador muestra las operaciones de fila, las iteraciones desarrolladas y las tablas que pediría un parcial.</p></div>
    <div class="tarjeta"><h3>Visual</h3><p>Rectas que se cortan, curvas implícitas, trayectorias de iteración, convergencia en escala logarítmica y proyección en 3D.</p></div>
    <div class="tarjeta"><h3>Verificado</h3><p>Los cálculos los hace Django con NumPy y SymPy, con pruebas automáticas contra resultados conocidos.</p></div>
  </div>`;
  return {};
}
