const TOTAL_PREGUNTAS = 40;
let preguntas = [];

const cuestionario = document.getElementById("cuestionario");
const listaPreguntas = document.getElementById("questions-list");
const estado = document.getElementById("status");
const resultado = document.getElementById("resultado");
const botonEnviar = document.getElementById("guardar");
const botonReiniciar = document.getElementById("reiniciar");

function apiUrl() {
  const base = window.EXAM_CONFIG?.supabaseUrl?.trim();
  if (!base || base.includes("TU-PROYECTO") || !window.EXAM_CONFIG?.supabaseKey) {
    throw new Error("Falta configurar la URL y la clave pública de Supabase en config.js.");
  }
  return `${base.replace(/\/$/, "")}/functions/v1/exam`;
}

async function llamarFuncion(opciones = {}) {
  const respuesta = await fetch(apiUrl(), {
    ...opciones,
    headers: {
      "Content-Type": "application/json",
      apikey: window.EXAM_CONFIG.supabaseKey,
      Authorization: `Bearer ${window.EXAM_CONFIG.supabaseKey}`,
      ...(opciones.headers || {})
    }
  });
  const cuerpo = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) throw new Error(cuerpo.error || "No se pudo contactar con Supabase.");
  return cuerpo;
}

function mostrarPreguntas() {
  listaPreguntas.replaceChildren();
  preguntas.forEach((pregunta, indice) => {
    const tarjeta = document.createElement("article");
    tarjeta.className = "q-card";
    const titulo = document.createElement("h2");
    titulo.className = "q-title";
    titulo.textContent = `Pregunta ${indice + 1}`;
    const texto = document.createElement("p");
    texto.className = "question-text";
    texto.textContent = pregunta.question;
    const opciones = document.createElement("div");
    opciones.className = "options";

    pregunta.options.forEach((opcion, opcionIndice) => {
      const letra = String.fromCharCode(97 + opcionIndice);
      const etiqueta = document.createElement("label");
      etiqueta.className = "opt";
      const radio = document.createElement("input");
      radio.type = "radio";
      radio.name = `q${pregunta.id}`;
      radio.value = letra;
      radio.required = true;
      etiqueta.append(radio, document.createTextNode(` ${letra}) ${opcion}`));
      opciones.append(etiqueta);
    });

    tarjeta.append(titulo, texto, opciones);
    listaPreguntas.append(tarjeta);
  });
  document.getElementById("exam-count").textContent = String(preguntas.length);
}

async function cargarExamen() {
  estado.hidden = false;
  estado.textContent = "Cargando preguntas…";
  cuestionario.hidden = true;
  resultado.hidden = true;
  botonReiniciar.hidden = true;
  try {
    const datos = await llamarFuncion({ method: "GET", cache: "no-store" });
    preguntas = datos.questions || [];
    if (!preguntas.length) throw new Error("Supabase no devolvió preguntas. Revisa la importación del balotario.");
    mostrarPreguntas();
    estado.hidden = true;
    cuestionario.hidden = false;
    botonEnviar.disabled = false;
  } catch (error) {
    estado.textContent = error.message;
    botonReiniciar.hidden = false;
  }
}

function crearDetalle(detalle) {
  const tarjeta = document.createElement("article");
  tarjeta.className = `answer-card ${detalle.correct ? "is-correct" : "is-incorrect"}`;
  const titulo = document.createElement("h3");
  titulo.textContent = `Pregunta ${detalle.index} · ${detalle.correct ? "Correcta" : "Incorrecta"}`;
  const pregunta = document.createElement("p");
  pregunta.className = "answer-question";
  pregunta.textContent = detalle.question;
  const respuestaElegida = document.createElement("p");
  respuestaElegida.className = `answer-selected ${detalle.correct ? "is-correct" : "is-incorrect"}`;
  respuestaElegida.textContent = `Tu respuesta: ${detalle.selected.toUpperCase()}) ${detalle.selectedText}`;
  const respuestaCorrecta = document.createElement("p");
  respuestaCorrecta.className = "correct-answer";
  respuestaCorrecta.textContent = `Respuesta correcta: ${detalle.correctAnswer.toUpperCase()}) ${detalle.correctText}`;
  const explicacion = document.createElement("p");
  explicacion.className = "answer-explanation";
  explicacion.textContent = `Explicación: ${detalle.explanation}`;
  tarjeta.append(titulo, pregunta, respuestaElegida, respuestaCorrecta, explicacion);
  return tarjeta;
}

cuestionario.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  if (!cuestionario.reportValidity()) return;
  botonEnviar.disabled = true;
  estado.hidden = false;
  estado.textContent = "Enviando respuestas y calculando puntaje…";

  const answers = preguntas.map((pregunta) => ({
    id: pregunta.id,
    answer: cuestionario.querySelector(`input[name="q${pregunta.id}"]:checked`).value
  }));

  try {
    const datos = await llamarFuncion({ method: "POST", body: JSON.stringify({ answers }) });
    estado.hidden = true;
    cuestionario.hidden = true;
    resultado.replaceChildren();
    const resumen = document.createElement("h2");
    resumen.textContent = `Tu puntaje: ${datos.score} / ${datos.total}`;
    resultado.append(resumen, ...datos.details.map(crearDetalle));
    resultado.hidden = false;
    botonReiniciar.hidden = false;
  } catch (error) {
    estado.textContent = error.message;
    botonEnviar.disabled = false;
  }
});

botonReiniciar.addEventListener("click", cargarExamen);
cargarExamen();
