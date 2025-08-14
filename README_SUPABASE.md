# 🔧 Configuración de Variables de Entorno para Supabase

## Error actual en Vercel:
```
Error: supabaseUrl is required.
```

## ✅ Solución: Configurar variables de entorno en Vercel

### 📋 Variables requeridas:

1. **NEXT_PUBLIC_SUPABASE_URL**
   - URL de tu proyecto de Supabase
   - Formato: `https://tu-proyecto.supabase.co`

2. **NEXT_PUBLIC_SUPABASE_ANON_KEY**
   - API Key pública de Supabase (anon key)
   - Es la clave que permite acceso de solo lectura

### 🔍 Cómo obtener estas variables:

1. **Ve a tu proyecto en Supabase:**
   - Abre [supabase.com](https://supabase.com)
   - Selecciona tu proyecto: `winston93-cloud`

2. **Navega a Settings:**
   - Sidebar → Settings → API

3. **Copia las credenciales:**
   - **Project URL** → Esta es tu `NEXT_PUBLIC_SUPABASE_URL`
   - **Project API keys** → **anon/public** → Esta es tu `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 🚀 Configurar en Vercel:

1. **Ve a tu proyecto en Vercel:**
   - [vercel.com/dashboard](https://vercel.com/dashboard)
   - Selecciona tu proyecto `services`

2. **Agrega las variables:**
   - Settings → Environment Variables
   - Add New:
     - Name: `NEXT_PUBLIC_SUPABASE_URL`
     - Value: Tu URL de Supabase
   - Add New:
     - Name: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - Value: Tu anon key de Supabase

3. **Redeploy:**
   - Ve a Deployments
   - Click en el último deployment
   - Click "Redeploy"

### 📊 Tu tabla usuario ya está configurada correctamente:
- Columnas necesarias: ✅
- Datos de prueba: ✅
- Solo faltan las variables de entorno para conectar

¡Una vez configuradas las variables, el deployment será exitoso! 🎉
