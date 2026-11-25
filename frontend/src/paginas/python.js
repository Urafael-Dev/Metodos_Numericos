import { bloqueCodigo } from '../componentes/codigo.js';
import { cabecera } from '../componentes/ui.js';

const LISTA = [
  ['01_lineales_no_lineales.py', '3.1', 'Clasificar con rangos y Newton-Raphson multivariable', 'lineales'],
  ['02_directos_vs_iterativos.py', '3.2', 'Tiempo y error: directo frente a Gauss-Seidel', 'directos-iterativos'],
  ['03_gauss_jordan.py', '3.3', 'Gauss-Jordan con pivoteo e inversa', 'gauss-jordan'],
  ['04_jacobi_gauss_seidel.py', '3.4', 'Jacobi, Gauss-Seidel, SOR y radio espectral', 'jacobi-gauss-seidel'],
  ['05_no_cuadrados_minimos_cuadrados.py', '3.5', 'Ecuaciones normales, QR, norma mínima y pseudoinversa', 'no-cuadrados'],
  ['06_estabilidad_convergencia.py', '3.6', 'Número de condición, Hilbert y perturbaciones', 'estabilidad'],
];

export default function montar(el, { tema }) {
  el.innerHTML = `${cabecera(tema)}
    <div class="grid-2">
      <div class="tarjeta">
        <h3>Cómo ejecutarlas</h3>
        <ol class="lista-pasos">
          <li>Instala Python 3.10+ y NumPy: <code>pip install numpy</code>.</li>
          <li>Descarga o copia el script.</li>
          <li>Ejecuta <code>python 03_gauss_jordan.py</code>.</li>
        </ol>
        <p class="nota">También funcionan en <a href="https://colab.research.google.com/" target="_blank" rel="noopener">Google Colab</a>: pega el código en una celda.</p>
      </div>
      <div class="tarjeta">
        <h3>Ejercicios propuestos</h3>
        <ul class="lista-limpia">
          <li>Cambia <code>A</code> en la práctica 4 por una matriz no dominante y observa ρ(T).</li>
          <li>En la práctica 6, ¿desde qué n la solución de Hilbert pierde todas las cifras?</li>
          <li>En la práctica 5, ajusta una parábola (añade la columna x²) y compara Σr².</li>
          <li>En la práctica 1, prueba x⁽⁰⁾ = (0, 0): ¿por qué falla Newton?</li>
        </ul>
      </div>
    </div>
    <nav class="indice-practicas" aria-label="Índice de prácticas">${LISTA.map(
      ([archivo, num, desc]) => `<a href="#practica-${num}" data-ancla="practica-${num}"><span class="num">${num}</span>${desc}</a>`,
    ).join('')}</nav>
    ${LISTA.map(([archivo, num, desc, id]) => `<section class="practica" id="practica-${num}">
      <h2><span class="num">${num}</span> ${desc}</h2>
      <p class="nota"><a href="#/${id}">Ver la teoría y el simulador de este tema →</a></p>
      ${bloqueCodigo(archivo)}
    </section>`).join('')}`;

  // Los enlaces del índice no deben cambiar la ruta (#/python): desplazan la vista.
  el.querySelector('.indice-practicas').addEventListener('click', (e) => {
    const a = e.target.closest('[data-ancla]');
    if (!a) return;
    e.preventDefault();
    document.getElementById(a.dataset.ancla).scrollIntoView({ behavior: 'smooth' });
  });
  return {};
}
