# Guía de Despliegue Local - Proyecto Auris

## Archivos y carpetas ESENCIALES (copiar al servidor):

### 1. Backend (carpeta completa)
```
backend/
├── __init__.py
├── app.py                    # Aplicación principal Flask
├── requirements.txt          # Dependencias Python
├── config.json              # Configuración de la app
├── models/                  # Modelos de datos
├── routes/                  # Rutas de la API
├── services/                # Servicios (TTS, etc.)
└── utils/                   # Utilidades
```

### 2. Frontend (carpeta completa)
```
frontend/
├── package.json             # Configuración del frontend
├── static/                  # Archivos estáticos
│   ├── css/                # Estilos CSS
│   ├── js/                 # JavaScript
│   └── assets/             # Imágenes, audio, etc.
└── templates/              # Plantillas HTML
```

### 3. Archivos de configuración raíz
```
.env.example                 # Ejemplo de variables de entorno
Procfile                     # Para despliegue (opcional)
README.md                    # Documentación
tablas.sql                   # Script de base de datos
backend_test.py              # Tests del backend
```

## Archivos que NO debes copiar (relacionados con GitHub/desarrollo):

### ❌ Archivos de Git
- `.git/` (carpeta completa)
- `.gitignore`
- `.github/` (si existe)

### ❌ Archivos de cache y temporales
- `backend/__pycache__/` (carpetas de cache Python)
- `backend/models/__pycache__/`
- `backend/routes/__pycache__/`
- `backend/services/__pycache__/`
- `backend/utils/__pycache__/`
- `*.pyc` (archivos compilados Python)
- `node_modules/` (si existe)

### ❌ Archivos de desarrollo
- `.vscode/` (configuración de VS Code)
- `.idea/` (configuración de PyCharm)
- `*.log` (archivos de log)
- `temp/` o `tmp/` (carpetas temporales)

### ❌ Base de datos local (opcional)
- `backend/auris.db` (puedes omitirla para empezar limpio)

## Estructura final recomendada en el servidor:

```
auris-proyecto/
├── backend/
│   ├── __init__.py
│   ├── app.py
│   ├── requirements.txt
│   ├── config.json
│   ├── models/
│   ├── routes/
│   ├── services/
│   └── utils/
├── frontend/
│   ├── package.json
│   ├── static/
│   └── templates/
├── .env.example
├── README.md
├── tablas.sql
└── backend_test.py
```

## Pasos para el despliegue:

### 1. Preparar el entorno
```bash
# Crear directorio del proyecto
mkdir auris-proyecto
cd auris-proyecto

# Copiar archivos esenciales (sin .git, __pycache__, etc.)
```

### 2. Configurar variables de entorno
```bash
# Copiar y configurar variables de entorno
cp .env.example .env
# Editar .env con tus configuraciones locales
```

### 3. Instalar dependencias Python
```bash
cd backend
pip install -r requirements.txt
```

### 4. Configurar base de datos
```bash
# Si usas MySQL
mysql -u root -p < ../tablas.sql

# O dejar que la app cree SQLite automáticamente
```

### 5. Ejecutar la aplicación
```bash
python app.py
```

## Archivos de audio generados
Los archivos en `frontend/static/assets/audio/` son archivos de audio generados por el TTS. Puedes:
- Copiarlos si quieres mantener el audio existente
- Omitirlos para empezar limpio (se generarán nuevos automáticamente)

## Notas importantes:
- No copies carpetas `__pycache__` (se regeneran automáticamente)
- No copies `.git` (no necesitas control de versiones en producción)
- Asegúrate de configurar correctamente el archivo `.env`
- Los archivos de audio se generan dinámicamente, no son críticos