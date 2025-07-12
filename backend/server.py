import sys
import os
import json
import uuid
import sqlite3
from datetime import datetime, timedelta
from flask import Flask, request, jsonify, render_template, session, send_from_directory
from flask_cors import CORS
import bcrypt
import jwt
import nltk
import pyttsx3
import requests
import docx2txt
from PyPDF2 import PdfReader
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

# Configuración para NLTK en producción
try:
    nltk_data_path = "/opt/render/project/src/nltk_data"
    os.makedirs(nltk_data_path, exist_ok=True)
    nltk.data.path.append(nltk_data_path)
    
    try:
        nltk.data.find('tokenizers/punkt')
        nltk.data.find('corpora/stopwords')
    except LookupError:
        try:
            nltk.download(['punkt', 'stopwords'], download_dir=nltk_data_path, quiet=True)
        except Exception as e:
            print(f"Advertencia: No se pudieron descargar los datos de NLTK: {e}")
except Exception as e:
    print(f"Advertencia: Error configurando NLTK: {e}")

# Configuración segura para pyttsx3
engine = None
try:
    engine = pyttsx3.init(driverName='dummy')
except Exception as e:
    print(f"Advertencia: pyttsx3 no disponible en servidor: {e}")
    engine = None

# Configuración de rutas
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
template_dir = os.path.join(project_root, 'frontend', 'templates')
static_dir = os.path.join(project_root, 'frontend', 'static')

# Crear la aplicación Flask
app = Flask(__name__,
            template_folder=template_dir,
            static_folder=static_dir)
CORS(app)

# Configurar clave secreta para sesiones
app.secret_key = os.environ.get('SECRET_KEY', 'auris-secret-key-2025')

# ===== CONFIGURACIÓN DE BASE DE DATOS SQLITE =====
DB_PATH = os.path.join(os.path.dirname(__file__), 'auris.db')

# JWT Configuration
JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'auris-jwt-secret-2025')
JWT_ACCESS_TOKEN_EXPIRES = int(os.environ.get('JWT_ACCESS_TOKEN_EXPIRES', '86400'))

def get_db_connection():
    """Función para obtener conexión a SQLite"""
    try:
        connection = sqlite3.connect(DB_PATH)
        connection.row_factory = sqlite3.Row  # Para acceder por nombre de columna
        return connection
    except Exception as e:
        print(f"Error conectando a SQLite: {e}")
        return None

def init_database():
    """Inicializar base de datos y crear tablas si no existen"""
    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        if not connection:
            return False
            
        cursor = connection.cursor()
        
        # Crear tabla de usuarios
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS Usuarios (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre_usuario TEXT NOT NULL UNIQUE,
                correo_electronico TEXT NOT NULL UNIQUE,
                contraseña TEXT NOT NULL,
                foto_perfil TEXT DEFAULT NULL,
                creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Crear tabla de configuraciones de usuario
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS Configuraciones_Usuario (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                usuario_id INTEGER,
                tipo_voz TEXT DEFAULT 'mujer',
                velocidad_lectura REAL DEFAULT 1.0,
                tamaño_fuente TEXT DEFAULT 'medium',
                contraste_alto BOOLEAN DEFAULT FALSE,
                retroalimentacion_audio BOOLEAN DEFAULT TRUE,
                actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (usuario_id) REFERENCES Usuarios(id) ON DELETE CASCADE
            )
        """)
        
        # Crear tabla de documentos
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS Documentos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                usuario_id INTEGER,
                titulo TEXT NOT NULL,
                contenido TEXT,
                tipo_archivo TEXT,
                creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (usuario_id) REFERENCES Usuarios(id) ON DELETE CASCADE
            )
        """)
        
        connection.commit()
        print("✅ Base de datos SQLite inicializada correctamente")
        return True
        
    except Exception as e:
        print(f"Error inicializando base de datos: {e}")
        return False
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()

# ===== RUTAS DE AUTENTICACIÓN =====

@app.route('/api/register', methods=['POST'])
def register():
    """Registro de nuevos usuarios"""
    data = request.json
    
    # Validar datos requeridos
    if not all(k in data for k in ('nombre_usuario', 'correo_electronico', 'contraseña')):
        return jsonify({'error': 'Faltan datos requeridos'}), 400
    
    nombre_usuario = data['nombre_usuario'].strip()
    correo_electronico = data['correo_electronico'].strip().lower()
    contraseña = data['contraseña']
    
    # Validaciones básicas
    if len(nombre_usuario) < 3:
        return jsonify({'error': 'El nombre de usuario debe tener al menos 3 caracteres'}), 400
    
    if len(contraseña) < 6:
        return jsonify({'error': 'La contraseña debe tener al menos 6 caracteres'}), 400
    
    if '@' not in correo_electronico:
        return jsonify({'error': 'Correo electrónico inválido'}), 400
    
    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({'error': 'Error de conexión a la base de datos'}), 500
            
        cursor = connection.cursor()
        
        # Verificar si el usuario ya existe
        cursor.execute("SELECT id FROM Usuarios WHERE correo_electronico = ? OR nombre_usuario = ?", 
                      (correo_electronico, nombre_usuario))
        if cursor.fetchone():
            return jsonify({'error': 'El usuario o correo ya existe'}), 409
        
        # Encriptar contraseña
        hashed_password = bcrypt.hashpw(contraseña.encode('utf-8'), bcrypt.gensalt())
        
        # Insertar nuevo usuario
        cursor.execute("""
            INSERT INTO Usuarios (nombre_usuario, correo_electronico, contraseña) 
            VALUES (?, ?, ?)
        """, (nombre_usuario, correo_electronico, hashed_password.decode('utf-8')))
        
        user_id = cursor.lastrowid
        
        # Crear configuraciones predeterminadas para el usuario
        cursor.execute("""
            INSERT INTO Configuraciones_Usuario (usuario_id, tipo_voz, velocidad_lectura, tamaño_fuente, contraste_alto, retroalimentacion_audio) 
            VALUES (?, ?, ?, ?, ?, ?)
        """, (user_id, 'mujer', 1.0, 'medium', False, True))
        
        connection.commit()
        
        return jsonify({
            'status': 'success',
            'message': 'Usuario registrado exitosamente',
            'user_id': user_id
        }), 201
        
    except Exception as e:
        return jsonify({'error': f'Error interno: {str(e)}'}), 500
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()

@app.route('/api/login', methods=['POST'])
def login():
    """Autenticación de usuarios"""
    data = request.json
    
    if not all(k in data for k in ('correo_electronico', 'contraseña')):
        return jsonify({'error': 'Faltan datos requeridos'}), 400
    
    correo_electronico = data['correo_electronico'].strip().lower()
    contraseña = data['contraseña']
    
    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({'error': 'Error de conexión a la base de datos'}), 500
            
        cursor = connection.cursor()
        
        # Buscar usuario
        cursor.execute("SELECT * FROM Usuarios WHERE correo_electronico = ?", (correo_electronico,))
        usuario = cursor.fetchone()
        
        if not usuario:
            return jsonify({'error': 'Credenciales inválidas'}), 401
        
        # Convertir Row a dict
        usuario_dict = dict(usuario)
        
        # Verificar contraseña
        if not bcrypt.checkpw(contraseña.encode('utf-8'), usuario_dict['contraseña'].encode('utf-8')):
            return jsonify({'error': 'Credenciales inválidas'}), 401
        
        # Generar JWT token
        payload = {
            'user_id': usuario_dict['id'],
            'exp': datetime.utcnow() + timedelta(seconds=JWT_ACCESS_TOKEN_EXPIRES)
        }
        token = jwt.encode(payload, JWT_SECRET_KEY, algorithm='HS256')
        
        # Obtener configuraciones del usuario
        cursor.execute("SELECT * FROM Configuraciones_Usuario WHERE usuario_id = ?", (usuario_dict['id'],))
        configuraciones = cursor.fetchone()
        configuraciones_dict = dict(configuraciones) if configuraciones else None
        
        return jsonify({
            'status': 'success',
            'message': 'Login exitoso',
            'token': token,
            'usuario': {
                'id': usuario_dict['id'],
                'nombre_usuario': usuario_dict['nombre_usuario'],
                'correo_electronico': usuario_dict['correo_electronico'],
                'foto_perfil': usuario_dict['foto_perfil']
            },
            'configuraciones': configuraciones_dict
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Error interno: {str(e)}'}), 500
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()

# ===== MIDDLEWARE DE AUTENTICACIÓN =====

def verify_token(token):
    """Verificar JWT token"""
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=['HS256'])
        return payload['user_id']
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def auth_required(f):
    """Decorador para rutas que requieren autenticación"""
    def decorated_function(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'error': 'Token requerido'}), 401
        
        if token.startswith('Bearer '):
            token = token[7:]
        
        user_id = verify_token(token)
        if not user_id:
            return jsonify({'error': 'Token inválido'}), 401
        
        request.user_id = user_id
        return f(*args, **kwargs)
    
    decorated_function.__name__ = f.__name__
    return decorated_function

# ===== RUTAS DE CONFIGURACIÓN DE USUARIO =====

@app.route('/api/user/config', methods=['GET'])
@auth_required
def get_user_config():
    """Obtener configuración del usuario"""
    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({'error': 'Error de conexión a la base de datos'}), 500
            
        cursor = connection.cursor()
        
        # Obtener datos del usuario
        cursor.execute("SELECT id, nombre_usuario, correo_electronico, foto_perfil FROM Usuarios WHERE id = ?", (request.user_id,))
        usuario = cursor.fetchone()
        usuario_dict = dict(usuario) if usuario else None
        
        # Obtener configuraciones
        cursor.execute("SELECT * FROM Configuraciones_Usuario WHERE usuario_id = ?", (request.user_id,))
        configuraciones = cursor.fetchone()
        
        if not configuraciones:
            # Crear configuraciones predeterminadas si no existen
            cursor.execute("""
                INSERT INTO Configuraciones_Usuario (usuario_id, tipo_voz, velocidad_lectura, tamaño_fuente, contraste_alto, retroalimentacion_audio) 
                VALUES (?, ?, ?, ?, ?, ?)
            """, (request.user_id, 'mujer', 1.0, 'medium', False, True))
            
            connection.commit()
            
            cursor.execute("SELECT * FROM Configuraciones_Usuario WHERE usuario_id = ?", (request.user_id,))
            configuraciones = cursor.fetchone()
        
        configuraciones_dict = dict(configuraciones) if configuraciones else None
        
        return jsonify({
            'status': 'success',
            'usuario': usuario_dict,
            'configuraciones': configuraciones_dict
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Error de base de datos: {str(e)}'}), 500
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()

@app.route('/api/user/config', methods=['PUT'])
@auth_required
def update_user_config():
    """Actualizar configuración del usuario"""
    data = request.json
    
    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({'error': 'Error de conexión a la base de datos'}), 500
            
        cursor = connection.cursor()
        
        # Actualizar configuraciones
        update_fields = []
        values = []
        
        if 'tipo_voz' in data:
            update_fields.append("tipo_voz = ?")
            values.append(data['tipo_voz'])
        
        if 'velocidad_lectura' in data:
            update_fields.append("velocidad_lectura = ?")
            values.append(float(data['velocidad_lectura']))
        
        if 'tamaño_fuente' in data:
            update_fields.append("tamaño_fuente = ?")
            values.append(data['tamaño_fuente'])
        
        if 'contraste_alto' in data:
            update_fields.append("contraste_alto = ?")
            values.append(bool(data['contraste_alto']))
        
        if 'retroalimentacion_audio' in data:
            update_fields.append("retroalimentacion_audio = ?")
            values.append(bool(data['retroalimentacion_audio']))
        
        if update_fields:
            values.append(request.user_id)
            query = f"UPDATE Configuraciones_Usuario SET {', '.join(update_fields)} WHERE usuario_id = ?"
            cursor.execute(query, values)
            connection.commit()
        
        return jsonify({
            'status': 'success',
            'message': 'Configuración actualizada exitosamente'
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Error de base de datos: {str(e)}'}), 500
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()

# ===== RUTAS DE NAVEGACIÓN =====

@app.route('/')
def index():
    """Página de login"""
    return render_template('login.html')

@app.route('/modo_visual')
def modo_visual():
    """Página del asistente en modo visual"""
    return render_template('Modo_Visual.html')

@app.route('/modo_auditivo')
def modo_auditivo():
    """Página del asistente en modo auditivo"""
    return render_template('Modo_Auditivo.html')

@app.route('/biblioteca')
def biblioteca():
    """Página de la biblioteca de recursos"""
    return render_template('library.html')

@app.route('/configuracion')
def configuracion():
    """Página de configuración"""
    return render_template('config.html')

@app.route('/inicio')
def inicio():
    """Página principal después del login"""
    return render_template('index.html')

# ===== RUTAS DE PROCESAMIENTO DE ARCHIVOS =====

@app.route('/leer-archivo', methods=['POST'])
def leer_archivo():
    """Leer contenido de archivos subidos"""
    if 'file' not in request.files:
        return jsonify({'error': 'No se ha seleccionado ningún archivo'}), 400

    archivo = request.files['file']
    if archivo.filename == '':
        return jsonify({'error': 'Archivo vacío'}), 400

    filename = archivo.filename.lower()

    try:
        if filename.endswith('.txt'):
            contenido = archivo.read().decode('utf-8')

        elif filename.endswith('.pdf'):
            archivo.save("temp.pdf")
            reader = PdfReader("temp.pdf")
            contenido = ""
            for page in reader.pages:
                contenido += page.extract_text()
            os.remove("temp.pdf")

        elif filename.endswith('.docx'):
            archivo.save("temp.docx")
            contenido = docx2txt.process("temp.docx")
            os.remove("temp.docx")

        else:
            return jsonify({'error': 'Formato no soportado. Usa .txt, .pdf o .docx'}), 400

        return jsonify({
            'status': 'success',
            'nombre': archivo.filename, 
            'texto': contenido
        }), 200

    except Exception as e:
        return jsonify({'error': f'Error al leer el archivo: {e}'}), 500

# ===== RUTAS DE HEALTH CHECK =====

@app.route('/health')
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'database': 'connected' if get_db_connection() else 'disconnected'
    }), 200

# ===== INICIALIZACIÓN =====

if __name__ == '__main__':
    print("🚀 Iniciando aplicación Auris...")
    
    # Inicializar base de datos
    if init_database():
        print("✅ Base de datos inicializada correctamente")
    else:
        print("⚠️ Error al inicializar base de datos")
    
    port = int(os.environ.get("PORT", 5000))
    print(f"🌐 Servidor ejecutándose en puerto {port}")
    
    debug_mode = os.environ.get('FLASK_ENV') == 'development'
    app.run(host='0.0.0.0', port=port, debug=debug_mode)