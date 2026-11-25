import {
  BarController, BarElement, CategoryScale, Chart, Filler, Legend, LinearScale, LineController,
  LineElement, LogarithmicScale, PointElement, ScatterController, Tooltip,
} from 'chart.js';
import { fmt } from '../matematicas.js';
import { css } from './ui.js';

Chart.register(LineController, ScatterController, BarController, LineElement, PointElement, BarElement,
  LinearScale, LogarithmicScale, CategoryScale, Tooltip, Legend, Filler);

export const COLORES = () => ({
  jacobi: css('--col-b'),
  gauss_seidel: css('--col-p'),
  sor: css('--acento'),
  rojo: css('--col-r'),
  gris: css('--col-a'),
  texto: css('--texto-2'),
  rejilla: css('--borde'),
});

const graficas = new WeakMap();

/** Crea o reemplaza una gráfica de Chart.js en un canvas, con colores del tema. */
export function grafica(canvas, config) {
  graficas.get(canvas)?.destroy();
  const c = COLORES();
  const base = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 250 },
    interaction: { mode: 'nearest', intersect: false },
    plugins: {
      legend: { labels: { color: c.texto, usePointStyle: true, boxWidth: 8 } },
      tooltip: { callbacks: { label: (t) => `${t.dataset.label}: ${fmt(t.parsed.y, 5)}` } },
    },
  };
  const opciones = { ...base, ...config.options, plugins: { ...base.plugins, ...(config.options?.plugins || {}) } };
  for (const eje of Object.values(opciones.scales || {})) {
    eje.ticks = { color: c.texto, ...(eje.ticks || {}) };
    eje.grid = { color: c.rejilla, ...(eje.grid || {}) };
    if (eje.title) eje.title = { display: true, color: c.texto, ...eje.title };
  }
  const g = new Chart(canvas, { ...config, options: opciones });
  graficas.set(canvas, g);
  return g;
}
