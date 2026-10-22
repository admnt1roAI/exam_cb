const TOTAL_PREGUNTAS = 40;
let preguntas = [];

const cuestionario = document.getElementById("cuestionario");
const listaPreguntas = document.getElementById("questions-list");
const estado = document.getElementById("status");
const resultado = document.getElementById("resultado");
const botonEnviar = document.getElementById("guardar");
const botonReiniciar = document.getElementById("reiniciar");
const GOOGLE_SHEETS_URL = "https://script.google.com/macros/s/AKfycbxiG8S7__jkM3NnACNo8_mdTX-3-DPWiNDpHVxIWm5__4z3oebF15Hlp7Qswajnqi63/exec";

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
      const claveOpcion = typeof opcion === "string" ? letra : opcion.key;
      const textoOpcion = typeof opcion === "string" ? opcion : opcion.text;
      const etiqueta = document.createElement("label");
      etiqueta.className = "opt";
      const radio = document.createElement("input");
      radio.type = "radio";
      radio.name = `q${pregunta.id}`;
      radio.value = claveOpcion;
      radio.required = true;
      etiqueta.append(radio, document.createTextNode(` ${letra}) ${textoOpcion}`));
      opciones.append(etiqueta);
    });

    tarjeta.append(titulo, texto, opciones);
    listaPreguntas.append(tarjeta);
  });
  document.getElementById("exam-count").textContent = String(preguntas.length);
}

function letraOpcionVisible(pregunta, key) {
  const index = pregunta?.options.findIndex((option, optionIndex) => {
    const optionKey = typeof option === "string" ? String.fromCharCode(97 + optionIndex) : option.key;
    return optionKey === key;
  }) ?? -1;
  return index >= 0 ? String.fromCharCode(97 + index) : String(key || "");
}

async function cargarExamen() {
  estado.hidden = false;
  estado.classList.remove("status-success");
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
  const preguntaOriginal = preguntas.find((item) => item.id === detalle.id);
  const tarjeta = document.createElement("article");
  tarjeta.className = `answer-card ${detalle.correct ? "is-correct" : "is-incorrect"}`;
  const titulo = document.createElement("h3");
  titulo.textContent = `Pregunta ${detalle.index} · ${detalle.correct ? "Correcta" : "Incorrecta"}`;
  const pregunta = document.createElement("p");
  pregunta.className = "answer-question";
  pregunta.textContent = detalle.question;
  const respuestaElegida = document.createElement("p");
  respuestaElegida.className = `answer-selected ${detalle.correct ? "is-correct" : "is-incorrect"}`;
  respuestaElegida.textContent = `Tu respuesta: ${letraOpcionVisible(preguntaOriginal, detalle.selected).toUpperCase()}) ${detalle.selectedText}`;
  const respuestaCorrecta = document.createElement("p");
  respuestaCorrecta.className = "correct-answer";
  respuestaCorrecta.textContent = `Respuesta correcta: ${letraOpcionVisible(preguntaOriginal, detalle.correctAnswer).toUpperCase()}) ${detalle.correctText}`;
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
  estado.classList.remove("status-success");
  estado.textContent = "Enviando respuestas y calculando puntaje…";
  const nombre = document.getElementById("nombre").value.trim();
  const dni = document.getElementById("dni").value.trim();

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

    const ahora = new Date();
    const pad = (valor) => String(valor).padStart(2, "0");
    const fecha = `${ahora.getFullYear()}-${pad(ahora.getMonth() + 1)}-${pad(ahora.getDate())} ${pad(ahora.getHours())}:${pad(ahora.getMinutes())}:${pad(ahora.getSeconds())}`;
    const registro = {
      fecha,
      nombre,
      dni,
      puntaje: datos.score,
      detalles: datos.details.map((detalle) => ({
        id: detalle.id,
        selected: letraOpcionVisible(preguntas.find((item) => item.id === detalle.id), detalle.selected),
        correct: detalle.correct
      }))
    };

    estado.hidden = false;
    estado.textContent = "Enviando el resultado a Google Sheets…";
    try {
      await fetch(GOOGLE_SHEETS_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=UTF-8" },
        body: JSON.stringify(registro)
      });
      estado.classList.add("status-success");
      estado.textContent = "Resultado enviado a Google Sheets. Confirma que figure en la hoja.";
    } catch (error) {
      estado.textContent = "El examen se calificó, pero no se pudo enviar el resultado a Google Sheets.";
      console.error("Error al enviar el resultado a Google Sheets:", error);
    }
  } catch (error) {
    estado.textContent = error.message;
    botonEnviar.disabled = false;
  }
});

botonReiniciar.addEventListener("click", cargarExamen);
cargarExamen();
