# Jobbit

Esta es una PoC para Jobbit, un portal web de empleo con funcionalidades iniciales de registro, inicio de sesión y creación de perfil de empleo, todo con conexión a una base de datos y persistencia de datos.

**Integrantes**

- Sara Arboleda Quintero

- Andrea Carolina Mercado Garrido

- Luis Fernando Bernal Ramirez.

## Tecnologías utilizadas

### Frontend
- Next.js
- React
- CSS Modules

### Backend
- Node.js
- Express.js

### Base de datos
- PostgreSQL

---

# Requisitos

Antes de ejecutar el proyecto, es necesario tener instalado:

- Node.js
- npm
- PostgreSQL

---

# Instalación

## 1. Descarga el repositorio

Descarga el repositorio y entra a la carpeta de Jobbit

```bash
cd Jobbit
```

## 2. Configurar el backend

Entra a la carpeta backend

```bash
cd backend
```

Instala las dependencias

```bash
npm install
```

**Configurar las variables de entorno**
Crea un archivo llamado ".env" dentro de la carpeta backend y pon los atributos como corresponda en base a este ejemplo:
```
PORT=5001
DATABASE_URL=postgresql:///job_portal
JWT_SECRET=your_secret_key_here
```

## 3. Crear la base de datos
Crea una base de datos llamada "job_portal"

```
createdb job_portal
```

Después entra a Postgresql

```bash
psql -d job_portal
```

Y ejecuta el siguiente codigo SQL:

```SQL
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE work_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    field VARCHAR(150) NOT NULL,
    experience TEXT,
    experience_years INTEGER,
    work_preferences TEXT,
    preferred_location VARCHAR(150),
    work_mode VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

Cuando termines sal con `\q`

## 4. Ejecutar el backend
Desde la carpeta backend ejecuta esto:
```bash
node src/index.js
```
## 5. Ejecutar el frontend
Abre otro terminal y desde frontend instala las dependencias:
```bash
npm install
```
Luego inicializa el frontend con:

```bash
npm run dev
```
# Uso

1. Abrir `http://localhost:3000` en un navegador.
2. Crear una cuenta
3. Iniciar sesión.
4. Si el usuario no tiene un perfil laboral, será dirigido a la página de creación de perfil.
5. Completar la información laboral:
   -Campo profesional.
  -Años de experiencia.
  -Experiencia.
  -Preferencias laborales.
  -Ubicación preferida.
  -Modalidad de trabajo.
6. La información se guarda en PostgreSQL.
7. Serás dirigido al dashboard donde puedes visualizar tu perfil.





