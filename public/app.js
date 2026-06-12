const state = {
  breeds: [],
  session: null,
  dog: null,
  walker: null,
  appointments: [],
  matches: [],
  activeAuth: "login",
  activeOwnerTab: "profile",
  activeWalkerTab: "profile",
  activeBreedInput: null,
  landingBreedIndex: 0,
  landingBreedTimer: null,
  calendarDate: new Date()
};

const selectors = {
  landingScreen: document.querySelector("#landing-screen"),
  schnauzerImage: document.querySelector("#schnauzer-image"),
  schnauzerName: document.querySelector("#schnauzer-name"),
  schnauzerTemperament: document.querySelector("#schnauzer-temperament"),
  schnauzerDescription: document.querySelector("#schnauzer-description"),
  authScreen: document.querySelector("#auth-screen"),
  dashboard: document.querySelector("#dashboard"),
  openAuthButtons: document.querySelectorAll("[data-open-auth]"),
  themeToggleButtons: document.querySelectorAll("[data-theme-toggle]"),
  backHomeButton: document.querySelector("#back-home-button"),
  authTabs: document.querySelectorAll("[data-auth-tab]"),
  authPanels: document.querySelectorAll("[data-auth-panel]"),
  loginForm: document.querySelector("#login-form"),
  ownerRegisterForm: document.querySelector("#owner-register-form"),
  walkerRegisterForm: document.querySelector("#walker-register-form"),
  ownerDashboard: document.querySelector("#owner-dashboard"),
  walkerDashboard: document.querySelector("#walker-dashboard"),
  sessionRole: document.querySelector("#session-role"),
  sessionTitle: document.querySelector("#session-title"),
  logoutButton: document.querySelector("#logout-button"),
  breedSearches: document.querySelectorAll(".breed-search"),
  ownerTabs: document.querySelectorAll("[data-owner-tab]"),
  ownerPanels: document.querySelectorAll("[data-owner-panel]"),
  walkerTabs: document.querySelectorAll("[data-walker-tab]"),
  walkerPanels: document.querySelectorAll("[data-walker-panel]"),
  ownerDogForm: document.querySelector("#owner-dog-form"),
  walkerProfileForm: document.querySelector("#walker-profile-form"),
  ownerMatches: document.querySelector("#owner-matches"),
  refreshMatches: document.querySelector("#refresh-matches"),
  ownerAppointments: document.querySelector("#owner-appointments"),
  walkerAppointments: document.querySelector("#walker-appointments"),
  calendarTitle: document.querySelector("#calendar-title"),
  calendarGrid: document.querySelector("#calendar-grid"),
  prevMonth: document.querySelector("#prev-month"),
  nextMonth: document.querySelector("#next-month"),
  toast: document.querySelector("#toast")
};

const fallbackBreeds = [
  { id: "10", name: "American Bulldog", temperament: "Fuerte, leal y activo", breed_group: "Working", image: "https://cdn2.thedogapi.com/images/pk1AAdloG.jpg" },
  { id: "18", name: "Australian Shepherd", temperament: "Inteligente, activo y protector", breed_group: "Herding", image: "https://cdn2.thedogapi.com/images/B1-llgq4m.jpg" },
  { id: "33", name: "Beagle", temperament: "Alegre, curioso y energético", breed_group: "Hound", image: "https://cdn2.thedogapi.com/images/Syd4xxqEm.jpg" },
  { id: "58", name: "Chihuahua", temperament: "Vivaz, alerta y valiente", breed_group: "Toy", image: "https://cdn2.thedogapi.com/images/B1pDZx9Nm.jpg" },
  { id: "121", name: "Golden Retriever", temperament: "Amigable, confiable y activo", breed_group: "Sporting", image: "https://cdn2.thedogapi.com/images/HJ7Pzg5EQ.jpg" },
  { id: "149", name: "Labrador Retriever", temperament: "Amable, extrovertido y energético", breed_group: "Sporting", image: "https://cdn2.thedogapi.com/images/B1uW7l5VX.jpg" },
  { id: "schnauzer", name: "Standard Schnauzer", temperament: "Alerta, obediente y enérgico", breed_group: "Terrier", image: "https://cdn2.thedogapi.com/images/S1B2gx5Nm.jpg" },
  { id: "giant-schnauzer", name: "Giant Schnauzer", temperament: "Leal, poderoso y protector", breed_group: "Working", image: "https://cdn2.thedogapi.com/images/H1NIzlcVQ.jpg" },
  { id: "miniature-schnauzer", name: "Miniature Schnauzer", temperament: "Amigable, alerta y entrenable", breed_group: "Terrier", image: "https://cdn2.thedogapi.com/images/SJIUQl9NX.jpg" },
  { id: "235", name: "Siberian Husky", temperament: "Amigable, travieso y muy activo", breed_group: "Working", image: "https://cdn2.thedogapi.com/images/S17ZilqNm.jpg" }
];

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || "Ocurrió un error.");
  }

  return payload;
}

function showToast(message) {
  selectors.toast.textContent = message;
  selectors.toast.classList.add("show");
  window.setTimeout(() => selectors.toast.classList.remove("show"), 3200);
}

function applyTheme(theme) {
  const isLight = theme === "light";
  document.body.classList.toggle("light-mode", isLight);
  selectors.themeToggleButtons.forEach((button) => {
    button.setAttribute("aria-label", isLight ? "Cambiar a modo oscuro" : "Cambiar a modo claro");
  });
  localStorage.setItem("paseoFelizTheme", isLight ? "light" : "dark");
}

function toggleTheme() {
  applyTheme(document.body.classList.contains("light-mode") ? "dark" : "light");
}

function getFormPayload(form) {
  const payload = Object.fromEntries(new FormData(form).entries());

  form.querySelectorAll("input[type='checkbox']").forEach((checkbox) => {
    payload[checkbox.name] = checkbox.checked;
  });

  return payload;
}

function mergeFallbackBreeds(breeds) {
  const map = new Map();

  [...breeds, ...fallbackBreeds].forEach((breed) => {
    map.set(String(breed.name).toLowerCase(), breed);
  });

  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function getBreed(id) {
  return state.breeds.find((breed) => String(breed.id) === String(id));
}

function breedName(id) {
  return getBreed(id)?.name || `Raza ${id || "N/D"}`;
}

function findBreedByText(value) {
  const text = String(value || "").trim().toLowerCase();

  return state.breeds.find((breed) => breed.name.toLowerCase() === text)
    || state.breeds.find((breed) => breed.name.toLowerCase().startsWith(text))
    || state.breeds.find((breed) => breed.name.toLowerCase().includes(text));
}

function renderBreedPreview(input, breedId) {
  const preview = input.closest("label")?.nextElementSibling;
  const breed = getBreed(breedId);

  if (!preview?.classList.contains("breed-preview")) {
    return;
  }

  if (!breed) {
    preview.innerHTML = `<p class="empty-state">Selecciona una raza.</p>`;
    return;
  }

  preview.innerHTML = `
    <img src="${escapeHtml(breed.image)}" alt="${escapeHtml(breed.name)}" loading="lazy">
    <div>
      <strong>${escapeHtml(breed.name)}</strong>
      <span>${escapeHtml(breed.temperament || breed.breed_group || "Raza disponible")}</span>
    </div>
  `;
}

function setBreedFromInput(input) {
  const breed = findBreedByText(input.value);
  const hiddenInput = document.querySelector(`#${input.dataset.breedTarget}`);

  if (hiddenInput) {
    hiddenInput.value = breed?.id || "";
  }

  renderBreedPreview(input, breed?.id);
}

function getBreedMenu(input) {
  let menu = input.parentElement.querySelector(".breed-menu");

  if (!menu) {
    menu = document.createElement("div");
    menu.className = "breed-menu";
    input.parentElement.appendChild(menu);
  }

  return menu;
}

function closeBreedMenus() {
  document.querySelectorAll(".breed-menu.open").forEach((menu) => menu.classList.remove("open"));
}

function openBreedMenu(input, showAll = false) {
  const text = input.value.trim().toLowerCase();
  const breeds = (showAll || !text
    ? state.breeds
    : state.breeds.filter((breed) => breed.name.toLowerCase().includes(text))
  ).slice(0, 16);
  const menu = getBreedMenu(input);

  state.activeBreedInput = input;
  closeBreedMenus();

  menu.innerHTML = breeds.length
    ? breeds.map((breed) => `
      <button class="breed-menu-option" type="button" data-breed-id="${escapeHtml(breed.id)}">
        <img src="${escapeHtml(breed.image)}" alt="" loading="lazy">
        <span>
          <strong>${escapeHtml(breed.name)}</strong>
          <small>${escapeHtml(breed.temperament || breed.breed_group || "Raza disponible")}</small>
        </span>
      </button>
    `).join("")
    : `<button class="breed-menu-empty" type="button" disabled>No hay razas con ese texto</button>`;

  menu.classList.add("open");
}

function selectBreed(input, breedId) {
  const breed = getBreed(breedId);

  if (!breed) {
    return;
  }

  input.value = breed.name;
  setBreedFromInput(input);
  closeBreedMenus();
}

function setBreedInput(input, breedId) {
  const breed = getBreed(breedId);

  if (!breed) {
    return;
  }

  input.value = breed.name;
  setBreedFromInput(input);
}

function setDefaultBreeds() {
  const first = state.breeds[0];

  if (!first) {
    return;
  }

  selectors.breedSearches.forEach((input) => {
    if (!input.value) {
      setBreedInput(input, first.id);
    }
  });
}

function landingBreeds() {
  const breedsWithImages = state.breeds.filter((breed) => breed.image);
  return breedsWithImages.length ? breedsWithImages : fallbackBreeds.filter((breed) => breed.image);
}

function renderLandingDog(step = 0) {
  const breeds = landingBreeds();

  if (!breeds.length) {
    return;
  }

  state.landingBreedIndex = (state.landingBreedIndex + step + breeds.length) % breeds.length;
  const breed = breeds[state.landingBreedIndex];

  selectors.schnauzerImage.onerror = () => {
    const fallback = fallbackBreeds.find((item) => item.image && item.image !== selectors.schnauzerImage.src);

    if (fallback) {
      selectors.schnauzerImage.onerror = null;
      selectors.schnauzerImage.src = fallback.image;
    }
  };
  selectors.schnauzerImage.src = breed.image;
  selectors.schnauzerImage.alt = `${breed.name} desde TheDogAPI`;
  selectors.schnauzerName.textContent = breed.name;
  selectors.schnauzerTemperament.textContent = breed.temperament || breed.breed_group || "Raza disponible";
  selectors.schnauzerDescription.textContent = `${breed.name} es un ejemplo de cómo la raza y el temperamento ayudan a elegir un paseador compatible.`;
}

function startLandingBreedRotation() {
  if (state.landingBreedTimer) {
    window.clearInterval(state.landingBreedTimer);
  }

  state.landingBreedTimer = window.setInterval(() => {
    renderLandingDog(1);
  }, 2 * 60 * 1000);
}

function setAuthTab(tab) {
  state.activeAuth = tab;
  selectors.authTabs.forEach((button) => button.classList.toggle("active", button.dataset.authTab === tab));
  selectors.authPanels.forEach((panel) => panel.classList.toggle("active", panel.dataset.authPanel === tab));
}

function setOwnerTab(tab) {
  state.activeOwnerTab = tab;
  selectors.ownerTabs.forEach((button) => button.classList.toggle("active", button.dataset.ownerTab === tab));
  selectors.ownerPanels.forEach((panel) => panel.classList.toggle("active", panel.dataset.ownerPanel === tab));
}

function setWalkerTab(tab) {
  state.activeWalkerTab = tab;
  selectors.walkerTabs.forEach((button) => button.classList.toggle("active", button.dataset.walkerTab === tab));
  selectors.walkerPanels.forEach((panel) => panel.classList.toggle("active", panel.dataset.walkerPanel === tab));
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function canOwnerCancel(appointment) {
  return new Date(appointment.Fecha_Hora).getTime() - Date.now() >= 24 * 60 * 60 * 1000;
}

function saveSession(payload) {
  state.session = payload.user;
  state.dog = payload.dog;
  state.walker = payload.walker;
  state.appointments = payload.appointments || [];
  localStorage.setItem("paseoPerrosUserId", String(payload.user.id));
}

async function refreshMe() {
  if (!state.session?.id) {
    return;
  }

  const payload = await api(`/api/me?userId=${state.session.id}`);
  saveSession(payload);
  renderDashboard();
}

function showAuth() {
  selectors.landingScreen.classList.add("hidden");
  selectors.authScreen.classList.remove("hidden");
  selectors.dashboard.classList.add("hidden");
}

function showLanding() {
  selectors.landingScreen.classList.remove("hidden");
  selectors.authScreen.classList.add("hidden");
  selectors.dashboard.classList.add("hidden");
}

function showDashboard() {
  selectors.landingScreen.classList.add("hidden");
  selectors.authScreen.classList.add("hidden");
  selectors.dashboard.classList.remove("hidden");
  selectors.ownerDashboard.classList.toggle("hidden", state.session.role !== "owner");
  selectors.walkerDashboard.classList.toggle("hidden", state.session.role !== "walker");
}

function fillDogForm() {
  if (!state.dog) {
    return;
  }

  const form = selectors.ownerDogForm;
  form.Nombre.value = state.dog.Nombre || "";
  form.Edad.value = state.dog.Edad ?? "";
  form.Tamano.value = state.dog.Tamano || "Mediano";
  form.Nivel_Energia.value = state.dog.Nivel_Energia || "Medio";
  form.NombreDueno.value = state.dog.NombreDueno || "";
  form.TelefonoDueno.value = state.dog.TelefonoDueno || "";
  form.Direccion.value = state.dog.Direccion || "";
  setBreedInput(form.querySelector(".breed-search"), state.dog.Raza_API_ID);
}

function fillWalkerForm() {
  if (!state.walker) {
    return;
  }

  const form = selectors.walkerProfileForm;
  form.Nombre.value = state.walker.Nombre || "";
  form.Telefono.value = state.walker.Telefono || "";
  form.Capacidad_Tamano.value = state.walker.Capacidad_Tamano || "Mediano";
  form.Tarifa.value = state.walker.Tarifa ?? "";
  form.AceptaHiperactivos.checked = Boolean(state.walker.AceptaHiperactivos);
  form.Direccion.value = state.walker.Direccion || "";
  setBreedInput(form.querySelector(".breed-search"), state.walker.Especialidad_Raza_API_ID);
}

function renderDashboardHeader() {
  const roleText = state.session.role === "owner" ? "Dueño de perro" : "Paseador";
  selectors.sessionRole.textContent = roleText;
  selectors.sessionTitle.textContent = `Hola, ${state.session.name}`;
}

function renderMatches() {
  if (!state.matches.length) {
    selectors.ownerMatches.innerHTML = `<p class="empty-state">Aún no hay paseadores compatibles. Registra un paseador con características cercanas al perro.</p>`;
    return;
  }

  selectors.ownerMatches.innerHTML = state.matches.map((walker) => `
    <article class="data-card match-card">
      <header>
        <strong>#${walker.Id} ${escapeHtml(walker.Nombre)}</strong>
        <span class="pill">${walker.Compatibilidad}% match</span>
      </header>
      <p><b>Especialidad:</b> ${escapeHtml(breedName(walker.Especialidad_Raza_API_ID))}</p>
      <p><b>Tamaño:</b> ${escapeHtml(walker.Capacidad_Tamano)} · <b>Tarifa:</b> $${Number(walker.Tarifa || 0).toFixed(2)}</p>
      <p><b>Teléfono:</b> ${escapeHtml(walker.Telefono || "Sin teléfono")}</p>
      <ul class="reasons">${walker.Razones.map((reason) => `<li>${escapeHtml(reason)}</li>`).join("")}</ul>
      <form class="inline-appointment-form" data-walker-id="${walker.Id}">
        <label>
          Fecha y hora
          <input name="Fecha_Hora" type="datetime-local" required>
        </label>
        <button class="button primary" type="submit">Agendar</button>
      </form>
    </article>
  `).join("");
}

async function loadMatches() {
  if (!state.dog) {
    return;
  }

  state.matches = await api(`/api/walkers/matches/${state.dog.ID}`);
  renderMatches();
}

function renderOwnerAppointments() {
  selectors.ownerAppointments.innerHTML = state.appointments.length
    ? state.appointments.map((appointment) => `
      <article class="data-card">
        <header>
          <strong>Cita #${appointment.ID_Cita}</strong>
          <span class="pill ${appointment.Estatus === "Cancelado" ? "amber" : ""}">${escapeHtml(appointment.Estatus)}</span>
        </header>
        <p><b>Paseador:</b> #${appointment.Id_Paseador} ${escapeHtml(appointment.NombrePaseador)}</p>
        <p><b>Fecha:</b> ${formatDateTime(appointment.Fecha_Hora)}</p>
        <button class="button secondary" data-owner-cancel="${appointment.ID_Cita}" ${canOwnerCancel(appointment) && appointment.Estatus !== "Cancelado" ? "" : "disabled"}>
          Cancelar cita
        </button>
        ${canOwnerCancel(appointment) ? "" : `<p class="help-text">La cita ya no se puede cancelar porque faltan menos de 24 horas.</p>`}
      </article>
    `).join("")
    : `<p class="empty-state">No tienes citas agendadas.</p>`;
}

function renderWalkerAppointments() {
  selectors.walkerAppointments.innerHTML = state.appointments.length
    ? state.appointments.map((appointment) => `
      <article class="data-card">
        <header>
          <strong>Cita #${appointment.ID_Cita}</strong>
          <span class="pill ${appointment.Estatus === "Cancelado" ? "amber" : ""}">${escapeHtml(appointment.Estatus)}</span>
        </header>
        <p><b>Perro:</b> #${appointment.Id_Perro} ${escapeHtml(appointment.NombrePerro)}</p>
        <p><b>Fecha:</b> ${formatDateTime(appointment.Fecha_Hora)}</p>
        <label>
          Cambiar estatus
          <select data-walker-status="${appointment.ID_Cita}">
            <option value="Aceptado" ${appointment.Estatus === "Aceptado" ? "selected" : ""}>Aceptado</option>
            <option value="En proceso" ${appointment.Estatus === "En proceso" ? "selected" : ""}>En proceso</option>
            <option value="Cancelado" ${appointment.Estatus === "Cancelado" ? "selected" : ""}>Cancelado</option>
          </select>
        </label>
      </article>
    `).join("")
    : `<p class="empty-state">Aún no tienes citas asignadas.</p>`;
}

function appointmentsByDay(date) {
  return state.appointments.filter((appointment) => {
    const appointmentDate = new Date(appointment.Fecha_Hora);
    return appointmentDate.getFullYear() === date.getFullYear()
      && appointmentDate.getMonth() === date.getMonth()
      && appointmentDate.getDate() === date.getDate();
  });
}

function renderCalendar() {
  const year = state.calendarDate.getFullYear();
  const month = state.calendarDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const start = new Date(year, month, 1 - firstDay.getDay());

  selectors.calendarTitle.textContent = new Intl.DateTimeFormat("es-MX", {
    month: "long",
    year: "numeric"
  }).format(firstDay);

  const days = Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });

  selectors.calendarGrid.innerHTML = days.map((day) => {
    const events = appointmentsByDay(day);
    const outside = day.getMonth() !== month ? "outside" : "";

    return `
      <div class="calendar-day ${outside}">
        <strong>${day.getDate()}</strong>
        ${events.map((appointment) => `
          <div class="calendar-event">
            ${escapeHtml(appointment.NombrePerro)}<br>
            ${new Intl.DateTimeFormat("es-MX", { timeStyle: "short" }).format(new Date(appointment.Fecha_Hora))}
          </div>
        `).join("")}
      </div>
    `;
  }).join("");
}

async function renderDashboard() {
  showDashboard();
  renderDashboardHeader();

  if (state.session.role === "owner") {
    fillDogForm();
    renderOwnerAppointments();
    await loadMatches();
  } else {
    fillWalkerForm();
    renderWalkerAppointments();
    renderCalendar();
  }
}

function requireValidBreed(form) {
  const input = form.querySelector(".breed-search");
  const hidden = input ? document.querySelector(`#${input.dataset.breedTarget}`) : null;

  if (!input || !hidden) {
    return true;
  }

  setBreedFromInput(input);

  if (!hidden.value) {
    showToast("Elige una raza válida desde el menú.");
    return false;
  }

  return true;
}

async function submitOwnerRegister(event) {
  event.preventDefault();

  if (!requireValidBreed(selectors.ownerRegisterForm)) {
    return;
  }

  try {
    const payload = await api("/api/auth/register-owner", {
      method: "POST",
      body: JSON.stringify(getFormPayload(selectors.ownerRegisterForm))
    });
    saveSession(payload);
    await renderDashboard();
    showToast("Cuenta de dueño creada.");
  } catch (error) {
    showToast(error.message);
  }
}

async function submitWalkerRegister(event) {
  event.preventDefault();

  if (!requireValidBreed(selectors.walkerRegisterForm)) {
    return;
  }

  try {
    const payload = await api("/api/auth/register-walker", {
      method: "POST",
      body: JSON.stringify(getFormPayload(selectors.walkerRegisterForm))
    });
    saveSession(payload);
    await renderDashboard();
    showToast("Cuenta de paseador creada.");
  } catch (error) {
    showToast(error.message);
  }
}

async function submitLogin(event) {
  event.preventDefault();

  try {
    const payload = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(getFormPayload(selectors.loginForm))
    });
    saveSession(payload);
    await renderDashboard();
    showToast("Sesión iniciada.");
  } catch (error) {
    showToast(error.message);
  }
}

async function submitDogProfile(event) {
  event.preventDefault();

  if (!requireValidBreed(selectors.ownerDogForm)) {
    return;
  }

  try {
    state.dog = await api(`/api/dogs/${state.dog.ID}?userId=${state.session.id}`, {
      method: "PUT",
      body: JSON.stringify(getFormPayload(selectors.ownerDogForm))
    });
    await refreshMe();
    showToast("Perfil del perro actualizado.");
  } catch (error) {
    showToast(error.message);
  }
}

async function submitWalkerProfile(event) {
  event.preventDefault();

  if (!requireValidBreed(selectors.walkerProfileForm)) {
    return;
  }

  try {
    state.walker = await api(`/api/walkers/${state.walker.Id}?userId=${state.session.id}`, {
      method: "PUT",
      body: JSON.stringify(getFormPayload(selectors.walkerProfileForm))
    });
    await refreshMe();
    showToast("Perfil del paseador actualizado.");
  } catch (error) {
    showToast(error.message);
  }
}

async function createAppointment(form) {
  try {
    await api("/api/appointments", {
      method: "POST",
      body: JSON.stringify({
        userId: state.session.id,
        Id_Perro: state.dog.ID,
        Id_Paseador: form.dataset.walkerId,
        Fecha_Hora: form.Fecha_Hora.value
      })
    });
    await refreshMe();
    setOwnerTab("appointments");
    showToast("Cita agendada.");
  } catch (error) {
    showToast(error.message);
  }
}

async function updateAppointmentStatus(appointmentId, status) {
  try {
    state.appointments = await api(`/api/appointments/${appointmentId}/status`, {
      method: "PATCH",
      body: JSON.stringify({
        userId: state.session.id,
        Estatus: status
      })
    });
    await refreshMe();
    showToast("Cita actualizada.");
  } catch (error) {
    showToast(error.message);
  }
}

function bindEvents() {
  selectors.openAuthButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setAuthTab(button.dataset.openAuth);
      showAuth();
    });
  });

  selectors.themeToggleButtons.forEach((button) => {
    button.addEventListener("click", toggleTheme);
  });

  selectors.backHomeButton.addEventListener("click", showLanding);

  selectors.authTabs.forEach((tab) => {
    tab.addEventListener("click", () => setAuthTab(tab.dataset.authTab));
  });

  selectors.ownerTabs.forEach((tab) => {
    tab.addEventListener("click", () => setOwnerTab(tab.dataset.ownerTab));
  });

  selectors.walkerTabs.forEach((tab) => {
    tab.addEventListener("click", () => setWalkerTab(tab.dataset.walkerTab));
  });

  selectors.breedSearches.forEach((input) => {
    input.addEventListener("focus", () => openBreedMenu(input, true));
    input.addEventListener("click", () => openBreedMenu(input, true));
    input.addEventListener("input", () => {
      setBreedFromInput(input);
      openBreedMenu(input);
    });
    input.addEventListener("keydown", (event) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        openBreedMenu(input, true);
      }

      if (event.key === "Escape") {
        closeBreedMenus();
      }
    });
  });

  document.addEventListener("mousedown", (event) => {
    const option = event.target.closest(".breed-menu-option");

    if (option && state.activeBreedInput) {
      event.preventDefault();
      selectBreed(state.activeBreedInput, option.dataset.breedId);
      return;
    }

    if (!event.target.closest(".breed-menu") && !event.target.closest(".breed-search")) {
      closeBreedMenus();
    }
  });

  selectors.loginForm.addEventListener("submit", submitLogin);
  selectors.ownerRegisterForm.addEventListener("submit", submitOwnerRegister);
  selectors.walkerRegisterForm.addEventListener("submit", submitWalkerRegister);
  selectors.ownerDogForm.addEventListener("submit", submitDogProfile);
  selectors.walkerProfileForm.addEventListener("submit", submitWalkerProfile);
  selectors.refreshMatches.addEventListener("click", loadMatches);

  selectors.ownerMatches.addEventListener("submit", (event) => {
    const form = event.target.closest(".inline-appointment-form");

    if (!form) {
      return;
    }

    event.preventDefault();
    createAppointment(form);
  });

  selectors.ownerAppointments.addEventListener("click", (event) => {
    const button = event.target.closest("[data-owner-cancel]");

    if (button) {
      updateAppointmentStatus(button.dataset.ownerCancel, "Cancelado");
    }
  });

  selectors.walkerAppointments.addEventListener("change", (event) => {
    const select = event.target.closest("[data-walker-status]");

    if (select) {
      updateAppointmentStatus(select.dataset.walkerStatus, select.value);
    }
  });

  selectors.prevMonth.addEventListener("click", () => {
    state.calendarDate.setMonth(state.calendarDate.getMonth() - 1);
    renderCalendar();
  });

  selectors.nextMonth.addEventListener("click", () => {
    state.calendarDate.setMonth(state.calendarDate.getMonth() + 1);
    renderCalendar();
  });

  selectors.logoutButton.addEventListener("click", () => {
    localStorage.removeItem("paseoPerrosUserId");
    state.session = null;
    state.dog = null;
    state.walker = null;
    state.appointments = [];
    showLanding();
  });
}

async function loadBreeds() {
  try {
    state.breeds = mergeFallbackBreeds(await api("/api/breeds"));
  } catch (error) {
    state.breeds = mergeFallbackBreeds([]);
    showToast("TheDogAPI no respondió; se cargaron razas base.");
  }

  setDefaultBreeds();
  renderLandingDog();
  startLandingBreedRotation();
}

async function restoreSession() {
  const userId = localStorage.getItem("paseoPerrosUserId");

  if (!userId) {
    showLanding();
    return;
  }

  try {
    const payload = await api(`/api/me?userId=${userId}`);
    saveSession(payload);
    await renderDashboard();
  } catch (error) {
    localStorage.removeItem("paseoPerrosUserId");
    showLanding();
  }
}

async function init() {
  applyTheme(localStorage.getItem("paseoFelizTheme") || "dark");
  bindEvents();
  setAuthTab("login");
  setOwnerTab("profile");
  setWalkerTab("profile");
  await loadBreeds();
  await restoreSession();
}

init();
