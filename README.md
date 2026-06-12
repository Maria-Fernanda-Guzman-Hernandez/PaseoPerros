# Paseo Feliz

Sistema web para asignar paseadores a perros según raza, tamaño, edad y nivel de energía.

## Requisitos

- Node.js 18 o superior.

## Configuración

1. Instala dependencias:

```bash
npm install
```

2. Crea tu archivo `.env` a partir de `.env.example`:

```bash
cp .env.example .env
```

3. Edita `.env` si quieres cambiar el puerto:

```env
PORT=3000
```

4. Inicia la app:

```bash
npm start
```

Abre `http://localhost:3000`.

## Almacenamiento Actual

La app no está conectada a ninguna base de datos. Los endpoints guardan perros, paseadores y citas en memoria temporal mientras el servidor está encendido.

Cuando definas la nueva BD, el punto principal para conectar persistencia será `src/routes.js`, reemplazando las funciones que hoy leen y escriben en el objeto `store`.

## Modos Incluidos

- **Modo básico:** busca paseadores compatibles por perro registrado o por necesidades capturadas al momento.
- **Modo experto:** registra perros y paseadores usando razas visuales de TheDogAPI.
- **Modo heroico:** agenda citas y cambia su estatus.
- **Modo super heroico:** muestra las citas en calendario mensual.

## Endpoints Principales

- `GET /api/breeds`
- `GET /api/dogs`
- `POST /api/dogs`
- `GET /api/walkers`
- `POST /api/walkers`
- `POST /api/match`
- `GET /api/appointments`
- `POST /api/appointments`
- `PATCH /api/appointments/:id/status`
