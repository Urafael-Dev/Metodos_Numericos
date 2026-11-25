import { bloqueCodigo } from '../componentes/codigo.js';
import { montarTema } from '../componentes/ui.js';
import { iniciarAjuste } from './nc-ajuste.js';
import { iniciarCalculadora } from './nc-calculadora.js';
import { iniciarGeometria } from './nc-geometria3d.js';
import { AJUSTE, CALCULADORA, EJEMPLO, GEOMETRIA, TEORIA } from './nc-html.js';

export default async function montar(el, { tema, pestana }) {
  const activar = montarTema(el, tema, [
    { id: 'teoria', titulo: 'Teoría', html: TEORIA },
    { id: 'ejemplo', titulo: 'Ejemplo resuelto', html: EJEMPLO },
    { id: 'calculadora', titulo: 'Calculadora m × n', html: CALCULADORA },
    { id: 'ajuste', titulo: 'Ajuste de curvas', html: AJUSTE },
    { id: 'geometria', titulo: 'Geometría 3D', html: GEOMETRIA },
    {
      id: 'python',
      titulo: 'En Python',
      html: `<h2>Práctica en Python</h2>
        <p class="subtitulo">Ecuaciones normales, QR, norma mínima y pseudoinversa con NumPy.</p>
        ${bloqueCodigo('05_no_cuadrados_minimos_cuadrados.py')}`,
    },
  ], pestana);
  iniciarCalculadora();
  iniciarAjuste();
  iniciarGeometria();
  return { activar };
}
