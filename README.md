# Examen simulacro CB

Sitio estático para GitHub Pages. Supabase entrega las preguntas sin las respuestas correctas; la función `exam` puntúa en el servidor.

## Falta recuperar el banco original

El archivo original tenía 99 preguntas. Para generar la importación, coloca una copia del archivo original como `preguntas-original.js` en la raíz y ejecuta:

```powershell
node scripts/exportar-balotario.mjs
```

Esto genera `supabase/seed.sql`. El archivo original y el SQL con el banco están excluidos del repositorio por `.gitignore`; no los subas a GitHub. Ejecuta el SQL generado en el SQL Editor de Supabase.

## Crear la base de datos

1. En Supabase, abre **SQL Editor** y crea una consulta nueva.
2. Copia y ejecuta `supabase/migrations/202610220001_create_exam_questions.sql`.
3. Cuando recuperes el archivo original, genera `supabase/seed.sql`, abre otra consulta y ejecútala.
4. Comprueba que `public.exam_questions` contiene las preguntas importadas.

## Publicar la función de corrección desde el panel

1. En el panel de Supabase abre **Edge Functions → Deploy a new function → Via Editor**.
2. Crea una función llamada `exam`.
3. Reemplaza el contenido inicial del editor con `supabase/functions/exam/index.ts`.
4. Despliega la función. El código obtiene la clave de servidor desde las variables de entorno de Supabase; nunca la pegues en `config.js`.
5. En **Edge Functions → exam → Settings**, desactiva **Verify JWT with legacy secret** y guarda. Esta es una función pública para un examen público; su tabla sigue bloqueada para lectura directa mediante RLS.

## Configurar la web

Edita `config.js` y coloca la URL del proyecto y su clave **publishable** (`sb_publishable_...`). Esa clave es pública por diseño; no pegues aquí una clave `service_role` o `secret`.

## Publicar en GitHub Pages

1. Abre el repositorio existente `admnt1roai/exam_cb`.
2. Sube estos archivos actualizados desde GitHub: `index.html`, `script.js`, `styles.css`, `config.js`, y la carpeta `supabase` excepto `supabase/seed.sql`.
3. No publiques `preguntas-original.js` ni `supabase/seed.sql`; ambos contienen el banco y las respuestas correctas.
4. En el repositorio, abre **Settings → Pages** y confirma que publique desde `main` y `/ (root)`.
5. Espera a que termine la publicación y abre la URL que muestra GitHub Pages.

Si prefieres usar Git desde PowerShell, el repositorio debe clonarse primero y luego se copian los archivos preparados. No inicialices un repositorio nuevo sobre una carpeta que aún no está conectada al repositorio existente.

La web no funcionará hasta importar el balotario, desplegar la función y completar `config.js`.
