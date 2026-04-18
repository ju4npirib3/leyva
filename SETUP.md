# Leyva — Guía de configuración

## 1. Instalar dependencias

```bash
cd leyva
npm install
```

## 2. Configurar Firebase

### Crear proyecto
1. Ve a [console.firebase.google.com](https://console.firebase.google.com)
2. Crea un nuevo proyecto llamado `leyva`
3. Activa **Google Analytics** (opcional)

### Habilitar autenticación
1. En el menú lateral → **Authentication** → **Get started**
2. En la pestaña **Sign-in method** → habilita **Google**
3. Agrega tu dominio en **Authorized domains**

### Crear base de datos
1. En el menú lateral → **Firestore Database** → **Create database**
2. Elige **Production mode**
3. Selecciona una región cercana

### Reglas de Firestore
En **Firestore → Rules**, pega esto:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### Obtener credenciales
1. **Project Settings** (ícono de engranaje) → **General**
2. Desplázate hasta **Your apps** → clic en **</>** (web)
3. Registra la app con el nombre `leyva-web`
4. Copia la configuración `firebaseConfig`

### Crear archivo de entorno
```bash
cp .env.local.example .env.local
```
Llena `.env.local` con los valores del paso anterior.

## 3. Ejecutar en desarrollo

```bash
npm run dev
```
Abre [http://localhost:3000](http://localhost:3000)

## 4. Desplegar en Vercel (dominio propio)

```bash
npm install -g vercel
vercel
```

O conecta tu repositorio GitHub en [vercel.com](https://vercel.com):
1. Importa el repositorio
2. Agrega las variables de entorno (las mismas de `.env.local`)
3. Despliega

### Dominio personalizado
1. En Vercel → **Settings** → **Domains**
2. Agrega tu dominio (ej: `gastos.tudominio.com`)
3. Configura los DNS según las instrucciones de Vercel
4. En Firebase → **Authentication** → **Authorized domains** → agrega tu dominio

## Estructura de carpetas

```
leyva/
├── app/               # Páginas (Next.js App Router)
│   ├── login/         # Pantalla de inicio de sesión
│   ├── home/          # Dashboard principal
│   ├── charts/        # Gráficas y análisis
│   ├── accounts/      # Gestión de cuentas
│   └── settings/      # Configuración
├── components/        # Componentes reutilizables
├── contexts/          # Estado global (Auth, App)
├── lib/               # Utilidades y Firebase
└── types/             # TypeScript types
```
