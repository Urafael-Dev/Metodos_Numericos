// Contenido HTML del tema 3.5 (extraído de la primera versión de la app).

export const TEORIA = String.raw`
  <h2>Fundamentos teóricos</h2>
  <p class="subtitulo">Sistema \(A\mathbf{x}=\mathbf{b}\) con \(A\in\mathbb{R}^{m\times n}\), \(m\neq n\)</p>

  <div class="grid-3">
    <article class="tarjeta">
      <span class="chip">m &gt; n</span>
      <h3>Sobredeterminado</h3>
      <p>Más ecuaciones que incógnitas (p. ej. muchas mediciones y pocos parámetros). En general es
        <strong>inconsistente</strong>: \(\mathbf{b}\) no está en el espacio columna de \(A\).</p>
      <div class="formula">$$\hat{\mathbf{x}} = (A^TA)^{-1}A^T\mathbf{b}$$</div>
      <p class="nota">Válido si \(\operatorname{rango}(A)=n\): \(A^TA\) es simétrica y definida positiva.</p>
    </article>
    <article class="tarjeta destacada">
      <span class="chip">m &lt; n</span>
      <h3>Subdeterminado</h3>
      <p>Menos ecuaciones que incógnitas. Si es consistente tiene <strong>infinitas</strong> soluciones
        \(\mathbf{x}_p + \mathcal{N}(A)\); se elige la de menor norma \(\lVert\mathbf{x}\rVert_2\).</p>
      <div class="formula">$$\mathbf{x}^{*} = A^T(AA^T)^{-1}\mathbf{b}$$</div>
      <p class="nota">Válido si \(\operatorname{rango}(A)=m\): \(AA^T\) es \(m\times m\) e invertible.</p>
    </article>
    <article class="tarjeta">
      <span class="chip">rango &lt; mín(m, n)</span>
      <h3>Rango deficiente</h3>
      <p>Columnas o filas dependientes: \(A^TA\) y \(AA^T\) son singulares. Se usa la
        <strong>pseudoinversa</strong> de Moore-Penrose obtenida con la SVD.</p>
      <div class="formula">$$\hat{\mathbf{x}} = A^{+}\mathbf{b} = V\Sigma^{+}U^{T}\mathbf{b}$$</div>
      <p class="nota">Da la solución de mínimos cuadrados de norma mínima en todos los casos.</p>
    </article>
  </div>

  <div class="bloque-derivacion">
    <div>
      <h3>¿De dónde salen las ecuaciones normales?</h3>
      <p>Se minimiza la suma de los cuadrados de los residuos \(r_i = b_i - (A\mathbf{x})_i\):</p>
      $$S(\mathbf{x}) = \sum_{i=1}^{m} r_i^2 = (\mathbf{b}-A\mathbf{x})^T(\mathbf{b}-A\mathbf{x})$$
      <p>Igualando el gradiente a cero:</p>
      $$\nabla S = -2A^T(\mathbf{b}-A\mathbf{x}) = \mathbf{0} \;\Longrightarrow\; A^TA\,\hat{\mathbf{x}} = A^T\mathbf{b}$$
    </div>
    <div>
      <h3>Interpretación geométrica</h3>
      <p>\(A\hat{\mathbf{x}}\) es la <strong>proyección ortogonal</strong> de \(\mathbf{b}\) sobre el
        espacio columna de \(A\). El residuo es perpendicular a cada columna:</p>
      $$A^T\mathbf{r} = A^T(\mathbf{b}-A\hat{\mathbf{x}}) = \mathbf{0}$$
      <p>Lo puedes ver y girar en la sección <a href="#/no-cuadrados/geometria">Geometría 3D</a>.</p>
    </div>
  </div>

  <div class="banner">
    <h4>Precaución numérica: ecuaciones normales frente a QR</h4>
    <p>Formar \(A^TA\) eleva al cuadrado el número de condición, \(\kappa(A^TA)=\kappa(A)^2\). Si
      \(\kappa(A)\approx10^{8}\), las ecuaciones normales pierden casi toda la precisión en doble precisión.
      Con \(A=QR\) se resuelve \(R\hat{\mathbf{x}}=Q^T\mathbf{b}\) sin ese problema. La calculadora muestra
      ambos resultados y ambos números de condición.</p>
  </div>`;

export const EJEMPLO = String.raw`
  <h2>Caso de estudio: calibración de un sensor</h2>
  <p class="subtitulo">Cuatro lecturas \((x_i, y_i)\) y un modelo lineal \(y = c_0 + c_1x\): 4 ecuaciones, 2 incógnitas</p>

  <div class="grid-2">
    <div class="tarjeta">
      <h4>1 · Plantear el sistema sobredeterminado</h4>
      <p>Lecturas: \((1,2),\ (2,3),\ (3,5),\ (4,6)\). Cada punto aporta una ecuación \(c_0 + c_1x_i = y_i\):</p>
      $$\underbrace{\begin{bmatrix}1&1\\1&2\\1&3\\1&4\end{bmatrix}}_{A}
        \begin{bmatrix}c_0\\c_1\end{bmatrix} =
        \underbrace{\begin{bmatrix}2\\3\\5\\6\end{bmatrix}}_{\mathbf{b}}$$
      <p class="nota">\(\operatorname{rango}(A)=2\) pero \(\operatorname{rango}([A\mid\mathbf{b}])=3\): no hay solución exacta.</p>
    </div>
    <div class="tarjeta">
      <h4>2 · Formar las ecuaciones normales</h4>
      $$A^TA = \begin{bmatrix}4&10\\10&30\end{bmatrix},\qquad A^T\mathbf{b} = \begin{bmatrix}16\\47\end{bmatrix}$$
      $$\begin{cases}4c_0 + 10c_1 = 16\\10c_0 + 30c_1 = 47\end{cases}$$
    </div>
    <div class="tarjeta">
      <h4>3 · Resolver por eliminación de Gauss</h4>
      $$\left[\begin{array}{cc|c}10&30&47\\4&10&16\end{array}\right]
        \xrightarrow{F_2 - 0.4F_1}
        \left[\begin{array}{cc|c}10&30&47\\0&-2&-2.8\end{array}\right]$$
      $$c_1 = \frac{-2.8}{-2} = 1.4,\qquad c_0 = \frac{47 - 30(1.4)}{10} = 0.5$$
      <p class="nota">Se intercambiaron las filas para pivotear con el mayor valor absoluto (10).</p>
    </div>
    <div class="tarjeta destacada">
      <h4>4 · Interpretar el resultado</h4>
      $$\boxed{\,y = 0.5 + 1.4\,x\,}$$
      $$\mathbf{r} = \mathbf{b} - A\hat{\mathbf{x}} = \begin{bmatrix}0.1\\-0.3\\0.3\\-0.1\end{bmatrix},\quad
        \sum r_i^2 = 0.2,\quad R^2 = 0.98$$
      $$A^T\mathbf{r} = \begin{bmatrix}0\\0\end{bmatrix}\ \checkmark$$
      <button class="btn btn-pequeno" data-cargar-ejemplo="recta">Abrir en la calculadora</button>
    </div>
  </div>`;

export const CALCULADORA = String.raw`
  <h2>Calculadora de sistemas \(m\times n\)</h2>
  <p class="subtitulo">El backend de Django clasifica el sistema, elige el método y devuelve cada paso</p>

  <div class="panel">
    <div class="controles">
      <label>Ecuaciones (m) <input type="number" id="calc-m" min="1" max="12" value="4" /></label>
      <label>Incógnitas (n) <input type="number" id="calc-n" min="1" max="8" value="2" /></label>
      <label class="crece">Ejemplo
        <select id="calc-ejemplo"><option value="">— Elegir un ejemplo —</option></select>
      </label>
      <button class="btn btn-secundario" id="calc-aleatorio">Aleatorio</button>
      <button class="btn" id="calc-resolver">Resolver</button>
    </div>
    <div class="matriz-entrada" id="calc-matriz"></div>
    <p class="ayuda">Escribe los coeficientes de \(A\) y el vector \(\mathbf{b}\). Usa punto o coma decimal.</p>
  </div>

  <div id="calc-resultado" class="resultado" aria-live="polite"></div>

  <div class="historial">
    <h4>Últimas resoluciones guardadas en la base de datos</h4>
    <div id="calc-historial" class="tabla-contenedor"></div>
  </div>`;

export const AJUSTE = String.raw`
  <h2>Ajuste de curvas</h2>
  <p class="subtitulo">La aplicación clásica: cada punto es una ecuación y cada parámetro, una incógnita</p>

  <div class="grid-ajuste">
    <div class="panel">
      <label>Puntos (una pareja x, y por línea)
        <textarea id="aj-puntos" rows="9" spellcheck="false">0, 1.1
1, 5.9
2, 9.2
3, 10.1
4, 9.0
5, 5.8</textarea>
      </label>
      <div class="controles">
        <label class="crece">Modelo
          <select id="aj-modelo">
            <option value="polinomial">Polinomial</option>
            <option value="exponencial">Exponencial  y = a·e^(b·x)</option>
            <option value="potencia">Potencia  y = a·x^b</option>
            <option value="logaritmico">Logarítmico  y = a + b·ln x</option>
          </select>
        </label>
        <label id="aj-grado-label">Grado <input type="number" id="aj-grado" min="0" max="9" value="2" /></label>
      </div>
      <div class="controles">
        <button class="btn btn-secundario" id="aj-datos-exp">Datos exponenciales</button>
        <button class="btn" id="aj-ajustar">Ajustar</button>
      </div>
      <div id="aj-resumen" class="resumen-ajuste"></div>
    </div>
    <div class="panel">
      <div class="grafica"><canvas id="aj-grafica" aria-label="Gráfica del ajuste"></canvas></div>
      <div class="grafica grafica-baja"><canvas id="aj-residuos" aria-label="Gráfica de residuos"></canvas></div>
    </div>
  </div>
  <div id="aj-detalle" class="resultado"></div>`;

export const GEOMETRIA = String.raw`
  <h2>Geometría de la proyección</h2>
  <p class="subtitulo">Sistema \(3\times2\): el plano es el espacio columna de \(A\); \(A\hat{\mathbf{x}}\) es la sombra de \(\mathbf{b}\)</p>

  <div class="grid-geo">
    <div class="panel">
      <h4>Columnas de \(A\) y vector \(\mathbf{b}\)</h4>
      <div class="geo-entradas" id="geo-entradas"></div>
      <button class="btn btn-secundario btn-pequeno" id="geo-reset">Restablecer</button>
      <ul class="leyenda">
        <li><i style="--c: var(--col-a)"></i> \(\mathbf{a}_1, \mathbf{a}_2\): columnas de \(A\)</li>
        <li><i style="--c: var(--col-b)"></i> \(\mathbf{b}\): lado derecho</li>
        <li><i style="--c: var(--col-p)"></i> \(A\hat{\mathbf{x}}\): proyección</li>
        <li><i style="--c: var(--col-r)"></i> \(\mathbf{r}\): residuo (perpendicular)</li>
      </ul>
      <div id="geo-datos" class="geo-datos"></div>
    </div>
    <div class="lienzo-3d" id="geo-lienzo">
      <p class="lienzo-ayuda">Arrastra para girar · rueda para acercar</p>
    </div>
  </div>`;
