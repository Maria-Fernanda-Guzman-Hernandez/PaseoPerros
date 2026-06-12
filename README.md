# Paseo Feliz

Sistema web para asignar paseadores a perros según raza, tamaño, edad y nivel de energía.

## Requisitos

- Node.js 18 o superior.
- Base de datos PostgreSQL. El proyecto está configurado para usar Neon.

## Configuración

1. Instala dependencias:

```bash
npm install
```

2. Crea tu archivo `.env` a partir de `.env.example`:

```bash
cp .env.example .env
```

3. Edita `.env` con el puerto y la conexión de PostgreSQL en Neon:

```env
PORT=3000
DATABASE_URL=postgresql://usuario:password@host/base_de_datos?sslmode=verify-full
```

4. Inicia la app:

```bash
npm start
```

Abre `http://localhost:3000`.

Para verificar que la app está conectada a PostgreSQL, abre:

```text
http://localhost:3000/api/health
```

<<<<<<< HEAD
Debe responder:

```json
{"ok":true,"database":"connected"}
```

## Base de Datos

La app guarda la información en PostgreSQL usando Neon como proveedor de base de datos. La conexión se configura con la variable `DATABASE_URL` del archivo `.env`.

Tablas principales:

- `usuarios`
- `perros`
- `paseadores`
- `citas`
- `razas_perros_cache`

La conexión está centralizada en `src/db.js` usando `pg`, y las rutas de `src/routes.js` leen y escriben directamente en PostgreSQL.
=======
>>>>>>> fb6b718207d51405c1a2ec01db61515b61e861e6

## Modos Incluidos

- **Modo básico:** busca paseadores compatibles por perro registrado o por necesidades capturadas al momento.
- **Modo experto:** registra perros y paseadores usando razas visuales de TheDogAPI.
- **Modo heroico:** agenda citas y cambia su estatus.
- **Modo super heroico:** muestra las citas en calendario mensual.

## Endpoints Principales

- `GET /api/health`
- `GET /api/breeds`
- `POST /api/auth/register-owner`
- `POST /api/auth/register-walker`
- `POST /api/auth/login`
- `GET /api/me`
- `GET /api/dogs`
- `PUT /api/dogs/:id`
- `GET /api/walkers`
- `PUT /api/walkers/:id`
- `GET /api/walkers/matches/:dogId`
- `POST /api/match`
- `GET /api/appointments`
- `POST /api/appointments`
- `PATCH /api/appointments/:id/status`
