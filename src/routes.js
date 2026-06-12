const crypto = require("node:crypto");
const db = require("./db");
const { rankWalkersForDog } = require("./match");

let breedCache = {
  fetchedAt: 0,
  data: []
};

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8"
  });
  res.end(JSON.stringify(payload));
}

function sendError(res, statusCode, message, detail) {
  sendJson(res, statusCode, {
    error: message,
    detail: detail || undefined
  });
}

async function readJson(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

function requireFields(payload, fields) {
  const missing = fields.filter((field) => payload[field] === undefined || payload[field] === null || payload[field] === "");

  if (missing.length) {
    throw new Error(`Campos requeridos: ${missing.join(", ")}`);
  }
}

function toNullableNumber(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function toBooleanBit(value) {
  return value === true || value === "true" || value === "1" || value === 1 ? 1 : 0;
}

function roleToDb(role) {
  return role === "owner" ? "dueño" : "paseador";
}

function roleFromDb(role) {
  return role === "dueño" ? "owner" : "walker";
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const iterations = 120000;
  const hash = crypto.pbkdf2Sync(password, salt, iterations, 32, "sha256").toString("hex");
  return `pbkdf2$${iterations}$${salt}$${hash}`;
}

function verifyPassword(password, storedHash) {
  const [method, iterations, salt, hash] = String(storedHash || "").split("$");

  if (method !== "pbkdf2" || !iterations || !salt || !hash) {
    return false;
  }

  const computed = crypto.pbkdf2Sync(password, salt, Number(iterations), 32, "sha256").toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(computed, "hex"));
}

function mapUser(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    role: roleFromDb(row.rol),
    name: row.nombre,
    phone: row.telefono,
    dogId: row.dog_id || undefined,
    walkerId: row.walker_id || undefined
  };
}

function mapDog(row) {
  if (!row) {
    return null;
  }

  return {
    ID: row.id,
    Nombre: row.nombre,
    Raza_API_ID: row.raza_api_id,
    Raza_Nombre: row.raza_nombre,
    Raza_Imagen_URL: row.raza_imagen_url,
    Edad: row.edad,
    Tamano: row.tamano,
    Nivel_Energia: row.nivel_energia,
    NombreDueno: row.nombre_dueno,
    TelefonoDueno: row.telefono_dueno,
    Direccion: row.direccion
  };
}

function mapWalker(row) {
  if (!row) {
    return null;
  }

  return {
    Id: row.id,
    Nombre: row.nombre,
    Especialidad_Raza_API_ID: row.especialidad_raza_api_id,
    Especialidad_Raza_Nombre: row.especialidad_raza_nombre,
    Especialidad_Raza_Imagen_URL: row.especialidad_raza_imagen_url,
    Capacidad_Tamano: row.capacidad_tamano,
    AceptaHiperactivos: Boolean(row.acepta_hiperactivos),
    Tarifa: Number(row.tarifa),
    Telefono: row.telefono,
    Direccion: row.direccion
  };
}

function mapAppointment(row) {
  return {
    ID_Cita: row.id,
    Id_Perro: row.perro_id,
    Id_Paseador: row.paseador_id,
    Fecha_Hora: row.fecha_hora,
    Estatus: row.estado,
    NombrePerro: row.nombre_perro || "Perro no encontrado",
    NombrePaseador: row.nombre_paseador || "Paseador no encontrado"
  };
}

function normalizePgError(error) {
  if (error.code === "23505") {
    const conflict = new Error("Ya existe un registro con esos datos.");
    conflict.statusCode = 409;
    return conflict;
  }

  return error;
}

async function getUserById(userId) {
  const result = await db.query(
    `
      SELECT
        u.id, u.rol, u.nombre, u.telefono,
        p.id AS dog_id,
        w.id AS walker_id
      FROM usuarios u
      LEFT JOIN perros p ON p.dueno_id = u.id
      LEFT JOIN paseadores w ON w.usuario_id = u.id
      WHERE u.id = $1
    `,
    [Number(userId)]
  );

  return mapUser(result.rows[0]);
}

async function getDogById(id) {
  const result = await db.query("SELECT * FROM perros WHERE id = $1", [Number(id)]);
  return mapDog(result.rows[0]);
}

async function getWalkerById(id) {
  const result = await db.query("SELECT * FROM paseadores WHERE id = $1", [Number(id)]);
  return mapWalker(result.rows[0]);
}

async function assertUserRole(userId, role) {
  const user = await getUserById(userId);

  if (!user || user.role !== role) {
    const error = new Error("Sesión inválida para esta acción.");
    error.statusCode = 403;
    throw error;
  }

  return user;
}

async function listDogs() {
  const result = await db.query("SELECT * FROM perros ORDER BY id DESC");
  return result.rows.map(mapDog);
}

async function listWalkers() {
  const result = await db.query("SELECT * FROM paseadores ORDER BY id DESC");
  return result.rows.map(mapWalker);
}

async function updateDog(id, payload, userId) {
  const user = await assertUserRole(userId, "owner");

  if (Number(id) !== user.dogId) {
    const error = new Error("No puedes editar este perro.");
    error.statusCode = 403;
    throw error;
  }

  const result = await db.query(
    `
      UPDATE perros
      SET
        nombre = COALESCE($1, nombre),
        raza_api_id = COALESCE($2, raza_api_id),
        edad = $3,
        tamano = COALESCE($4, tamano),
        nivel_energia = COALESCE($5, nivel_energia),
        nombre_dueno = COALESCE($6, nombre_dueno),
        telefono_dueno = COALESCE($7, telefono_dueno),
        direccion = $8
      WHERE id = $9 AND dueno_id = $10
      RETURNING *
    `,
    [
      payload.Nombre || null,
      payload.Raza_API_ID ? String(payload.Raza_API_ID) : null,
      payload.Edad !== undefined ? toNullableNumber(payload.Edad) : null,
      payload.Tamano || null,
      payload.Nivel_Energia || null,
      payload.NombreDueno || null,
      payload.TelefonoDueno || null,
      payload.Direccion || null,
      Number(id),
      user.id
    ]
  );

  if (!result.rows.length) {
    const error = new Error("Perro no encontrado.");
    error.statusCode = 404;
    throw error;
  }

  await db.query(
    "UPDATE usuarios SET nombre = $1, telefono = $2 WHERE id = $3",
    [result.rows[0].nombre_dueno, result.rows[0].telefono_dueno, user.id]
  );

  return mapDog(result.rows[0]);
}

async function updateWalker(id, payload, userId) {
  const user = await assertUserRole(userId, "walker");

  if (Number(id) !== user.walkerId) {
    const error = new Error("No puedes editar este paseador.");
    error.statusCode = 403;
    throw error;
  }

  const result = await db.query(
    `
      UPDATE paseadores
      SET
        nombre = COALESCE($1, nombre),
        especialidad_raza_api_id = COALESCE($2, especialidad_raza_api_id),
        capacidad_tamano = COALESCE($3, capacidad_tamano),
        acepta_hiperactivos = COALESCE($4, acepta_hiperactivos),
        tarifa = COALESCE($5, tarifa),
        telefono = COALESCE($6, telefono),
        direccion = $7
      WHERE id = $8 AND usuario_id = $9
      RETURNING *
    `,
    [
      payload.Nombre || null,
      payload.Especialidad_Raza_API_ID ? String(payload.Especialidad_Raza_API_ID) : null,
      payload.Capacidad_Tamano || null,
      payload.AceptaHiperactivos !== undefined ? Boolean(toBooleanBit(payload.AceptaHiperactivos)) : null,
      payload.Tarifa !== undefined ? Number(payload.Tarifa) : null,
      payload.Telefono || null,
      payload.Direccion || null,
      Number(id),
      user.id
    ]
  );

  if (!result.rows.length) {
    const error = new Error("Paseador no encontrado.");
    error.statusCode = 404;
    throw error;
  }

  await db.query(
    "UPDATE usuarios SET nombre = $1, telefono = $2 WHERE id = $3",
    [result.rows[0].nombre, result.rows[0].telefono, user.id]
  );

  return mapWalker(result.rows[0]);
}

async function listAppointments(filters = {}) {
  const params = [];
  let where = "";

  if (filters.role && filters.userId) {
    params.push(Number(filters.userId));
    where = filters.role === "owner" ? "WHERE p.dueno_id = $1" : "WHERE pa.usuario_id = $1";
  }

  const result = await db.query(
    `
      SELECT
        c.*,
        p.nombre AS nombre_perro,
        pa.nombre AS nombre_paseador
      FROM citas c
      INNER JOIN perros p ON p.id = c.perro_id
      INNER JOIN paseadores pa ON pa.id = c.paseador_id
      ${where}
      ORDER BY c.fecha_hora ASC
    `,
    params
  );

  return result.rows.map(mapAppointment);
}

function canOwnerCancel(appointment) {
  return new Date(appointment.Fecha_Hora).getTime() - Date.now() >= 24 * 60 * 60 * 1000;
}

async function createAppointment(payload) {
  requireFields(payload, ["Id_Perro", "Id_Paseador", "Fecha_Hora", "userId"]);

  const user = await assertUserRole(payload.userId, "owner");
  const date = new Date(payload.Fecha_Hora);

  if (Number.isNaN(date.getTime())) {
    throw new Error("Fecha_Hora no es una fecha válida.");
  }

  if (Number(payload.Id_Perro) !== user.dogId) {
    const error = new Error("Solo puedes agendar citas para tu perro.");
    error.statusCode = 403;
    throw error;
  }

  const dog = await getDogById(payload.Id_Perro);
  const walker = await getWalkerById(payload.Id_Paseador);

  if (!dog || !walker) {
    const error = new Error("El perro o paseador seleccionado no existe.");
    error.statusCode = 404;
    throw error;
  }

  const compatible = rankWalkersForDog(dog, await listWalkers()).some((match) => match.Id === walker.Id);

  if (!compatible) {
    const error = new Error("El paseador seleccionado no es compatible con este perro.");
    error.statusCode = 400;
    throw error;
  }

  const result = await db.query(
    `
      INSERT INTO citas (perro_id, paseador_id, fecha_hora, estado)
      VALUES ($1, $2, $3, 'Aceptado')
      RETURNING *
    `,
    [dog.ID, walker.Id, date]
  );

  const appointments = await listAppointments();
  return appointments.find((item) => item.ID_Cita === result.rows[0].id);
}

async function updateAppointmentStatus(id, payload) {
  requireFields(payload, ["Estatus", "userId"]);

  const user = await getUserById(payload.userId);
  const appointments = await listAppointments();
  const appointment = appointments.find((item) => item.ID_Cita === Number(id));

  if (!user || !appointment) {
    const error = new Error("Cita o sesión no encontrada.");
    error.statusCode = 404;
    throw error;
  }

  if (user.role === "owner") {
    if (appointment.Id_Perro !== user.dogId || payload.Estatus !== "Cancelado") {
      const error = new Error("El dueño solo puede cancelar sus propias citas.");
      error.statusCode = 403;
      throw error;
    }

    if (!canOwnerCancel(appointment)) {
      const error = new Error("Solo puedes cancelar con mínimo 1 día de anticipación.");
      error.statusCode = 400;
      throw error;
    }
  } else if (user.role === "walker") {
    const allowed = ["Aceptado", "En proceso", "Cancelado"];

    if (appointment.Id_Paseador !== user.walkerId || !allowed.includes(payload.Estatus)) {
      const error = new Error("No puedes actualizar esta cita.");
      error.statusCode = 403;
      throw error;
    }
  }

  await db.query("UPDATE citas SET estado = $1 WHERE id = $2", [payload.Estatus, Number(id)]);
  return listAppointments({ role: user.role, userId: user.id });
}

async function getBreeds() {
  const oneHour = 60 * 60 * 1000;

  if (breedCache.data.length && Date.now() - breedCache.fetchedAt < oneHour) {
    return breedCache.data;
  }

  const response = await fetch("https://api.thedogapi.com/v1/breeds");

  if (!response.ok) {
    throw new Error(`TheDogAPI respondió con estado ${response.status}`);
  }

  const breeds = await response.json();

  breedCache = {
    fetchedAt: Date.now(),
    data: breeds.map((breed) => ({
      id: String(breed.id),
      name: breed.name,
      temperament: breed.temperament,
      breed_group: breed.breed_group,
      life_span: breed.life_span,
      weight: breed.weight,
      image: breed.image?.url || (breed.reference_image_id ? `https://cdn2.thedogapi.com/images/${breed.reference_image_id}.jpg` : "")
    }))
  };

  return breedCache.data;
}

async function registerOwner(payload) {
  requireFields(payload, ["NombreDueno", "TelefonoDueno", "password", "Nombre", "Raza_API_ID", "Tamano", "Nivel_Energia"]);

  try {
    return await db.withTransaction(async (client) => {
      const userResult = await client.query(
        `
          INSERT INTO usuarios (rol, nombre, telefono, contrasena_hash)
          VALUES ($1, $2, $3, $4)
          RETURNING id, rol, nombre, telefono
        `,
        [roleToDb("owner"), payload.NombreDueno, payload.TelefonoDueno, hashPassword(payload.password)]
      );
      const userRow = userResult.rows[0];

      const dogResult = await client.query(
        `
          INSERT INTO perros (
            dueno_id, nombre, raza_api_id, edad, tamano, nivel_energia,
            nombre_dueno, telefono_dueno, direccion
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING *
        `,
        [
          userRow.id,
          payload.Nombre,
          String(payload.Raza_API_ID),
          toNullableNumber(payload.Edad),
          payload.Tamano,
          payload.Nivel_Energia,
          payload.NombreDueno,
          payload.TelefonoDueno,
          payload.Direccion || null
        ]
      );

      return {
        user: mapUser({ ...userRow, dog_id: dogResult.rows[0].id }),
        dog: mapDog(dogResult.rows[0]),
        appointments: []
      };
    });
  } catch (error) {
    throw normalizePgError(error);
  }
}

async function registerWalker(payload) {
  requireFields(payload, ["Nombre", "Telefono", "password", "Especialidad_Raza_API_ID", "Capacidad_Tamano", "Tarifa"]);

  try {
    return await db.withTransaction(async (client) => {
      const userResult = await client.query(
        `
          INSERT INTO usuarios (rol, nombre, telefono, contrasena_hash)
          VALUES ($1, $2, $3, $4)
          RETURNING id, rol, nombre, telefono
        `,
        [roleToDb("walker"), payload.Nombre, payload.Telefono, hashPassword(payload.password)]
      );
      const userRow = userResult.rows[0];

      const walkerResult = await client.query(
        `
          INSERT INTO paseadores (
            usuario_id, nombre, especialidad_raza_api_id, capacidad_tamano,
            acepta_hiperactivos, tarifa, telefono, direccion
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING *
        `,
        [
          userRow.id,
          payload.Nombre,
          String(payload.Especialidad_Raza_API_ID),
          payload.Capacidad_Tamano,
          Boolean(toBooleanBit(payload.AceptaHiperactivos)),
          Number(payload.Tarifa),
          payload.Telefono,
          payload.Direccion || null
        ]
      );

      return {
        user: mapUser({ ...userRow, walker_id: walkerResult.rows[0].id }),
        walker: mapWalker(walkerResult.rows[0]),
        appointments: []
      };
    });
  } catch (error) {
    throw normalizePgError(error);
  }
}

async function login(payload) {
  requireFields(payload, ["phone", "password"]);

  const result = await db.query(
    "SELECT id, rol, nombre, telefono, contrasena_hash FROM usuarios WHERE telefono = $1",
    [payload.phone]
  );
  const user = result.rows[0];

  if (!user || !verifyPassword(payload.password, user.contrasena_hash)) {
    const error = new Error("Teléfono o contraseña incorrectos.");
    error.statusCode = 401;
    throw error;
  }

  return getMe(user.id);
}

async function getMe(userId) {
  const user = await getUserById(userId);

  if (!user) {
    const error = new Error("Sesión no encontrada.");
    error.statusCode = 404;
    throw error;
  }

  return {
    user,
    dog: user.role === "owner" ? await getDogById(user.dogId) : null,
    walker: user.role === "walker" ? await getWalkerById(user.walkerId) : null,
    appointments: await listAppointments({ role: user.role, userId: user.id })
  };
}

async function handleMatch(payload) {
  const dog = payload.dogId ? await getDogById(Number(payload.dogId)) : payload.dog;

  if (!dog) {
    const error = new Error("Perro no encontrado para hacer el match.");
    error.statusCode = 404;
    throw error;
  }

  return {
    dog,
    matches: rankWalkersForDog(dog, await listWalkers())
  };
}

async function handleApiRequest(req, res, pathname, searchParams = new URLSearchParams()) {
  try {
    if (req.method === "GET" && pathname === "/api/health") {
      await db.query("SELECT 1");
      sendJson(res, 200, { ok: true, database: "connected" });
      return true;
    }

    if (req.method === "GET" && pathname === "/api/breeds") {
      sendJson(res, 200, await getBreeds());
      return true;
    }

    if (req.method === "POST" && pathname === "/api/auth/register-owner") {
      sendJson(res, 201, await registerOwner(await readJson(req)));
      return true;
    }

    if (req.method === "POST" && pathname === "/api/auth/register-walker") {
      sendJson(res, 201, await registerWalker(await readJson(req)));
      return true;
    }

    if (req.method === "POST" && pathname === "/api/auth/login") {
      sendJson(res, 200, await login(await readJson(req)));
      return true;
    }

    if (req.method === "GET" && pathname === "/api/me") {
      sendJson(res, 200, await getMe(searchParams.get("userId")));
      return true;
    }

    if (req.method === "GET" && pathname === "/api/dogs") {
      sendJson(res, 200, await listDogs());
      return true;
    }

    const dogEditMatch = pathname.match(/^\/api\/dogs\/(\d+)$/);

    if (req.method === "PUT" && dogEditMatch) {
      sendJson(res, 200, await updateDog(dogEditMatch[1], await readJson(req), searchParams.get("userId")));
      return true;
    }

    if (req.method === "GET" && pathname === "/api/walkers") {
      sendJson(res, 200, await listWalkers());
      return true;
    }

    const walkerEditMatch = pathname.match(/^\/api\/walkers\/(\d+)$/);

    if (req.method === "PUT" && walkerEditMatch) {
      sendJson(res, 200, await updateWalker(walkerEditMatch[1], await readJson(req), searchParams.get("userId")));
      return true;
    }

    const walkerMatches = pathname.match(/^\/api\/walkers\/matches\/(\d+)$/);

    if (req.method === "GET" && walkerMatches) {
      const dog = await getDogById(walkerMatches[1]);

      if (!dog) {
        sendError(res, 404, "Perro no encontrado.");
        return true;
      }

      sendJson(res, 200, rankWalkersForDog(dog, await listWalkers()));
      return true;
    }

    if (req.method === "POST" && pathname === "/api/match") {
      sendJson(res, 200, await handleMatch(await readJson(req)));
      return true;
    }

    if (req.method === "GET" && pathname === "/api/appointments") {
      sendJson(res, 200, await listAppointments({
        role: searchParams.get("role"),
        userId: searchParams.get("userId")
      }));
      return true;
    }

    if (req.method === "POST" && pathname === "/api/appointments") {
      sendJson(res, 201, await createAppointment(await readJson(req)));
      return true;
    }

    const statusMatch = pathname.match(/^\/api\/appointments\/(\d+)\/status$/);

    if (req.method === "PATCH" && statusMatch) {
      sendJson(res, 200, await updateAppointmentStatus(statusMatch[1], await readJson(req)));
      return true;
    }

    if (pathname.startsWith("/api/")) {
      sendError(res, 404, "Ruta API no encontrada.");
      return true;
    }

    return false;
  } catch (error) {
    console.error("API error:", error);
    sendError(res, error.statusCode || 500, error.message || "Error interno del servidor.");
    return true;
  }
}

module.exports = {
  handleApiRequest
};
