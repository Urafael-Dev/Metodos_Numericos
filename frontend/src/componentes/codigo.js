import hljs from 'highlight.js/lib/core';
import python from 'highlight.js/lib/languages/python';
import { escapar } from '../matematicas.js';
import { aviso } from './ui.js';

hljs.registerLanguage('python', python);

// Prácticas en Python: se importan como texto para mostrarlas y descargarlas.
const archivos = import.meta.glob('../practicas/*.py', { query: '?raw', import: 'default', eager: true });

export const PRACTICAS = Object.fromEntries(
  Object.entries(archivos).map(([ruta, texto]) => [ruta.split('/').pop(), texto]),
);

export function bloqueCodigo(nombre) {
  const texto = PRACTICAS[nombre];
  if (!texto) return '';
  const html = hljs.highlight(texto, { language: 'python' }).value;
  return `<figure class="codigo" data-archivo="${escapar(nombre)}">
    <figcaption>
      <span class="codigo-nombre">${escapar(nombre)}</span>
      <span class="codigo-acciones">
        <button type="button" class="btn btn-fantasma btn-pequeno" data-copiar>Copiar</button>
        <button type="button" class="btn btn-fantasma btn-pequeno" data-descargar>Descargar .py</button>
      </span>
    </figcaption>
    <pre><code class="hljs language-python">${html}</code></pre>
  </figure>`;
}

// Delegación global: funciona para cualquier bloque insertado después.
document.addEventListener('click', async (e) => {
  const fig = e.target.closest('.codigo');
  if (!fig) return;
  const nombre = fig.dataset.archivo;
  const texto = PRACTICAS[nombre];
  if (e.target.closest('[data-copiar]')) {
    try {
      await navigator.clipboard.writeText(texto);
      aviso('Código copiado al portapapeles', 'ok');
    } catch {
      aviso('No se pudo copiar: selecciona el texto manualmente', 'error');
    }
  } else if (e.target.closest('[data-descargar]')) {
    const url = URL.createObjectURL(new Blob([texto], { type: 'text/x-python' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
});
