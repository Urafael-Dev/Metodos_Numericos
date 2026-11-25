import { css } from './ui.js';

/**
 * Plano cartesiano en <canvas> para:
 *  - rectas a·x + b·y = c (sistemas lineales 2 × 2),
 *  - curvas implícitas F(x, y) = 0 a partir de una malla (marching squares),
 *  - trayectorias de métodos iterativos y puntos marcados.
 * Se adapta al tema claro/oscuro y a la densidad de píxeles.
 */
export function crearPlano(contenedor, { alto = 360 } = {}) {
  contenedor.classList.add('plano');
  contenedor.style.height = `${alto}px`;
  const canvas = document.createElement('canvas');
  canvas.setAttribute('role', 'img');
  contenedor.appendChild(canvas);
  const leyenda = document.createElement('ul');
  leyenda.className = 'plano-leyenda';
  contenedor.after(leyenda);
  let escena = null;

  function dibujar(e = escena) {
    escena = e;
    if (!escena) return;
    const ancho = contenedor.clientWidth;
    const altoPx = contenedor.clientHeight;
    if (!ancho || !altoPx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = ancho * dpr;
    canvas.height = altoPx * dpr;
    canvas.style.width = `${ancho}px`;
    canvas.style.height = `${altoPx}px`;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, ancho, altoPx);

    let [x0, x1] = escena.xr;
    let [y0, y1] = escena.yr;
    // Misma escala en ambos ejes para que los ángulos (ortogonalidad) se vean bien.
    if (escena.igualEscala !== false) {
      const sx = (x1 - x0) / ancho;
      const sy = (y1 - y0) / altoPx;
      const s = Math.max(sx, sy);
      const cx = (x0 + x1) / 2;
      const cy = (y0 + y1) / 2;
      x0 = cx - (s * ancho) / 2; x1 = cx + (s * ancho) / 2;
      y0 = cy - (s * altoPx) / 2; y1 = cy + (s * altoPx) / 2;
    }
    const X = (x) => ((x - x0) / (x1 - x0)) * ancho;
    const Y = (y) => altoPx - ((y - y0) / (y1 - y0)) * altoPx;

    const texto2 = css('--texto-2');
    const borde = css('--borde');

    // Rejilla y ejes
    const paso = pasoBonito((x1 - x0) / 8);
    ctx.lineWidth = 1;
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillStyle = texto2;
    ctx.strokeStyle = borde;
    ctx.globalAlpha = 0.6;
    for (let gx = Math.ceil(x0 / paso) * paso; gx <= x1; gx += paso) {
      ctx.beginPath(); ctx.moveTo(X(gx), 0); ctx.lineTo(X(gx), altoPx); ctx.stroke();
    }
    for (let gy = Math.ceil(y0 / paso) * paso; gy <= y1; gy += paso) {
      ctx.beginPath(); ctx.moveTo(0, Y(gy)); ctx.lineTo(ancho, Y(gy)); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = texto2;
    if (y0 < 0 && y1 > 0) { ctx.beginPath(); ctx.moveTo(0, Y(0)); ctx.lineTo(ancho, Y(0)); ctx.stroke(); }
    if (x0 < 0 && x1 > 0) { ctx.beginPath(); ctx.moveTo(X(0), 0); ctx.lineTo(X(0), altoPx); ctx.stroke(); }
    const yEtiq = y0 < 0 && y1 > 0 ? Y(0) : altoPx - 4;
    for (let gx = Math.ceil(x0 / paso) * paso; gx <= x1; gx += paso) {
      if (Math.abs(gx) > paso / 2) ctx.fillText(redondear(gx), X(gx) + 3, Math.min(altoPx - 4, yEtiq + 13));
    }
    const xEtiq = x0 < 0 && x1 > 0 ? X(0) : 4;
    for (let gy = Math.ceil(y0 / paso) * paso; gy <= y1; gy += paso) {
      if (Math.abs(gy) > paso / 2) ctx.fillText(redondear(gy), Math.max(4, xEtiq + 4), Y(gy) - 3);
    }

    const elementos = [];
    // Rectas a x + b y = c
    (escena.rectas || []).forEach((r) => {
      ctx.strokeStyle = r.color; ctx.lineWidth = 2.2;
      ctx.beginPath();
      if (Math.abs(r.b) > 1e-12) {
        ctx.moveTo(X(x0), Y((r.c - r.a * x0) / r.b));
        ctx.lineTo(X(x1), Y((r.c - r.a * x1) / r.b));
      } else if (Math.abs(r.a) > 1e-12) {
        ctx.moveTo(X(r.c / r.a), 0); ctx.lineTo(X(r.c / r.a), altoPx);
      }
      ctx.stroke();
      elementos.push([r.color, r.etiqueta]);
    });

    // Curvas implícitas: marching squares sobre la malla del backend
    (escena.contornos || []).forEach((c) => {
      ctx.strokeStyle = c.color; ctx.lineWidth = 2.2;
      ctx.beginPath();
      contorno(c.valores, c.xr, c.yr, (ax, ay, bx, by) => { ctx.moveTo(X(ax), Y(ay)); ctx.lineTo(X(bx), Y(by)); });
      ctx.stroke();
      elementos.push([c.color, c.etiqueta]);
    });

    // Trayectorias
    (escena.caminos || []).forEach((c) => {
      const pts = c.puntos.filter((p) => p.every(Number.isFinite));
      if (!pts.length) return;
      ctx.strokeStyle = c.color; ctx.fillStyle = c.color; ctx.lineWidth = 1.6;
      ctx.setLineDash(c.discontinua ? [5, 4] : []);
      ctx.beginPath();
      pts.forEach(([px, py], k) => (k ? ctx.lineTo(X(px), Y(py)) : ctx.moveTo(X(px), Y(py))));
      ctx.stroke();
      ctx.setLineDash([]);
      pts.forEach(([px, py], k) => {
        ctx.beginPath(); ctx.arc(X(px), Y(py), k === 0 ? 4.5 : 3, 0, Math.PI * 2); ctx.fill();
      });
      if (c.numerar) {
        ctx.font = '600 11px system-ui, sans-serif';
        pts.slice(0, 6).forEach(([px, py], k) => ctx.fillText(String(k), X(px) + 6, Y(py) - 6));
      }
      elementos.push([c.color, c.etiqueta]);
    });

    (escena.puntos || []).forEach((p) => {
      ctx.fillStyle = p.color; ctx.strokeStyle = css('--panel'); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(X(p.x), Y(p.y), 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      if (p.etiqueta) {
        ctx.font = '700 12px system-ui, sans-serif';
        ctx.fillText(p.etiqueta, X(p.x) + 9, Y(p.y) + 14);
      }
    });

    canvas.setAttribute('aria-label', escena.descripcion || 'Gráfica en el plano');
    leyenda.innerHTML = elementos
      .filter(([, t]) => t)
      .map(([col, t]) => `<li><i style="background:${col}"></i>${t}</li>`)
      .join('');
  }

  new ResizeObserver(() => dibujar()).observe(contenedor);
  window.addEventListener('tema-cambiado', () => dibujar());
  return { dibujar };
}

function pasoBonito(bruto) {
  const p = 10 ** Math.floor(Math.log10(bruto));
  const f = bruto / p;
  return (f < 1.5 ? 1 : f < 3.5 ? 2 : f < 7.5 ? 5 : 10) * p;
}

const redondear = (v) => String(Number(v.toPrecision(4)));

/** Marching squares para el nivel 0 de una malla (filas = y, columnas = x). */
function contorno(Z, [x0, x1], [y0, y1], segmento) {
  const ny = Z.length;
  const nx = Z[0].length;
  const dx = (x1 - x0) / (nx - 1);
  const dy = (y1 - y0) / (ny - 1);
  const interp = (a, b, va, vb) => a + ((b - a) * va) / (va - vb);
  for (let i = 0; i < ny - 1; i++) {
    for (let j = 0; j < nx - 1; j++) {
      const v = [Z[i][j], Z[i][j + 1], Z[i + 1][j + 1], Z[i + 1][j]];
      if (v.some((z) => z === null || z === undefined)) continue;
      const xa = x0 + j * dx; const xb = xa + dx;
      const ya = y0 + i * dy; const yb = ya + dy;
      const cruces = [];
      // aristas: abajo (0-1), derecha (1-2), arriba (2-3), izquierda (3-0)
      if ((v[0] > 0) !== (v[1] > 0)) cruces.push([interp(xa, xb, v[0], v[1]), ya]);
      if ((v[1] > 0) !== (v[2] > 0)) cruces.push([xb, interp(ya, yb, v[1], v[2])]);
      if ((v[2] > 0) !== (v[3] > 0)) cruces.push([interp(xb, xa, v[2], v[3]), yb]);
      if ((v[3] > 0) !== (v[0] > 0)) cruces.push([xa, interp(yb, ya, v[3], v[0])]);
      // Saltos enormes = discontinuidad (p. ej. tan), no un cero real
      const salto = Math.max(...v.map(Math.abs)) > 1e6;
      if (salto) continue;
      if (cruces.length === 2) segmento(...cruces[0], ...cruces[1]);
      else if (cruces.length === 4) { segmento(...cruces[0], ...cruces[1]); segmento(...cruces[2], ...cruces[3]); }
    }
  }
}

/** Ventana que contiene todos los puntos con margen. */
export function ventana(puntos, minimo = 4) {
  const xs = puntos.map((p) => p[0]).filter(Number.isFinite);
  const ys = puntos.map((p) => p[1]).filter(Number.isFinite);
  if (!xs.length) return { xr: [-minimo, minimo], yr: [-minimo, minimo] };
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const r = Math.max(minimo / 2, (Math.max(...xs) - Math.min(...xs)) * 0.65, (Math.max(...ys) - Math.min(...ys)) * 0.65);
  return { xr: [cx - r, cx + r], yr: [cy - r, cy + r] };
}
