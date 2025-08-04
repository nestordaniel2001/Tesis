#!/usr/bin/env python3
"""
app.py - Backend principal de Auris con Flask y MySQL
Sistema de autenticación con encriptación de contraseñas
"""

import os
import sys
import json
import mysql.connector
from datetime import datetime, timedelta
from flask import Flask, request, jsonify, render_template, send_from_directory, redirect
from flask_cors import CORS
import bcrypt
import jwt
import docx2txt
from PyPDF2 import PdfReader
from werkzeug.utils import secure_filename
from backend.routes.tts_routes import tts_bp
import base64
import requests

# Configuración de rutas
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
template_dir = os.path.join(project_root, 'frontend', 'templates')
static_dir = os.path.join(project_root, 'frontend', 'static')

# Crear la aplicación Flask
app = Flask(__name__,
            template_folder=template_dir,
            static_folder=static_dir)
CORS(app)

# Registrar blueprints
app.register_blueprint(tts_bp)

# Configurar clave secreta para sesiones
app.secret_key = os.environ.get('SECRET_KEY', 'auris-secret-key-2025')

# ===== CONFIGURACIÓN DE BASE DE DATOS MYSQL =====
DB_CONFIG = {
    'host': os.environ.get('DB_HOST', 'localhost'),
    'user': os.environ.get('DB_USER', 'root'),
    'password': os.environ.get('DB_PASSWORD', 'Auris2025.'),
    'database': os.environ.get('DB_NAME', 'Auris'),
    'charset': 'utf8mb4',
    'autocommit': True
}

# JWT Configuration
JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'auris-jwt-secret-2025')
JWT_ACCESS_TOKEN_EXPIRES = int(os.environ.get('JWT_ACCESS_TOKEN_EXPIRES', '86400'))

def get_db_connection():
    """Función para obtener conexión a MySQL"""
    try:
        connection = mysql.connector.connect(**DB_CONFIG)
        return connection
    except mysql.connector.Error as e:
        print(f"Error conectando a MySQL: {e}")
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
        
        # Crear tabla de usuarios (si no existe)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS Usuarios (
                id INT PRIMARY KEY AUTO_INCREMENT,
                nombre_usuario VARCHAR(50) NOT NULL UNIQUE,
                correo_electronico VARCHAR(50) NOT NULL UNIQUE,
                contraseña VARCHAR(255) NOT NULL,
                foto_perfil BLOB,
                creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        """)
        
        # Crear tabla de configuraciones de usuario (si no existe)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS Configuraciones_Usuario (
                id INT PRIMARY KEY AUTO_INCREMENT,
                usuario_id INT,
                nombre_configuracion VARCHAR(50) NOT NULL,
                valor_configuracion TEXT,
                actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (usuario_id) REFERENCES Usuarios(id) ON DELETE CASCADE
            )
        """)
        
        # Crear tabla de documentos (si no existe)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS Documentos (
                id INT PRIMARY KEY AUTO_INCREMENT,
                usuario_id INT,
                titulo VARCHAR(50) NOT NULL,
                contenido TEXT,
                archivo_audio BLOB,
                creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (usuario_id) REFERENCES Usuarios(id) ON DELETE CASCADE
            )
        """)
        
        connection.commit()
        print("✅ Base de datos MySQL inicializada correctamente")
        return True
        
    except mysql.connector.Error as e:
        print(f"Error inicializando base de datos: {e}")
        return False
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()

# ===== RUTAS DE PRUEBA =====

@app.route('/api/test-db')
def test_db():
    """Probar conexión a la base de datos"""
    connection = get_db_connection()
    if connection:
        connection.close()
        return jsonify({
            'status': 'success',
            'message': 'Conexión a MySQL exitosa',
            'database': DB_CONFIG['database']
        }), 200
    else:
        return jsonify({
            'status': 'error',
            'message': 'Error de conexión a MySQL'
        }), 500

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
        cursor.execute("SELECT id FROM Usuarios WHERE correo_electronico = %s OR nombre_usuario = %s", 
                        (correo_electronico, nombre_usuario))
        if cursor.fetchone():
            return jsonify({'error': 'El usuario o correo ya existe'}), 409
        
        # Encriptar contraseña
        hashed_password = bcrypt.hashpw(contraseña.encode('utf-8'), bcrypt.gensalt())
        
        # Insertar nuevo usuario
        cursor.execute("""
            INSERT INTO Usuarios (nombre_usuario, correo_electronico, contraseña) 
            VALUES (%s, %s, %s)
        """, (nombre_usuario, correo_electronico, hashed_password.decode('utf-8')))
        
        user_id = cursor.lastrowid
        
        # Crear configuraciones predeterminadas para el usuario
        default_configs = [
            ('tipo_voz', 'mujer'),
            ('velocidad_lectura', '1.0'),
            ('tamaño_fuente', 'medium'),
            ('contraste_alto', 'false'),
            ('retroalimentacion_audio', 'true')
        ]
        
        for config_name, config_value in default_configs:
            cursor.execute("""
                INSERT INTO Configuraciones_Usuario (usuario_id, nombre_configuracion, valor_configuracion) 
                VALUES (%s, %s, %s)
            """, (user_id, config_name, config_value))
        
        connection.commit()
        
        return jsonify({
            'status': 'success',
            'message': 'Usuario registrado exitosamente',
            'user_id': user_id
        }), 201
        
    except mysql.connector.Error as e:
        print(f"Error en registro: {e}")
        return jsonify({'error': f'Error de base de datos: {str(e)}'}), 500
    except Exception as e:
        print(f"Error general en registro: {e}")
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
            
        cursor = connection.cursor(dictionary=True)
        
        # Buscar usuario
        cursor.execute("SELECT * FROM Usuarios WHERE correo_electronico = %s", (correo_electronico,))
        usuario = cursor.fetchone()
        
        if not usuario:
            return jsonify({'error': 'Credenciales inválidas'}), 401
        
        # Verificar contraseña
        if not bcrypt.checkpw(contraseña.encode('utf-8'), usuario['contraseña'].encode('utf-8')):
            return jsonify({'error': 'Credenciales inválidas'}), 401
        
        # Generar JWT token
        payload = {
            'user_id': usuario['id'],
            'exp': datetime.utcnow() + timedelta(seconds=JWT_ACCESS_TOKEN_EXPIRES)
        }
        token = jwt.encode(payload, JWT_SECRET_KEY, algorithm='HS256')
        
        # Obtener configuraciones del usuario
        cursor.execute("SELECT nombre_configuracion, valor_configuracion FROM Configuraciones_Usuario WHERE usuario_id = %s", (usuario['id'],))
        configs = cursor.fetchall()
        
        # Convertir configuraciones a diccionario
        configuraciones = {}
        for config in configs:
            key = config['nombre_configuracion']
            value = config['valor_configuracion']
            
            # Convertir valores según el tipo
            if key in ['contraste_alto', 'retroalimentacion_audio']:
                configuraciones[key] = value.lower() == 'true'
            elif key == 'velocidad_lectura':
                configuraciones[key] = float(value)
            else:
                configuraciones[key] = value
        
        return jsonify({
            'status': 'success',
            'message': 'Login exitoso',
            'token': token,
            'usuario': {
                'id': usuario['id'],
                'nombre_usuario': usuario['nombre_usuario'],
                'correo_electronico': usuario['correo_electronico'],
                'foto_perfil': usuario['foto_perfil']
            },
            'configuraciones': configuraciones
        }), 200
        
    except mysql.connector.Error as e:
        print(f"Error en login: {e}")
        return jsonify({'error': f'Error de base de datos: {str(e)}'}), 500
    except Exception as e:
        print(f"Error general en login: {e}")
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
        print(f"🔐 Verificando autenticación para ruta: {request.endpoint}")
        
        token = request.headers.get('Authorization')
        print(f"📝 Token en headers: {token[:20] + '...' if token else 'None'}")
        
        if not token:
            print("❌ No se encontró token de autorización en headers")
            # Para rutas de páginas HTML, redirigir al login
            if request.endpoint in ['inicio', 'modo_visual', 'modo_auditivo', 'biblioteca', 'configuracion']:
                print("🔄 Redirigiendo a login desde ruta protegida")
                return redirect('/')
            else:
                return jsonify({'error': 'Token requerido'}), 401
        
        if token.startswith('Bearer '):
            token = token[7:]
        
        user_id = verify_token(token)
        if not user_id:
            print("❌ Token inválido o expirado")
            # Para rutas de páginas HTML, redirigir al login
            if request.endpoint in ['inicio', 'modo_visual', 'modo_auditivo', 'biblioteca', 'configuracion']:
                print("🔄 Redirigiendo a login por token inválido")
                return redirect('/')
            else:
                return jsonify({'error': 'Token inválido'}), 401
        
        print(f"✅ Usuario autenticado: {user_id}")
        request.user_id = user_id
        return f(*args, **kwargs)
    
    decorated_function.__name__ = f.__name__
    return decorated_function

# ===== RUTAS DE CONFIGURACIÓN DE USUARIO =====

@app.route('/api/documents', methods=['POST'])
@auth_required
def save_document():
    """Guardar documento del usuario"""
    data = request.json
    
    if not all(k in data for k in ('titulo', 'contenido')):
        return jsonify({'error': 'Faltan datos requeridos'}), 400
    
    titulo = data['titulo'].strip()
    contenido = data['contenido'].strip()
    
    if len(titulo) < 1:
        return jsonify({'error': 'El título no puede estar vacío'}), 400
    
    if len(titulo) > 50:
        return jsonify({'error': 'El título no puede exceder 50 caracteres'}), 400
    
    # Generar audio del contenido usando Edge TTS
    archivo_audio_blob = None
    nombre_archivo = None
    tipo_mime = 'audio/mpeg'
    
    try:
        # Obtener configuración del usuario para la voz
        cursor_config = connection.cursor(dictionary=True)
        cursor_config.execute("SELECT nombre_configuracion, valor_configuracion FROM Configuraciones_Usuario WHERE usuario_id = %s", (request.user_id,))
        configs = cursor_config.fetchall()
        cursor_config.close()
        
        # Convertir configuraciones a diccionario
        configuraciones = {}
        for config in configs:
            key = config['nombre_configuracion']
            value = config['valor_configuracion']
            if key in ['contraste_alto', 'retroalimentacion_audio']:
                configuraciones[key] = value.lower() == 'true'
            elif key == 'velocidad_lectura':
                configuraciones[key] = float(value)
            else:
                configuraciones[key] = value
        
        voice_type = configuraciones.get('tipo_voz', 'mujer')
        speed = configuraciones.get('velocidad_lectura', 1.0)
        
        # Llamar al endpoint de síntesis de voz
        tts_response = requests.post('http://localhost:5000/api/synthesize-speech', 
                                   json={
                                       'text': contenido,
                                       'voice_type': voice_type,
                                       'speed': speed
                                   })
        
        if tts_response.status_code == 200:
            tts_data = tts_response.json()
            if tts_data.get('success'):
                # Descargar el archivo de audio generado
                audio_url = tts_data['audio_url']
                if audio_url.startswith('/static/'):
                    # Es una URL local, leer el archivo
                    audio_file_path = os.path.join(project_root, 'frontend', audio_url.lstrip('/'))
                    if os.path.exists(audio_file_path):
                        with open(audio_file_path, 'rb') as audio_file:
                            archivo_audio_blob = audio_file.read()
                        nombre_archivo = f"documento_audio_{datetime.now().strftime('%Y%m%d_%H%M%S')}.mp3"
                        print(f"✅ Audio generado y leído: {len(archivo_audio_blob)} bytes")
                    else:
                        print(f"⚠️ Archivo de audio no encontrado: {audio_file_path}")
                else:
                    # Es una URL externa, descargar
                    audio_response = requests.get(audio_url)
                    if audio_response.status_code == 200:
                        archivo_audio_blob = audio_response.content
                        nombre_archivo = f"documento_audio_{datetime.now().strftime('%Y%m%d_%H%M%S')}.mp3"
                        print(f"✅ Audio descargado: {len(archivo_audio_blob)} bytes")
            else:
                print(f"⚠️ Error en síntesis TTS: {tts_data.get('error')}")
        else:
            print(f"⚠️ Error llamando a TTS: {tts_response.status_code}")
            
    except Exception as e:
        print(f"⚠️ Error generando audio: {e}")
        # Continuar sin audio si hay error
    
    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({'error': 'Error de conexión a la base de datos'}), 500
            
        cursor = connection.cursor()
        
        # Insertar documento
        cursor.execute("""
            INSERT INTO Documentos (usuario_id, titulo, contenido, archivo_audio, nombre_archivo, tipo_mime) 
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (request.user_id, titulo, contenido, archivo_audio_blob, nombre_archivo, tipo_mime))
        
        document_id = cursor.lastrowid
        connection.commit()
        
        audio_status = "con audio" if archivo_audio_blob else "sin audio"
        
        return jsonify({
            'status': 'success',
            'message': f'Documento guardado exitosamente {audio_status}',
            'document_id': document_id,
            'has_audio': archivo_audio_blob is not None
        }), 201
        
    except mysql.connector.Error as e:
        return jsonify({'error': f'Error de base de datos: {str(e)}'}), 500
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()

@app.route('/api/documents', methods=['GET'])
@auth_required
def get_user_documents():
    """Obtener documentos del usuario"""
    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({'error': 'Error de conexión a la base de datos'}), 500
            
        cursor = connection.cursor(dictionary=True)
        
        # Obtener documentos del usuario
        cursor.execute("""
            SELECT id, titulo, contenido, 
                   CASE WHEN archivo_audio IS NOT NULL THEN TRUE ELSE FALSE END as has_audio,
                   nombre_archivo, tipo_mime, creado_en, actualizado_en 
            FROM Documentos 
            WHERE usuario_id = %s 
            ORDER BY actualizado_en DESC
        """, (request.user_id,))
        
        documents = cursor.fetchall()
        
        # Convertir datetime a string para JSON
        for doc in documents:
            if doc['creado_en']:
                doc['creado_en'] = doc['creado_en'].isoformat()
            if doc['actualizado_en']:
                doc['actualizado_en'] = doc['actualizado_en'].isoformat()
        
        return jsonify({
            'status': 'success',
            'documents': documents
        }), 200
        
    except mysql.connector.Error as e:
        return jsonify({'error': f'Error de base de datos: {str(e)}'}), 500
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()

@app.route('/api/documents/<int:document_id>', methods=['GET'])
@auth_required
def get_document(document_id):
    """Obtener un documento específico"""
    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({'error': 'Error de conexión a la base de datos'}), 500
            
        cursor = connection.cursor(dictionary=True)
        
        # Obtener documento específico del usuario
        cursor.execute("""
            SELECT id, titulo, contenido, 
                   CASE WHEN archivo_audio IS NOT NULL THEN TRUE ELSE FALSE END as has_audio,
                   nombre_archivo, tipo_mime, creado_en, actualizado_en 
            FROM Documentos 
            WHERE id = %s AND usuario_id = %s
        """, (document_id, request.user_id))
        
        document = cursor.fetchone()
        
        if not document:
            return jsonify({'error': 'Documento no encontrado'}), 404
        
        # Convertir datetime a string para JSON
        if document['creado_en']:
            document['creado_en'] = document['creado_en'].isoformat()
        if document['actualizado_en']:
            document['actualizado_en'] = document['actualizado_en'].isoformat()
        
        return jsonify({
            'status': 'success',
            'document': document
        }), 200
        
    except mysql.connector.Error as e:
        return jsonify({'error': f'Error de base de datos: {str(e)}'}), 500
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()

@app.route('/api/documents/<int:document_id>', methods=['PUT'])
@auth_required
def update_document(document_id):
    """Actualizar documento del usuario"""
    data = request.json
    
    if not data:
        return jsonify({'error': 'No se proporcionaron datos'}), 400
    
    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({'error': 'Error de conexión a la base de datos'}), 500
            
        cursor = connection.cursor()
        
        # Verificar que el documento pertenece al usuario
        cursor.execute("SELECT id FROM Documentos WHERE id = %s AND usuario_id = %s", 
                        (document_id, request.user_id))
        if not cursor.fetchone():
            return jsonify({'error': 'Documento no encontrado'}), 404
        
        # Construir query de actualización dinámicamente
        update_fields = []
        values = []
        
        if 'titulo' in data:
            titulo = data['titulo'].strip()
            if len(titulo) < 1:
                return jsonify({'error': 'El título no puede estar vacío'}), 400
            if len(titulo) > 50:
                return jsonify({'error': 'El título no puede exceder 50 caracteres'}), 400
            update_fields.append("titulo = %s")
            values.append(titulo)
        
        if 'contenido' in data:
            update_fields.append("contenido = %s")
            values.append(data['contenido'])
        
        if 'archivo_audio' in data:
            update_fields.append("archivo_audio = %s")
            values.append(data['archivo_audio'])
        
        if not update_fields:
            return jsonify({'error': 'No hay campos para actualizar'}), 400
        
        values.append(document_id)
        values.append(request.user_id)
        
        query = f"UPDATE Documentos SET {', '.join(update_fields)} WHERE id = %s AND usuario_id = %s"
        cursor.execute(query, values)
        connection.commit()
        
        return jsonify({
            'status': 'success',
            'message': 'Documento actualizado exitosamente'
        }), 200
        
    except mysql.connector.Error as e:
        return jsonify({'error': f'Error de base de datos: {str(e)}'}), 500
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()

@app.route('/api/documents/<int:document_id>', methods=['DELETE'])
@auth_required
def delete_document(document_id):
    """Eliminar documento del usuario"""
    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({'error': 'Error de conexión a la base de datos'}), 500
            
        cursor = connection.cursor()
        
        # Verificar que el documento pertenece al usuario y eliminarlo
        cursor.execute("DELETE FROM Documentos WHERE id = %s AND usuario_id = %s", 
                      (document_id, request.user_id))
        
        if cursor.rowcount == 0:
            return jsonify({'error': 'Documento no encontrado'}), 404
        
        connection.commit()
        
        return jsonify({
            'status': 'success',
            'message': 'Documento eliminado exitosamente'
        }), 200
        
    except mysql.connector.Error as e:
        return jsonify({'error': f'Error de base de datos: {str(e)}'}), 500
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()

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
            
        cursor = connection.cursor(dictionary=True)
        
        # Obtener datos del usuario
        cursor.execute("SELECT id, nombre_usuario, correo_electronico, foto_perfil FROM Usuarios WHERE id = %s", (request.user_id,))
        usuario = cursor.fetchone()
        
        # Obtener configuraciones
        cursor.execute("SELECT nombre_configuracion, valor_configuracion FROM Configuraciones_Usuario WHERE usuario_id = %s", (request.user_id,))
        configs = cursor.fetchall()
        
        # Convertir configuraciones a diccionario
        configuraciones = {}
        for config in configs:
            key = config['nombre_configuracion']
            value = config['valor_configuracion']
            
            # Convertir valores según el tipo
            if key in ['contraste_alto', 'retroalimentacion_audio']:
                configuraciones[key] = value.lower() == 'true'
            elif key == 'velocidad_lectura':
                configuraciones[key] = float(value)
            else:
                configuraciones[key] = value
        
        return jsonify({
            'status': 'success',
            'usuario': usuario,
            'configuraciones': configuraciones
        }), 200
        
    except mysql.connector.Error as e:
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
        
        # Actualizar cada configuración
        for key, value in data.items():
            # Convertir valor a string para almacenar
            if isinstance(value, bool):
                str_value = 'true' if value else 'false'
            else:
                str_value = str(value)
            
            # Verificar si la configuración existe
            cursor.execute("SELECT id FROM Configuraciones_Usuario WHERE usuario_id = %s AND nombre_configuracion = %s", 
                          (request.user_id, key))
            
            if cursor.fetchone():
                # Actualizar configuración existente
                cursor.execute("""
                    UPDATE Configuraciones_Usuario 
                    SET valor_configuracion = %s 
                    WHERE usuario_id = %s AND nombre_configuracion = %s
                """, (str_value, request.user_id, key))
            else:
                # Crear nueva configuración
                cursor.execute("""
                    INSERT INTO Configuraciones_Usuario (usuario_id, nombre_configuracion, valor_configuracion) 
                    VALUES (%s, %s, %s)
                """, (request.user_id, key, str_value))
        
        connection.commit()
        
        return jsonify({
            'status': 'success',
            'message': 'Configuración actualizada exitosamente'
        }), 200
        
    except mysql.connector.Error as e:
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
    connection = get_db_connection()
    db_status = 'connected' if connection else 'disconnected'
    if connection:
        connection.close()
    
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'database': db_status
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