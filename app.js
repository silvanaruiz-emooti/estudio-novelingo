/* >>> Pega aquí la URL de Apps Script (termina en /exec) */
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxby0bC48YQzVViN3x5ZAiRI8MngBuJ7507v-0ld0LmyutGjNQ9oWEO123-okXRz-mJ/exec";

const STORAGE_KEY = "novelingo-encuesta-v1";
const FACE_LABELS = ["Fatal", "Regular", "Bien", "Muy bien", "Super bien"];
const LIKERT_HINT = "1 Totalmente en desacuerdo · 2 En desacuerdo · 3 Neutro · 4 De acuerdo · 5 Totalmente de acuerdo";

const TEEN_ITEMS = [
  "Creo que me gustaría utilizar este videojuego con frecuencia",
  "Encontré el videojuego innecesariamente complejo",
  "Pensé que el videojuego era fácil de usar",
  "Creo que necesitaría el apoyo de un técnico para poder utilizar este videojuego",
  "Encontré que las diversas funciones de este videojuego estaban bien integradas",
  "Pensé que había demasiada inconsistencia en este videojuego",
  "Me imagino que la mayoría de la gente aprendería a utilizar este videojuego muy rápidamente",
  "Encontré el videojuego muy complicado de usar",
  "Me sentí muy seguro usando el videojuego",
  "Necesité aprender muchas cosas antes de empezar con el videojuego",
  "¿Crees que Einan toma mejores decisiones cuando se para a pensar antes de actuar?",
  "¿La historia te ha hecho pensar que parar un momento puede ayudar a decidir mejor?",
  "¿Te has sentido identificado/a con alguna parte de la historia o con lo que le pasa a Einan?",
  "¿Te ha gustado la experiencia?",
  "¿Repetirías?",
  "¿Te han gustado la música y los sonidos?"
];

const CHILD_ITEMS = [
  { key: "nino_divertido", text: "¿Fue divertido el juego?" },
  { key: "nino_entendiste", text: "¿Entendiste por qué el héroe toma sus decisiones?" },
  { key: "nino_facil_pagina", text: "¿Fue fácil pasar de página?" },
  { key: "nino_siguientes", text: "¿Te gustaría jugar los siguientes capítulos?" },
  { key: "nino_einan_pensar", text: "¿Crees que Einan toma mejores decisiones cuando se para a pensar antes de actuar?" },
  { key: "nino_historia_parar", text: "¿La historia te ha hecho pensar que parar un momento puede ayudar a decidir mejor?" },
  { key: "nino_identificado", text: "¿Te has sentido identificado/a con alguna parte de la historia o con lo que le pasa a Einan?" }
];

const PARENT_AFTER = [
  { key: "padre_uso_potencial_tratamiento", text: "¿Cree que una herramienta científicamente validada basada en este videojuego podría ser útil en el tratamiento de su hij@?" },
  { key: "padre_uso_practico_terapia", text: "¿Lo utilizaría en una sesión de terapia?" },
  { key: "padre_adaptacion_perfil", text: "¿Cree que es relevante poder adaptar el videojuego a los diversos perfiles de pacientes con trastornos del neurodesarrollo (TDAH, TEA, etc.)? (Inatento, hiperactivo...)" },
  { key: "padre_ajustes_adaptativos", text: "¿Le gustaría poder modificar las variables según las necesidades de su hij@?" },
  { key: "padre_inmersion_historia", text: "¿Le parece útil que el videojuego contara una historia (guion, trama, personajes...) para facilitar la inmersión?" },
  { key: "padre_reflexionar_detenerse", text: "¿Cree que el juego ha ayudado a su hijo/a a reflexionar sobre la importancia de detenerse antes de actuar?" },
  { key: "padre_magia_descontrolada", text: "¿Considera que elementos narrativos de la historia, como la “magia descontrolada”, han facilitado la comprensión de situaciones relacionadas con las emociones o los impulsos?" },
  { key: "padre_conectado_mensaje", text: "¿Le ha parecido que su hijo/a ha conectado con el mensaje principal de la historia?" },
  { key: "padre_usaria_mas_de_una_vez", text: "¿Utilizaría esta herramienta más de una vez si estuviera disponible?" },
  { key: "padre_recomendaria", text: "¿La recomendaría a otras familias con necesidades similares?" }
];

const HEADERS = [
  "timestamp", "identificador", "inicial_abuelo_materno", "inicial_abuela_materna",
  "dia_cumple_madre", "dia_cumple_padre", "fecha", "edad", "sexo", "bloque_edad",
  "tipo_envio", "epilepsia_fotosensibilidad", "diagnostico_tdah", "diagnostico_tea",
  "diagnostico_aprendizaje", "diestro", "usa_gafas", "problema_vision", "juega_videojuegos",
  "menor_como_te_sientes", "menor_completado", "menor_tiempo",
  ...TEEN_ITEMS.map((_, i) => `teen_${i + 1}`),
  ...CHILD_ITEMS.map((item) => item.key),
  ...PARENT_AFTER.map((item) => item.key),
  "padre_contexto_utilidad"
];

const state = loadState();
let steps = [];
let index = state._index || 0;
let sending = false;

const $app = document.getElementById("app");
const $error = document.getElementById("error");
const $nav = document.getElementById("nav");
const $back = document.getElementById("back");
const $next = document.getElementById("next");
const $progress = document.getElementById("progress");
const $phase = document.getElementById("phase-label");
const $stepLabel = document.getElementById("step-label");
const $bar = document.getElementById("bar");

function todayISO() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function loadState() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) { /* ignore */ }
  return { fecha: todayISO() };
}

function saveState() {
  state._index = index;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function ageBlock() {
  const age = Number(state.edad);
  if (!Number.isFinite(age)) return "";
  return age <= 12 ? "7-12" : "13-17";
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function faceSvg(level) {
  const mouths = [
    "M10 22 Q18 16 26 22",
    "M10 21 H26",
    "M10 21 Q18 24 26 21",
    "M9 20 Q18 28 27 20",
    "M8 19 Q18 30 28 19"
  ];
  return `<svg class="face-svg" viewBox="0 0 36 36" aria-hidden="true">
    <circle class="face-disc" cx="18" cy="18" r="16"/>
    <circle class="face-mark" cx="13" cy="14" r="1.7"/>
    <circle class="face-mark" cx="23" cy="14" r="1.7"/>
    <path class="face-mouth" d="${mouths[level - 1]}" fill="none" stroke-width="2.2" stroke-linecap="round"/>
  </svg>`;
}

function buildSteps() {
  const list = [
    { id: "id", phase: "Identificación", render: renderId, validate: validateId },
    { id: "epi", phase: "Padres · antes", render: renderEpilepsy, validate: validateEpilepsy }
  ];

  if (state.epilepsia_fotosensibilidad === "Sí") {
    list.push({ id: "stop", phase: "Cierre", render: renderStop, validate: () => true, send: true });
    return list;
  }

  list.push(
    { id: "diag", phase: "Padres · antes", render: renderDiagnosis, validate: validateDiagnosis },
    { id: "vision", phase: "Padres · antes", render: renderVision, validate: validateVision },
    { id: "feel", phase: "Menor", render: renderFeel, validate: () => missing("menor_como_te_sientes", "Marca cómo te sientes.") },
    { id: "game", phase: "Menor", render: renderGame, validate: validateGame }
  );

  if (ageBlock() === "7-12") {
    chunk(CHILD_ITEMS, 2).forEach((items, i) => {
      list.push({
        id: `child-${i}`,
        phase: "Menor · 7–12",
        render: () => renderFaceBlock(items),
        validate: () => missing(items.map((item) => item.key), "Responde a todas las caras.")
      });
    });
  } else {
    chunk(TEEN_ITEMS.map((text, i) => ({ key: `teen_${i + 1}`, text })), 4).forEach((items, i) => {
      list.push({
        id: `teen-${i}`,
        phase: "Menor · 13–17",
        render: () => renderLikertBlock(items),
        validate: () => missing(items.map((item) => item.key), "Responde a todas las frases (1 a 5).")
      });
    });
  }

  list.push({
    id: "parent-a",
    phase: "Padres · después",
    render: () => renderLikertBlock(PARENT_AFTER.slice(0, 3)),
    validate: () => missing(PARENT_AFTER.slice(0, 3).map((item) => item.key), "Responde a las tres frases (1 a 5).")
  });
  list.push({
    id: "parent-b",
    phase: "Padres · después",
    render: () => renderLikertBlock(PARENT_AFTER.slice(3, 6)),
    validate: () => missing(PARENT_AFTER.slice(3, 6).map((item) => item.key), "Responde a las tres frases (1 a 5).")
  });
  list.push({
    id: "parent-c",
    phase: "Padres · después",
    render: () => renderLikertBlock(PARENT_AFTER.slice(6, 9)),
    validate: () => missing(PARENT_AFTER.slice(6, 9).map((item) => item.key), "Responde a las tres frases (1 a 5).")
  });
  list.push({
    id: "parent-d",
    phase: "Padres · después",
    render: renderParentEnd,
    validate: validateParentEnd,
    send: true
  });
  return list;
}

function required(key) {
  return state[key] !== undefined && state[key] !== "";
}

function missing(keys, message) {
  const list = Array.isArray(keys) ? keys : [keys];
  return list.every((key) => required(key)) ? "" : message;
}

function showError(msg) {
  $error.hidden = !msg;
  $error.textContent = msg || "";
}

function bindValue(el, key, transform) {
  el.addEventListener("input", () => {
    state[key] = transform ? transform(el.value) : el.value;
    saveState();
  });
}

function radioGroup(name, options, extraClass) {
  const wrap = document.createElement("div");
  wrap.className = extraClass || "choices";
  options.forEach((opt) => {
    const value = String(opt.value);
    const id = `${name}-${value}`.replace(/\s+/g, "");
    const label = document.createElement("label");
    label.className = "choice" + (opt.choiceClass ? ` ${opt.choiceClass}` : "");
    label.innerHTML = `<input type="radio" name="${name}" id="${id}" value="${value}" ${state[name] == value ? "checked" : ""}><span>${opt.html || opt.label}</span>`;
    label.querySelector("input").addEventListener("change", () => {
      state[name] = value;
      saveState();
      if (opt.rerender) paint();
    });
    wrap.appendChild(label);
  });
  return wrap;
}

function question(text, control) {
  const box = document.createElement("div");
  box.className = "q";
  const p = document.createElement("p");
  p.textContent = text;
  box.append(p, control);
  return box;
}

function firstInitial(value) {
  const match = String(value || "").normalize("NFC").match(/[\p{L}]/u);
  return match ? match[0].toUpperCase() : "";
}

function padDay(value) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 31) return "";
  return String(n).padStart(2, "0");
}

function makeIdentificador() {
  const abuelo = firstInitial(state.inicial_abuelo_materno);
  const abuela = firstInitial(state.inicial_abuela_materna);
  const madre = padDay(state.dia_cumple_madre);
  const padre = padDay(state.dia_cumple_padre);
  if (!abuelo || !abuela || !madre || !padre) return "";
  return `${abuelo}${abuela}${madre}${padre}`;
}

function refreshIdPreview() {
  state.identificador = makeIdentificador();
  const el = document.getElementById("id-preview");
  if (!el) return;
  el.textContent = state.identificador || "— — — —";
}

function renderId() {
  $app.innerHTML = `
    <p class="kicker">Estudio Novelingo</p>
    <h1>Encuesta</h1>
    <p class="lede">El identificador se crea solo: inicial del abuelo materno + inicial de la abuela materna + día de cumpleaños de la madre + día de cumpleaños del padre.</p>
    <p class="id-preview" aria-live="polite">Identificador: <strong id="id-preview">${escapeAttr(makeIdentificador() || "— — — —")}</strong></p>
    <div class="grid-2">
      <label class="field">Inicial del nombre del abuelo materno
        <input id="inicial_abuelo_materno" maxlength="8" autocomplete="off" placeholder="solo la primera letra" value="${escapeAttr(state.inicial_abuelo_materno || "")}">
      </label>
      <label class="field">Inicial del nombre de la abuela materna
        <input id="inicial_abuela_materna" maxlength="8" autocomplete="off" placeholder="solo la primera letra" value="${escapeAttr(state.inicial_abuela_materna || "")}">
      </label>
      <label class="field">Día de cumpleaños de la madre
        <input id="dia_cumple_madre" inputmode="numeric" maxlength="2" placeholder="1–31" value="${escapeAttr(state.dia_cumple_madre || "")}">
      </label>
      <label class="field">Día de cumpleaños del padre
        <input id="dia_cumple_padre" inputmode="numeric" maxlength="2" placeholder="1–31" value="${escapeAttr(state.dia_cumple_padre || "")}">
      </label>
    </div>
    <div class="grid-2">
      <label class="field">Fecha
        <input id="fecha" type="date" value="${escapeAttr(state.fecha || todayISO())}">
      </label>
      <label class="field">Edad del menor
        <input id="edad" type="number" min="7" max="17" value="${escapeAttr(state.edad || "")}">
      </label>
    </div>
    <div class="q"><p>Sexo</p></div>
  `;
  ["inicial_abuelo_materno", "inicial_abuela_materna", "dia_cumple_madre", "dia_cumple_padre"].forEach((key) => {
    const el = document.getElementById(key);
    el.addEventListener("input", () => {
      state[key] = el.value;
      refreshIdPreview();
      saveState();
    });
  });
  ["fecha", "edad"].forEach((key) => {
    bindValue(document.getElementById(key), key);
  });
  $app.appendChild(radioGroup("sexo", [
    { value: "Niño", label: "Niño" },
    { value: "Niña", label: "Niña" },
    { value: "Otro", label: "Otro" }
  ]));
}

function validateId() {
  if (!firstInitial(state.inicial_abuelo_materno)) return "Falta la inicial del abuelo materno.";
  if (!firstInitial(state.inicial_abuela_materna)) return "Falta la inicial de la abuela materna.";
  const d1 = Number(state.dia_cumple_madre);
  const d2 = Number(state.dia_cumple_padre);
  if (!Number.isInteger(d1) || d1 < 1 || d1 > 31) return "El día de la madre debe estar entre 1 y 31.";
  if (!Number.isInteger(d2) || d2 < 1 || d2 > 31) return "El día del padre debe estar entre 1 y 31.";
  if (!state.fecha) return "Falta la fecha.";
  const age = Number(state.edad);
  if (!Number.isInteger(age) || age < 7 || age > 17) return "La edad debe estar entre 7 y 17.";
  if (!state.sexo) return "Marca el sexo.";
  return "";
}

function renderEpilepsy() {
  $app.innerHTML = `<p class="kicker">Padres · antes del visionado</p><h2>Salud y participación</h2>`;
  $app.appendChild(question(
    "¿Tiene su hijo epilepsia y/o fotosensibilidad a las imágenes?",
    radioGroup("epilepsia_fotosensibilidad", [
      { value: "Sí", label: "Sí", rerender: true },
      { value: "No", label: "No", rerender: true }
    ])
  ));
  if (state.epilepsia_fotosensibilidad === "Sí") {
    const note = document.createElement("p");
    note.className = "note stop";
    note.textContent = "Si la respuesta es sí, el menor no puede participar. En el siguiente paso se guarda esta exclusión.";
    $app.appendChild(note);
  }
}

function validateEpilepsy() {
  if (!state.epilepsia_fotosensibilidad) return "Marca sí o no.";
  return "";
}

function renderStop() {
  $app.innerHTML = `
    <p class="kicker">Cierre</p>
    <h2>El menor no puede participar</h2>
    <p class="note stop">Por epilepsia y/o fotosensibilidad a las imágenes, esta sesión queda excluida. Pulsa Enviar para guardar la fila en la hoja.</p>
  `;
}

function renderDiagnosis() {
  $app.innerHTML = `<p class="kicker">Padres · antes del visionado</p><h2>Diagnóstico y lateralidad</h2>
    <div class="q"><p>¿Cuál(es) es el diagnóstico(s) de su hijo? (puede marcar más de uno)</p></div>`;
  const checks = document.createElement("div");
  checks.className = "checks";
  [
    ["diagnostico_tdah", "Trastorno por déficit de atención e hiperactividad (TDAH)"],
    ["diagnostico_tea", "Trastorno del espectro autista (TEA)"],
    ["diagnostico_aprendizaje", "Trastorno del aprendizaje (dislexia, discalculia, trastorno del lenguaje, etc.)"]
  ].forEach(([key, label]) => {
    const el = document.createElement("label");
    el.className = "check";
    el.innerHTML = `<input type="checkbox" ${state[key] === "Sí" ? "checked" : ""}><span>${label}</span>`;
    el.querySelector("input").addEventListener("change", (e) => {
      state[key] = e.target.checked ? "Sí" : "No";
      saveState();
    });
    checks.appendChild(el);
  });
  $app.appendChild(checks);
  $app.appendChild(question(
    "¿Es su hijo diestro?",
    radioGroup("diestro", [{ value: "Sí", label: "Sí" }, { value: "No", label: "No" }])
  ));
}

function validateDiagnosis() {
  if (state.diagnostico_tdah !== "Sí" && state.diagnostico_tea !== "Sí" && state.diagnostico_aprendizaje !== "Sí") {
    return "Marca al menos un diagnóstico.";
  }
  if (!state.diestro) return "Indica si es diestro.";
  return "";
}

function renderVision() {
  $app.innerHTML = `<p class="kicker">Padres · antes del visionado</p><h2>Visión y videojuegos</h2>`;
  $app.appendChild(question(
    "¿Usa gafas su hijo?",
    radioGroup("usa_gafas", [
      { value: "Sí", label: "Sí", rerender: true },
      { value: "No", label: "No", rerender: true }
    ])
  ));
  if (state.usa_gafas === "Sí") {
    const lab = document.createElement("label");
    lab.className = "field";
    lab.innerHTML = `¿Cuál es el problema de visión que tiene?<input id="problema_vision" value="${escapeAttr(state.problema_vision || "")}">`;
    $app.appendChild(lab);
    bindValue(lab.querySelector("input"), "problema_vision");
  }
  $app.appendChild(question(
    "¿Sueles jugar a videojuegos?",
    radioGroup("juega_videojuegos", [{ value: "Sí", label: "Sí" }, { value: "No", label: "No" }])
  ));
}

function validateVision() {
  if (!state.usa_gafas) return "Indica si usa gafas.";
  if (state.usa_gafas === "Sí" && !state.problema_vision) return "Describe el problema de visión.";
  if (!state.juega_videojuegos) return "Indica si suele jugar a videojuegos.";
  return "";
}

function renderFeel() {
  $app.innerHTML = `<p class="kicker">Menor</p><h2>¿Cómo te sientes?</h2>`;
  $app.appendChild(faceGroup("menor_como_te_sientes"));
}

function renderGame() {
  $app.innerHTML = `<p class="kicker">Menor</p><h2>El videojuego</h2>`;
  $app.appendChild(question(
    "¿Has completado el videojuego?",
    radioGroup("menor_completado", [{ value: "Sí", label: "Sí" }, { value: "No", label: "No" }])
  ));
  const lab = document.createElement("label");
  lab.className = "field";
  lab.innerHTML = `¿Cuánto has tardado?<input id="menor_tiempo" placeholder="por ejemplo 12 minutos" value="${escapeAttr(state.menor_tiempo || "")}">`;
  $app.appendChild(lab);
  bindValue(lab.querySelector("input"), "menor_tiempo");
}

function validateGame() {
  if (!state.menor_completado) return "Di si has completado el videojuego.";
  if (!state.menor_tiempo) return "Indica cuánto has tardado.";
  return "";
}

function faceGroup(name) {
  return radioGroup(
    name,
    FACE_LABELS.map((label, i) => ({
      value: String(i + 1),
      choiceClass: `face-${i + 1}`,
      html: `${faceSvg(i + 1)}${label}`
    })),
    "faces"
  );
}

function renderFaceBlock(items) {
  $app.innerHTML = `<p class="kicker">Menor · 7–12 años</p><h2>Cuéntanos el juego</h2>`;
  items.forEach((item) => {
    $app.appendChild(question(item.text, faceGroup(item.key)));
  });
}

function renderLikertBlock(items) {
  const kid = items[0] && String(items[0].key).startsWith("teen_");
  $app.innerHTML = `<p class="kicker">${kid ? "Menor · 13–17 años" : "Padres · después del visionado"}</p>
    <h2>${kid ? "Qué te ha parecido" : "Después del visionado"}</h2>
    <p class="likert-legend"><span>1 en desacuerdo</span><span>5 de acuerdo</span></p>
    <p class="help">${LIKERT_HINT}</p>`;
  items.forEach((item) => {
    $app.appendChild(question(item.text, likertGroup(item.key)));
  });
}

function likertGroup(name) {
  return radioGroup(
    name,
    [1, 2, 3, 4, 5].map((n) => ({ value: String(n), html: `<b>${n}</b>` })),
    "likert"
  );
}

function renderParentEnd() {
  $app.innerHTML = `<p class="kicker">Padres · después del visionado</p><h2>Uso y recomendación</h2>`;
  $app.appendChild(question(
    "¿En qué contexto le vería más utilidad?",
    radioGroup("padre_contexto_utilidad", [
      { value: "En casa", label: "En casa" },
      { value: "En terapia", label: "En terapia" },
      { value: "En el colegio", label: "En el colegio" },
      { value: "En varios de ellos", label: "En varios de ellos" }
    ])
  ));
  $app.appendChild(question(
    PARENT_AFTER[9].text,
    likertGroup(PARENT_AFTER[9].key)
  ));
}

function validateParentEnd() {
  if (!required(PARENT_AFTER[9].key)) return "Responde si la recomendaría.";
  if (!state.padre_contexto_utilidad) return "Marca el contexto de utilidad.";
  return "";
}

function escapeAttr(value) {
  return String(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function payload() {
  const row = {};
  HEADERS.forEach((key) => { row[key] = ""; });
  Object.keys(state).forEach((key) => {
    if (key.startsWith("_")) return;
    row[key] = state[key] == null ? "" : String(state[key]);
  });
  row.timestamp = new Date().toISOString();
  row.bloque_edad = ageBlock();
  row.tipo_envio = state.epilepsia_fotosensibilidad === "Sí" ? "exclusion_epilepsia" : "completo";
  ["diagnostico_tdah", "diagnostico_tea", "diagnostico_aprendizaje"].forEach((key) => {
    if (row[key] !== "Sí") row[key] = "No";
  });
  if (state.usa_gafas !== "Sí") row.problema_vision = "";
  row.identificador = makeIdentificador();
  return row;
}

function renderDone(ok, detail) {
  $progress.hidden = true;
  $nav.hidden = true;
  $app.className = "done";
  $app.innerHTML = ok
    ? `<h2>Respuestas enviadas</h2><p>Ya puedes cerrar esta pestaña. En la hoja de Google aparece una fila nueva; descárgala como Excel cuando quieras.</p>`
    : `<h2>No se ha podido enviar</h2><p class="note stop">${detail}</p><p>Las respuestas siguen en esta sesión. Revisa la URL del Apps Script y pulsa Reintentar.</p>
       <div class="nav"><button type="button" class="send" id="retry">Reintentar</button></div>`;
  const retry = document.getElementById("retry");
  if (retry) retry.addEventListener("click", submitCurrent);
  if (ok) sessionStorage.removeItem(STORAGE_KEY);
}

async function submitCurrent() {
  if (sending) return;
  const data = payload();
  if (!SCRIPT_URL) {
    showError("Falta pegar la URL del Apps Script al principio de app.js.");
    return;
  }
  sending = true;
  $next.disabled = true;
  $next.textContent = "Enviando…";
  showError("");
  try {
    await sendPayload(data);
    renderDone(true);
  } catch (err) {
    sending = false;
    $next.disabled = false;
    $next.textContent = "Enviar";
    renderDone(false, "La hoja no ha confirmado el envío. Comprueba que el script esté desplegado para cualquier usuario.");
  }
}

function sendPayload(data) {
  return fetch(SCRIPT_URL, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(data)
  });
}

function paint() {
  steps = buildSteps();
  if (index >= steps.length) index = steps.length - 1;
  if (index < 0) index = 0;
  const step = steps[index];
  $app.className = "";
  showError("");
  $progress.hidden = false;
  $nav.hidden = false;
  $phase.textContent = step.phase;
  $stepLabel.textContent = `${index + 1} / ${steps.length}`;
  $bar.style.width = `${((index + 1) / steps.length) * 100}%`;
  $back.hidden = index === 0;
  $next.className = step.send ? "send" : "next";
  $next.textContent = step.send ? "Enviar" : "Continuar";
  $next.disabled = sending;
  step.render();
  const heading = $app.querySelector("h1, h2");
  if (heading) heading.setAttribute("tabindex", "-1");
  if (heading) heading.focus({ preventScroll: false });
  saveState();
}

$back.addEventListener("click", () => {
  index -= 1;
  paint();
});

function syncInputs() {
  $app.querySelectorAll("input, select").forEach((el) => {
    if (!el.id || el.type === "radio" || el.type === "checkbox") return;
    state[el.id] = el.value;
  });
}

$next.addEventListener("click", () => {
  const step = steps[index];
  syncInputs();
  const msg = step.validate();
  if (msg) {
    showError(msg);
    return;
  }
  saveState();
  if (step.send) {
    submitCurrent();
    return;
  }
  index += 1;
  steps = buildSteps();
  paint();
});

paint();
