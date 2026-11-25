import { api } from '../api.js';
import { $, aviso, conCarga, error, guardar, leer } from '../componentes/ui.js';
import { escapar, renderizar } from '../matematicas.js';

export default async function montar(el) {
  el.innerHTML = `
    <header class="cabecera-tema">
      <p class="miga">Unidad 03 · Evaluación</p>
      <h1>Evaluación de la unidad</h1>
      <p class="lead">Preguntas de todos los temas. Se califican en el servidor (las respuestas correctas nunca llegan al navegador) y tu mejor intento entra al ranking.</p>
    </header>
    <div class="grid-quiz">
      <form id="quiz-form" class="panel" novalidate>
        <div class="controles">
          <label class="campo crece">Nombre <input type="text" id="quiz-nombre" required maxlength="120" autocomplete="name"></label>
          <label class="campo crece">Correo <input type="email" id="quiz-correo" required autocomplete="email"></label>
        </div>
        <div class="progreso" aria-hidden="true"><span id="quiz-barra"></span></div>
        <p class="nota" id="quiz-contador"></p>
        <div id="quiz-preguntas"></div>
        <div class="acciones"><button class="btn" type="submit" id="quiz-enviar">Enviar respuestas</button></div>
        <div id="quiz-resultado" aria-live="polite"></div>
      </form>
      <aside class="panel panel-pegajoso">
        <h3>Ranking</h3>
        <div id="quiz-ranking" class="tabla-contenedor"></div>
        <button class="btn btn-fantasma btn-pequeno" id="quiz-refrescar" type="button">Actualizar</button>
        <p class="nota">Si el backend se reinicia sin base de datos persistente, el ranking vuelve a empezar.</p>
      </aside>
    </div>`;

  const form = $('#quiz-form', el);
  $('#quiz-nombre', el).value = leer('quiz:nombre') || '';
  $('#quiz-correo', el).value = leer('quiz:correo') || '';

  let preguntas = [];
  try {
    ({ preguntas } = await api.preguntas());
  } catch (err) {
    $('#quiz-preguntas', el).innerHTML = error(err.message);
  }

  // Agrupar por tema
  const grupos = [];
  preguntas.forEach((p) => {
    let g = grupos.find((x) => x.tema === p.tema);
    if (!g) grupos.push((g = { tema: p.tema, lista: [] }));
    g.lista.push(p);
  });
  let numero = 0;
  $('#quiz-preguntas', el).innerHTML = grupos.map((g) => `<fieldset class="grupo-preguntas"><legend>${escapar(g.tema)}</legend>${g.lista
    .map((p) => {
      numero += 1;
      const cuerpo = p.tipo === 'opcion'
        ? p.opciones.map((o, k) => `<label class="opcion"><input type="radio" name="${p.id}" value="${k}"><span>${o}</span></label>`).join('')
        : `<input type="text" inputmode="decimal" name="${p.id}" class="respuesta-num" placeholder="Tu respuesta" autocomplete="off">`;
      return `<div class="pregunta" data-id="${p.id}"><p><span class="num-pregunta">${numero}.</span> ${p.enunciado}</p><div class="opciones">${cuerpo}</div><div class="retro"></div></div>`;
    }).join('')}</fieldset>`).join('');
  renderizar($('#quiz-preguntas', el));

  const respondidas = () => preguntas.filter((p) => {
    if (p.tipo === 'opcion') return form.querySelector(`input[name="${p.id}"]:checked`);
    return form.elements[p.id]?.value.trim();
  }).length;
  const actualizarProgreso = () => {
    const r = respondidas();
    $('#quiz-barra', el).style.width = `${preguntas.length ? (100 * r) / preguntas.length : 0}%`;
    $('#quiz-contador', el).textContent = `${r} de ${preguntas.length} respondidas`;
  };
  form.addEventListener('input', actualizarProgreso);
  actualizarProgreso();

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    conCarga($('#quiz-enviar', el), async () => {
      const respuestas = {};
      preguntas.forEach((p) => {
        const v = p.tipo === 'opcion'
          ? form.querySelector(`input[name="${p.id}"]:checked`)?.value
          : form.elements[p.id]?.value;
        if (v !== undefined && v !== '') respuestas[p.id] = v;
      });
      const faltan = preguntas.length - Object.keys(respuestas).length;
      if (faltan && !window.confirm(`Te faltan ${faltan} preguntas por responder. ¿Enviar de todas formas?`)) return;
      const salida = $('#quiz-resultado', el);
      try {
        const nombre = $('#quiz-nombre', el).value;
        const correo = $('#quiz-correo', el).value;
        const nota = await api.enviarQuiz({ nombre, correo, respuestas });
        guardar('quiz:nombre', nombre);
        guardar('quiz:correo', correo);
        nota.detalle.forEach((d) => {
          const caja = form.querySelector(`.pregunta[data-id="${d.id}"]`);
          caja.classList.toggle('bien', d.correcta);
          caja.classList.toggle('mal', !d.correcta);
          caja.querySelector('.retro').innerHTML = `<strong>${d.correcta ? '✔ Correcto.' : '✘ Incorrecto.'}</strong> ${d.explicacion}`;
        });
        renderizar(form);
        salida.innerHTML = `<div class="puntaje"><strong>${nota.puntaje}</strong><span>/ 100</span><small>${nota.aciertos} de ${nota.total} correctas</small></div>`;
        salida.scrollIntoView({ behavior: 'smooth', block: 'center' });
        aviso('Respuestas guardadas', 'ok');
        cargarRanking(el);
      } catch (err) {
        salida.innerHTML = error(err.message);
      }
    });
  });
  $('#quiz-refrescar', el).addEventListener('click', () => cargarRanking(el));
  cargarRanking(el);
  return {};
}

async function cargarRanking(el) {
  const caja = $('#quiz-ranking', el);
  try {
    const { ranking } = await api.ranking();
    caja.innerHTML = ranking.length
      ? `<table><thead><tr><th>#</th><th>Nombre</th><th>Puntaje</th></tr></thead><tbody>${ranking
          .map((r, i) => `<tr><td>${['🥇', '🥈', '🥉'][i] || i + 1}</td><td>${escapar(r.nombre)}</td><td>${r.puntaje} <span class="nota">(${r.aciertos}/${r.total})</span></td></tr>`)
          .join('')}</tbody></table>`
      : '<p class="nota">Nadie ha respondido todavía.</p>';
  } catch {
    caja.innerHTML = '<p class="nota">Ranking no disponible.</p>';
  }
}
