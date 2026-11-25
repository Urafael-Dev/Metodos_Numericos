import { escapar } from '../matematicas.js';

export const $ = (sel, raiz = document) => raiz.querySelector(sel);
export const $$ = (sel, raiz = document) => [...raiz.querySelectorAll(sel)];

export const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

export const guardar = (k, v) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* sin almacenamiento */
  }
};
export const leer = (k) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};

/** Aviso flotante (errores de red, copiado, etc.). */
export function aviso(texto, tipo = 'info') {
  let zona = $('#avisos');
  if (!zona) {
    zona = document.createElement('div');
    zona.id = 'avisos';
    zona.setAttribute('aria-live', 'polite');
    document.body.appendChild(zona);
  }
  const el = document.createElement('div');
  el.className = `aviso aviso-${tipo}`;
  el.textContent = texto;
  zona.appendChild(el);
  setTimeout(() => el.classList.add('saliendo'), 3800);
  setTimeout(() => el.parentNode?.removeChild(el), 4300);
}

/** Ejecuta una acción asíncrona mostrando estado de carga en el botón. */
export async function conCarga(boton, accion) {
  if (boton.disabled) return undefined;
  boton.disabled = true;
  boton.classList.add('cargando');
  try {
    return await accion();
  } finally {
    boton.disabled = false;
    boton.classList.remove('cargando');
  }
}

export const error = (msg) =>
  `<div class="alerta alerta-error" role="alert"><strong>No se pudo calcular.</strong> ${escapar(msg)}</div>`;
export const vacio = (msg) => `<div class="vacio">${msg}</div>`;

/** Pestañas accesibles: botones con data-pestana y paneles con data-panel. */
export function pestanas(raiz, { alCambiar } = {}) {
  const botones = $$('[role="tab"]', raiz);
  const activar = (id, foco = false) => {
    if (!botones.some((b) => b.dataset.pestana === id)) id = botones[0].dataset.pestana;
    botones.forEach((b) => {
      const activo = b.dataset.pestana === id;
      b.setAttribute('aria-selected', String(activo));
      b.tabIndex = activo ? 0 : -1;
      if (activo && foco) b.focus();
    });
    $$('[role="tabpanel"]', raiz).forEach((p) => {
      p.hidden = p.dataset.panel !== id;
    });
    alCambiar?.(id);
  };
  botones.forEach((b, i) => {
    b.addEventListener('click', () => activar(b.dataset.pestana));
    b.addEventListener('keydown', (e) => {
      const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (d) activar(botones[(i + d + botones.length) % botones.length].dataset.pestana, true);
    });
  });
  return activar;
}

export function plantillaPestanas(id, lista) {
  return `<div class="pestanas" role="tablist" aria-label="Secciones del tema">${lista
    .map(
      (p) =>
        `<button role="tab" id="tab-${id}-${p.id}" data-pestana="${p.id}" aria-controls="panel-${id}-${p.id}">${p.titulo}</button>`,
    )
    .join('')}</div>`;
}

export function panel(id, pid, contenido) {
  return `<section role="tabpanel" id="panel-${id}-${pid}" data-panel="${pid}" aria-labelledby="tab-${id}-${pid}" hidden>${contenido}</section>`;
}

export function chips(lista) {
  return `<div class="chips">${lista
    .filter(Boolean)
    .map(([t, tipo]) => `<span class="chip ${tipo ? `chip-${tipo}` : ''}">${t}</span>`)
    .join('')}</div>`;
}

export function metricas(lista) {
  return `<div class="metricas">${lista
    .map(
      ([k, v, nota]) =>
        `<div class="metrica"><span>${k}</span><strong>${v}</strong>${nota ? `<small>${nota}</small>` : ''}</div>`,
    )
    .join('')}</div>`;
}

/** Cabecera común de cada tema. */
export function cabecera(tema) {
  return `<header class="cabecera-tema">
    <p class="miga">Unidad 03 · Tema ${tema.numero}${tema.destacado ? ' · <span class="destacado">Tema de exposición</span>' : ''}</p>
    <h1>${tema.titulo}</h1>
    <p class="lead">${tema.resumen}</p>
  </header>`;
}

/**
 * Estructura común de un tema: cabecera + pestañas + paneles.
 * secciones: [{ id, titulo, html }]. Devuelve la función activar(id).
 */
export function montarTema(el, tema, secciones, pestanaInicial) {
  el.innerHTML = `${cabecera(tema)}${plantillaPestanas(tema.id, secciones)}${secciones
    .map((s) => panel(tema.id, s.id, s.html))
    .join('')}`;
  const activar = pestanas(el, {
    alCambiar: (pid) => {
      guardar(`pestana:${tema.id}`, pid);
      window.dispatchEvent(new CustomEvent('pestana-cambiada', { detail: { tema: tema.id, pestana: pid } }));
    },
  });
  activar(pestanaInicial || leer(`pestana:${tema.id}`) || secciones[0].id);
  return activar;
}

/** Selector de ejemplos precargados. */
export function selectorEjemplos(id, ejemplos) {
  return `<label class="campo crece">Ejemplo
    <select id="${id}"><option value="">— Elegir un ejemplo —</option>${ejemplos
      .map((e) => `<option value="${e.id}">${escapar(e.titulo)}</option>`)
      .join('')}</select></label>`;
}
