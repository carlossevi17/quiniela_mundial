# Quiniela Mundial 2026

Esta es una aplicación web SPA (Single Page Application) creada con HTML, CSS y JS (vanilla) usando Supabase como backend (Auth + Base de datos PostgreSQL).

## Estructura de Archivos

- `index.html`: La interfaz principal.
- `styles.css`: Estilos premium, modo oscuro y glassmorphism.
- `app.js`: Lógica principal y conexión con Supabase.
- `supabase/schema.sql`: Script para crear las tablas, políticas RLS y triggers de asignación automática de puntos.

## Instrucciones de Instalación y Despliegue

### 1. Configurar Supabase

1. Ve a [Supabase.com](https://supabase.com/) y crea un proyecto nuevo.
2. Ve a la sección **SQL Editor** en el panel izquierdo.
3. Copia el contenido del archivo `supabase/schema.sql` y pégalo en el editor.
4. Haz clic en **Run** para ejecutar el código. Esto creará:
   - Las tablas `profiles`, `matches` y `predictions`.
   - Las políticas RLS (Row Level Security) para proteger los datos.
   - Triggers y funciones para automatizar perfiles de usuario y el cálculo de puntos.

### 2. Obtener Claves API

1. En Supabase, ve a **Project Settings** (el icono del engranaje) y luego a la sección **API**.
2. Copia la `Project URL` y la `Project API keys` (la que dice `anon`, `public`).
3. Abre el archivo `app.js` y reemplaza las variables en las primeras líneas:
   ```javascript
   const SUPABASE_URL = 'AQUÍ_TU_URL';
   const SUPABASE_ANON_KEY = 'AQUÍ_TU_ANON_KEY';
   ```

### 3. Asignar el Rol de Administrador

El primer usuario que se registre no será admin por defecto. Para poder crear partidos e introducir resultados, necesitas permisos de admin:
1. Abre `index.html` en tu navegador, regístrate y haz login.
2. Ve al panel de Supabase > **Table Editor** > `profiles`.
3. Busca tu usuario en la tabla y cambia la columna `is_admin` de `false` a `true`.
4. Recarga la página en tu navegador. Ahora verás los paneles de administración para añadir partidos e introducir resultados finales.

### 4. Desplegar Gratis

Al no usar Node.js ni frameworks pesados, puedes desplegar esta web gratuitamente en GitHub Pages o Vercel.

**En Vercel (Recomendado):**
1. Crea una cuenta en [Vercel](https://vercel.com/).
2. Instala Vercel CLI o simplemente arrastra la carpeta completa al panel de "Deploy" de Vercel (opción Drag & Drop).
3. ¡Listo! Te dará una URL pública al instante.

**En GitHub Pages:**
1. Sube estos archivos a un repositorio de GitHub.
2. Ve a `Settings` > `Pages`.
3. Selecciona la rama `main` y guarda. En unos minutos tendrás la web online.
