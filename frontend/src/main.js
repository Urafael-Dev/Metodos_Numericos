import '@fontsource-variable/inter';
import '@fontsource-variable/jetbrains-mono';
import 'katex/dist/katex.min.css';
import './style.css';
import { api } from './api.js';
import { $, $$, aviso, guardar, leer } from './componentes/ui.js';
import { renderizar } from './matematicas.js';
import { PAGINAS_EXTRA, TEMAS } from './temas.js';

const raiz = document.documentElement;
const vista = $('#vista');

// ---------------------------------------------------------------- Tema visual
const guardado = leer('tema');
if (guardado) raiz.dataset.theme = guardado;
$('#btn-tema').addEventListener('click', () => {
  const oscuro = raiz.dataset.theme
    ? raiz.dataset.theme === 'dark'
    : matchMedia('(prefers-color-scheme: dark)').matches;
  raiz.dataset.theme = oscuro ? 'light' : 'dark';
  guardar('tema', raiz.dataset.theme);
  window.dispatchEvent(new Event('tema-cambiado'));
});

// ------------------------------------------------------------ Menú lateral
$('#menu-temas').innerHTML = TEMAS.map(
  (t) => `<li><a href="#/${t.id}" data-ruta="${t.id}">
      <span class="num">${t.numero}</span><span class="txt">${t.corto}</span>${
        t.destacado ? '<span class="estrella" title="Tema de exposición">★</span>' : ''
      }</a></li>`,
).join('');

const cuerpo = document.body;
const abrirMenu = (abrir) => {
  cuerpo.classList.toggle('menu-abierto', abrir);
  $('#btn-menu').setAttribute('aria-expanded', String(abrir));
};
$('#btn-menu').addEventListener('click', () => abrirMenu(!cuerpo.classList.contains('menu-abierto')));
$('#velo').addEventListener('click', () => abrirMenu(false));
document.addEventListener('keydown', (e) => e.key === 'Escape' && abrirMenu(false));

// ------------------------------------------------------------ Enrutador
// Rutas: #/inicio, #/<tema>, #/<tema>/<pestaña>. Cada página se carga una sola vez
// (import dinámico: three.js solo se descarga si se visita su tema) y luego se oculta/muestra.
const montadas = new Map();

function analizarRuta() {
  const m = location.hash.match(/^#\/([\w-]+)(?:\/([\w-]+))?/);
  return { id: m?.[1] || 'inicio', pestana: m?.[2] || null };
}

async function navegar() {
  const { id, pestana } = analizarRuta();
  const tema = TEMAS.find((t) => t.id === id) || PAGINAS_EXTRA[id] || PAGINAS_EXTRA.inicio;
  abrirMenu(false);

  $$('[data-ruta]').forEach((a) => {
    const activo = a.dataset.ruta === tema.id;
    a.classList.toggle('activo', activo);
    if (activo) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  montadas.forEach((m, k) => {
    m.el.hidden = k !== tema.id;
  });

  const nuevaPagina = !montadas.has(tema.id);
  if (nuevaPagina) {
    const el = document.createElement('div');
    el.className = 'pagina';
    el.dataset.pagina = tema.id;
    el.innerHTML = '<div class="cargando-pagina"><span class="spinner"></span> Cargando…</div>';
    vista.appendChild(el);
    const pagina = { el, ctrl: null };
    montadas.set(tema.id, pagina);
    try {
      const modulo = await tema.cargar();
      el.innerHTML = '';
      pagina.ctrl = await modulo.default(el, { tema, temas: TEMAS, pestana });
      renderizar(el);
      el.insertAdjacentHTML('beforeend', navegacionInferior(tema));
    } catch (err) {
      console.error(err);
      el.innerHTML = '<div class="alerta alerta-error">No se pudo cargar esta sección. Recarga la página.</div>';
      montadas.delete(tema.id);
    }
  } else if (pestana) {
    montadas.get(tema.id).ctrl?.activar?.(pestana);
  }
  document.title = `${tema.id === 'inicio' ? '' : `${tema.titulo} · `}Unidad 03 · Métodos Numéricos`;
  if (nuevaPagina || !pestana) window.scrollTo({ top: 0 });
}

function navegacionInferior(tema) {
  const i = TEMAS.findIndex((t) => t.id === tema.id);
  if (i < 0) return '';
  const ant = TEMAS[i - 1];
  const sig = TEMAS[i + 1] || PAGINAS_EXTRA.evaluacion;
  return `<nav class="nav-inferior" aria-label="Navegación entre temas">
    ${ant ? `<a href="#/${ant.id}" class="tarjeta-nav"><small>← Anterior</small><strong>${ant.titulo}</strong></a>` : '<span></span>'}
    <a href="#/${sig.id}" class="tarjeta-nav siguiente"><small>Siguiente →</small><strong>${sig.titulo}</strong></a>
  </nav>`;
}

window.addEventListener('hashchange', navegar);
navegar();

// Cambiar de pestaña actualiza la URL sin recargar, para poder compartir el enlace.
window.addEventListener('pestana-cambiada', (e) => {
  const { tema, pestana } = e.detail;
  const nueva = `#/${tema}/${pestana}`;
  if (location.hash !== nueva) history.replaceState(null, '', nueva);
});

// ------------------------------------------------------- Estado del backend
const indicador = $('#estado-api');
api
  .estado()
  .then(() => {
    indicador.classList.add('ok');
    indicador.title = 'Backend de Django en línea';
  })
  .catch(() => {
    indicador.classList.add('caido');
    indicador.title = 'Backend no disponible';
    aviso('El backend no responde: los simuladores no funcionarán hasta que vuelva.', 'error');
  });
