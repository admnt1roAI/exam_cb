const config = window.EXAM_CONFIG;
const loginPanel = document.getElementById("login-panel");
const adminPanel = document.getElementById("admin-panel");
const loginForm = document.getElementById("login-form");
const loginMessage = document.getElementById("login-message");
const adminMessage = document.getElementById("admin-message");
const questionForm = document.getElementById("question-form");
const questionList = document.getElementById("question-list");
const saveButton = document.getElementById("save-question");
const cancelEditButton = document.getElementById("cancel-edit");
let questions = [];
let supabaseClient;

function showMessage(element, message, success = false) {
  element.textContent = message;
  element.classList.toggle("success", success);
  element.hidden = false;
}

function getQuestionFormData() {
  return {
    question: document.getElementById("question-text").value.trim(),
    options: ["a", "b", "c", "d", "e"].map((letter) =>
      document.getElementById(`option-${letter}`).value.trim()
    ),
    answer: document.getElementById("correct-answer").value,
    explanation: document.getElementById("explanation").value.trim()
  };
}

function clearQuestionForm() {
  questionForm.reset();
  document.getElementById("question-id").value = "";
  document.getElementById("editor-title").textContent = "Agregar pregunta";
  saveButton.textContent = "Guardar pregunta";
  cancelEditButton.hidden = true;
}

async function verifyAdmin() {
  const { data, error } = await supabaseClient.rpc("is_exam_admin");
  if (error) throw error;
  if (data !== true) throw new Error("Esta cuenta no está autorizada como administradora.");
}

async function enterAdmin(session) {
  try {
    await verifyAdmin();
    loginPanel.hidden = true;
    adminPanel.hidden = false;
    document.getElementById("admin-email").textContent = session.user.email || "Cuenta autorizada";
    await loadQuestions();
  } catch (error) {
    await supabaseClient.auth.signOut();
    loginPanel.hidden = false;
    adminPanel.hidden = true;
    showMessage(loginMessage, error.message || "No se pudo validar el acceso de administrador.");
  }
}

async function loadQuestions() {
  showMessage(adminMessage, "Cargando banco de preguntas…");
  const { data, error } = await supabaseClient
    .from("exam_questions")
    .select("id,question,options,answer,explanation")
    .order("id", { ascending: true });
  if (error) {
    showMessage(adminMessage, `No se pudo cargar el banco: ${error.message}`);
    return;
  }
  questions = data || [];
  document.getElementById("question-count").textContent = String(questions.length);
  renderQuestions();
  adminMessage.hidden = true;
}

function renderQuestions() {
  const search = document.getElementById("search-questions").value.trim().toLocaleLowerCase("es");
  const filtered = questions.filter((item) =>
    `${item.id} ${item.question}`.toLocaleLowerCase("es").includes(search)
  );
  questionList.replaceChildren();
  if (!filtered.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = search ? "No hay preguntas que coincidan." : "Todavía no hay preguntas.";
    questionList.append(empty);
    return;
  }

  for (const item of filtered) {
    const card = document.createElement("article");
    card.className = "question-item";
    const title = document.createElement("h3");
    title.textContent = `ID ${item.id} · ${item.question}`;
    const options = document.createElement("ol");
    options.type = "a";
    item.options.forEach((option, index) => {
      const li = document.createElement("li");
      li.textContent = option;
      if (String.fromCharCode(97 + index) === item.answer) li.className = "correct-option";
      options.append(li);
    });
    const explanation = document.createElement("p");
    explanation.textContent = `Explicación: ${item.explanation || "Sin explicación"}`;
    const actions = document.createElement("div");
    actions.className = "item-actions";
    const edit = document.createElement("button");
    edit.type = "button";
    edit.textContent = "Editar";
    edit.dataset.action = "edit";
    edit.dataset.id = String(item.id);
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "delete-button";
    remove.textContent = "Eliminar";
    remove.dataset.action = "delete";
    remove.dataset.id = String(item.id);
    actions.append(edit, remove);
    card.append(title, options, explanation, actions);
    questionList.append(card);
  }
}

function beginEdit(id) {
  const item = questions.find((question) => question.id === id);
  if (!item) return;
  document.getElementById("question-id").value = String(item.id);
  document.getElementById("question-text").value = item.question;
  ["a", "b", "c", "d", "e"].forEach((letter, index) => {
    document.getElementById(`option-${letter}`).value = item.options[index] || "";
  });
  document.getElementById("correct-answer").value = item.answer;
  document.getElementById("explanation").value = item.explanation || "";
  document.getElementById("editor-title").textContent = `Editar pregunta ID ${item.id}`;
  saveButton.textContent = "Guardar cambios";
  cancelEditButton.hidden = false;
  document.getElementById("question-text").focus();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

if (!config?.supabaseUrl || !config?.supabaseKey || !window.supabase?.createClient) {
  showMessage(loginMessage, "Falta la configuración de Supabase o no se pudo cargar su biblioteca.");
} else {
  supabaseClient = window.supabase.createClient(config.supabaseUrl, config.supabaseKey);

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = document.getElementById("login-button");
    button.disabled = true;
    loginMessage.hidden = true;
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    button.disabled = false;
    if (error) {
      showMessage(loginMessage, "No se pudo iniciar sesión. Revisa el correo y la contraseña.");
      return;
    }
    await enterAdmin(data.session);
  });

  document.getElementById("logout-button").addEventListener("click", async () => {
    await supabaseClient.auth.signOut();
    adminPanel.hidden = true;
    loginPanel.hidden = false;
    loginForm.reset();
    showMessage(loginMessage, "Sesión cerrada.", true);
  });

  questionForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = getQuestionFormData();
    if (payload.options.some((option) => !option)) {
      showMessage(adminMessage, "Completa las cinco alternativas antes de guardar.");
      return;
    }
    saveButton.disabled = true;
    adminMessage.hidden = true;
    const id = document.getElementById("question-id").value;
    const query = id
      ? supabaseClient.from("exam_questions").update(payload).eq("id", Number(id))
      : supabaseClient.from("exam_questions").insert(payload);
    const { error } = await query;
    saveButton.disabled = false;
    if (error) {
      showMessage(adminMessage, `No se pudo guardar: ${error.message}`);
      return;
    }
    clearQuestionForm();
    await loadQuestions();
    showMessage(adminMessage, id ? "Pregunta actualizada. Aparecerá en los próximos exámenes." : "Pregunta agregada. Aparecerá en los próximos exámenes.", true);
  });

  cancelEditButton.addEventListener("click", clearQuestionForm);
  document.getElementById("search-questions").addEventListener("input", renderQuestions);

  questionList.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const id = Number(button.dataset.id);
    if (button.dataset.action === "edit") {
      beginEdit(id);
      return;
    }
    const question = questions.find((item) => item.id === id);
    if (!question || !window.confirm(`¿Eliminar la pregunta ID ${id}? Dejará de aparecer en los próximos exámenes.`)) return;
    button.disabled = true;
    const { error } = await supabaseClient.from("exam_questions").delete().eq("id", id);
    if (error) {
      button.disabled = false;
      showMessage(adminMessage, `No se pudo eliminar: ${error.message}`);
      return;
    }
    await loadQuestions();
    showMessage(adminMessage, `Pregunta ID ${id} eliminada.`, true);
  });

  supabaseClient.auth.getSession().then(({ data, error }) => {
    if (error) showMessage(loginMessage, "No se pudo recuperar la sesión. Inicia sesión nuevamente.");
    else if (data.session) enterAdmin(data.session);
  });
}
