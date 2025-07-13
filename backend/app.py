import sys
import os
import json
from flask import Flask, request, jsonify, render_template, session, send_from_directory
from flask_cors import CORS
import mysql.connector
from mysql.connector import Error
import nltk
import pyttsx3
import requests
import docx2txt
from PyPDF2 import PdfReader
import hashlib

# Configuración básica para NLTK
try:
    nltk.data.find('tokenizers/punkt')
    nltk.data.find('corpora/stopwords')
except LookupError:
    try:
        nltk.download(['punkt', 'stopwords'], quiet=True)
    except Exception as e:
        print(f"Advertencia: No se pudieron descargar los datos de NLTK: {e}")

# Configuración para pyttsx3
engine = None
try:
    engine = pyttsx3.init()
except Exception as e:
    print(f"Advertencia: pyttsx3 no disponible: {e}")
    engine = None

# Configuración de rutas del proyecto
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

# ===== CONFIGURACIÓN DE MYSQL =====
DB_CONFIG = {
    'host': os.environ.get('DB_HOST', 'localhost'),
    'user': os.environ.get('DB_USER', 'root'),
    'password': os.environ.get('DB_PASSWORD', 'Auris2025.'),
    'database': os.environ.get('DB_NAME', 'Auris'),
    'port': int(os.environ.get('DB_PORT', '3306')),
    'charset': 'utf8mb4',
    'autocommit': True,
    'connect_timeout': 10,
    'sql_mode': 'TRADITIONAL'
}

def get_db_connection():
    """Obtener conexión a MySQL"""
    try:
        connection = mysql.connector.connect(**DB_CONFIG)
        if connection.is_connected():
            return connection
        else:
            print("Error: Conexión no establecida")
            return None
    except Error as e:
        print(f"Error conectando a MySQL: {e}")
        return None
    except Exception as e:
        print(f"Error inesperado conectando a BD: {e}")
        return None

def test_database_connection():
    """Verificar la conexión a la base de datos"""
    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        if connection and connection.is_connected():
            cursor = connection.cursor()
            cursor.execute("SELECT VERSION(), DATABASE()")
            result = cursor.fetchone()
            return True, f"Conexión exitosa a MySQL. Versión: {result[0]}, BD: {result[1]}"
        else:
            return False, "No se pudo establecer conexión"
    except Error as e:
        return False, f"Error de conexión: {str(e)}"
    except Exception as e:
        return False, f"Error inesperado: {str(e)}"
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()

# ===== RUTAS DE NAVEGACIÓN =====

@app.route('/')
def index():
    """Página de ingreso"""
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
def login():
    """Página de login"""
    return render_template('index.html')

# ===== RUTAS DE API - BASE DE DATOS =====

@app.route('/api/test-db')
def test_db_connection():
    """Endpoint para verificar la conexión a la base de datos"""
    success, message = test_database_connection()
    
    if success:
        return jsonify({
            'status': 'success',
            'message': message,
            'database_info': {
                'host': DB_CONFIG['host'],
                'database': DB_CONFIG['database'],
                'port': DB_CONFIG['port'],
                'user': DB_CONFIG['user']
            }
        }), 200
    else:
        return jsonify({
            'status': 'error',
            'message': message
        }), 500

@app.route('/api/usuarios', methods=['GET'])
def get_usuarios():
    """Obtener todos los usuarios"""
    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        if connection:
            cursor = connection.cursor(dictionary=True)
            cursor.execute("SELECT id, nombre_usuario, correo_electronico, creado_en, actualizado_en FROM Usuarios")
            usuarios = cursor.fetchall()
            return jsonify({
                'status': 'success',
                'usuarios': usuarios,
                'count': len(usuarios)
            }), 200
        else:
            return jsonify({
                'status': 'error',
                'message': 'No se pudo conectar a la base de datos'
            }), 500
    except Error as e:
        return jsonify({'error': f'Error MySQL: {str(e)}'}), 500
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()

@app.route('/api/usuarios', methods=['POST'])
def create_usuario():
    """Crear un nuevo usuario"""
    data = request.json
    
    if not data or not data.get('nombre_usuario') or not data.get('correo_electronico') or not data.get('contraseña'):
        return jsonify({'error': 'Nombre de usuario, correo y contraseña son requeridos'}), 400
    
    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        if connection:
            cursor = connection.cursor()
            
            # Verificar si el usuario o email ya existe
            cursor.execute("SELECT id FROM Usuarios WHERE nombre_usuario = %s OR correo_electronico = %s", 
                            (data['nombre_usuario'], data['correo_electronico']))
            if cursor.fetchone():
                return jsonify({'error': 'El nombre de usuario o correo ya está registrado'}), 409
            
            # Hash de la contraseña (básico, en producción usar bcrypt)
            password_hash = hashlib.sha256(data['contraseña'].encode()).hexdigest()
            
            # Insertar nuevo usuario
            query = """
                INSERT INTO Usuarios (nombre_usuario, correo_electronico, contraseña, foto_perfil) 
                VALUES (%s, %s, %s, %s)
            """
            values = (
                data['nombre_usuario'],
                data['correo_electronico'],
                password_hash,
                data.get('foto_perfil', None)
            )
            cursor.execute(query, values)
            user_id = cursor.lastrowid
            
            connection.commit()
            
            return jsonify({
                'status': 'success',
                'message': 'Usuario creado exitosamente',
                'user_id': user_id
            }), 201
        else:
            return jsonify({'error': 'No se pudo conectar a la base de datos'}), 500
    except Error as e:
        return jsonify({'error': f'Error MySQL: {str(e)}'}), 500
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()

@app.route('/api/usuarios/<int:user_id>', methods=['GET'])
def get_usuario(user_id):
    """Obtener un usuario específico"""
    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        if connection:
            cursor = connection.cursor(dictionary=True)
            cursor.execute("SELECT id, nombre_usuario, correo_electronico, creado_en, actualizado_en FROM Usuarios WHERE id = %s", (user_id,))
            usuario = cursor.fetchone()
            
            if usuario:
                return jsonify({
                    'status': 'success',
                    'usuario': usuario
                }), 200
            else:
                return jsonify({'error': 'Usuario no encontrado'}), 404
        else:
            return jsonify({'error': 'No se pudo conectar a la base de datos'}), 500
    except Error as e:
        return jsonify({'error': f'Error MySQL: {str(e)}'}), 500
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()

@app.route('/api/usuarios/<int:user_id>', methods=['PUT'])
def update_usuario(user_id):
    """Actualizar un usuario"""
    data = request.json
    
    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        if connection:
            cursor = connection.cursor()
            
            # Construir query dinámicamente según los campos proporcionados
            campos = []
            valores = []
            
            if 'nombre_usuario' in data:
                campos.append('nombre_usuario = %s')
                valores.append(data['nombre_usuario'])
            
            if 'correo_electronico' in data:
                campos.append('correo_electronico = %s')
                valores.append(data['correo_electronico'])
            
            if 'contraseña' in data:
                campos.append('contraseña = %s')
                valores.append(hashlib.sha256(data['contraseña'].encode()).hexdigest())
            
            if 'foto_perfil' in data:
                campos.append('foto_perfil = %s')
                valores.append(data['foto_perfil'])
            
            if not campos:
                return jsonify({'error': 'No se proporcionaron campos para actualizar'}), 400
            
            valores.append(user_id)
            query = f"UPDATE Usuarios SET {', '.join(campos)} WHERE id = %s"
            cursor.execute(query, valores)
            
            if cursor.rowcount > 0:
                return jsonify({
                    'status': 'success',
                    'message': 'Usuario actualizado correctamente'
                }), 200
            else:
                return jsonify({'error': 'Usuario no encontrado'}), 404
        else:
            return jsonify({'error': 'No se pudo conectar a la base de datos'}), 500
    except Error as e:
        return jsonify({'error': f'Error MySQL: {str(e)}'}), 500
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()

@app.route('/api/usuarios/<int:user_id>', methods=['DELETE'])
def delete_usuario(user_id):
    """Eliminar un usuario"""
    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        if connection:
            cursor = connection.cursor()
            cursor.execute("DELETE FROM Usuarios WHERE id = %s", (user_id,))
            
            if cursor.rowcount > 0:
                return jsonify({
                    'status': 'success',
                    'message': 'Usuario eliminado correctamente'
                }), 200
            else:
                return jsonify({'error': 'Usuario no encontrado'}), 404
        else:
            return jsonify({'error': 'No se pudo conectar a la base de datos'}), 500
    except Error as e:
        return jsonify({'error': f'Error MySQL: {str(e)}'}), 500
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()

@app.route('/api/documentos', methods=['GET'])
def get_documentos():
    """Obtener todos los documentos o los de un usuario específico"""
    user_id = request.args.get('usuario_id')
    
    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        if connection:
            cursor = connection.cursor(dictionary=True)
            
            if user_id:
                cursor.execute("""
                    SELECT d.*, u.nombre_usuario 
                    FROM Documentos d 
                    JOIN Usuarios u ON d.usuario_id = u.id 
                    WHERE d.usuario_id = %s 
                    ORDER BY d.creado_en DESC
                """, (user_id,))
            else:
                cursor.execute("""
                    SELECT d.*, u.nombre_usuario 
                    FROM Documentos d 
                    JOIN Usuarios u ON d.usuario_id = u.id 
                    ORDER BY d.creado_en DESC
                """)
            
            documentos = cursor.fetchall()
            return jsonify({
                'status': 'success',
                'documentos': documentos,
                'count': len(documentos)
            }), 200
        else:
            return jsonify({'error': 'No se pudo conectar a la base de datos'}), 500
    except Error as e:
        return jsonify({'error': f'Error MySQL: {str(e)}'}), 500
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()

@app.route('/api/documentos', methods=['POST'])
def create_documento():
    """Crear un nuevo documento"""
    data = request.json
    
    if not data or not data.get('titulo') or not data.get('usuario_id'):
        return jsonify({'error': 'Título y usuario_id son requeridos'}), 400
    
    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        if connection:
            cursor = connection.cursor()
            
            # Verificar que el usuario existe
            cursor.execute("SELECT id FROM Usuarios WHERE id = %s", (data['usuario_id'],))
            if not cursor.fetchone():
                return jsonify({'error': 'Usuario no encontrado'}), 404
            
            # Insertar nuevo documento
            query = """
                INSERT INTO Documentos (usuario_id, titulo, contenido, archivo_audio) 
                VALUES (%s, %s, %s, %s)
            """
            values = (
                data['usuario_id'],
                data['titulo'],
                data.get('contenido', ''),
                data.get('archivo_audio', None)
            )
            cursor.execute(query, values)
            documento_id = cursor.lastrowid
            
            connection.commit()
            
            return jsonify({
                'status': 'success',
                'message': 'Documento creado exitosamente',
                'documento_id': documento_id
            }), 201
        else:
            return jsonify({'error': 'No se pudo conectar a la base de datos'}), 500
    except Error as e:
        return jsonify({'error': f'Error MySQL: {str(e)}'}), 500
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()

@app.route('/api/configuraciones/<int:user_id>', methods=['GET'])
def get_configuraciones(user_id):
    """Obtener configuraciones de un usuario"""
    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        if connection:
            cursor = connection.cursor(dictionary=True)
            cursor.execute("SELECT * FROM Configuraciones_Usuario WHERE usuario_id = %s", (user_id,))
            configuraciones = cursor.fetchall()
            
            return jsonify({
                'status': 'success',
                'configuraciones': configuraciones,
                'count': len(configuraciones)
            }), 200
        else:
            return jsonify({'error': 'No se pudo conectar a la base de datos'}), 500
    except Error as e:
        return jsonify({'error': f'Error MySQL: {str(e)}'}), 500
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()

@app.route('/api/configuraciones', methods=['POST'])
def create_configuracion():
    """Crear o actualizar una configuración de usuario"""
    data = request.json
    
    if not data or not data.get('usuario_id') or not data.get('nombre_configuracion'):
        return jsonify({'error': 'usuario_id y nombre_configuracion son requeridos'}), 400
    
    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        if connection:
            cursor = connection.cursor()
            
            # Verificar si la configuración ya existe
            cursor.execute("""
                SELECT id FROM Configuraciones_Usuario 
                WHERE usuario_id = %s AND nombre_configuracion = %s
            """, (data['usuario_id'], data['nombre_configuracion']))
            
            if cursor.fetchone():
                # Actualizar configuración existente
                cursor.execute("""
                    UPDATE Configuraciones_Usuario 
                    SET valor_configuracion = %s 
                    WHERE usuario_id = %s AND nombre_configuracion = %s
                """, (data.get('valor_configuracion', ''), data['usuario_id'], data['nombre_configuracion']))
                
                return jsonify({
                    'status': 'success',
                    'message': 'Configuración actualizada exitosamente'
                }), 200
            else:
                # Crear nueva configuración
                cursor.execute("""
                    INSERT INTO Configuraciones_Usuario (usuario_id, nombre_configuracion, valor_configuracion)
                    VALUES (%s, %s, %s)
                """, (data['usuario_id'], data['nombre_configuracion'], data.get('valor_configuracion', '')))
                
                return jsonify({
                    'status': 'success',
                    'message': 'Configuración creada exitosamente',
                    'configuracion_id': cursor.lastrowid
                }), 201
        else:
            return jsonify({'error': 'No se pudo conectar a la base de datos'}), 500
    except Error as e:
        return jsonify({'error': f'Error MySQL: {str(e)}'}), 500
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()

@app.route('/api/audio-texto', methods=['GET'])
def get_audio_texto():
    """Obtener transcripciones de audio de un usuario"""
    user_id = request.args.get('usuario_id')
    
    if not user_id:
        return jsonify({'error': 'usuario_id es requerido'}), 400
    
    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        if connection:
            cursor = connection.cursor(dictionary=True)
            cursor.execute("""
                SELECT a.*, u.nombre_usuario 
                FROM Audio_a_Texto a 
                JOIN Usuarios u ON a.usuario_id = u.id 
                WHERE a.usuario_id = %s 
                ORDER BY a.creado_en DESC
            """, (user_id,))
            
            transcripciones = cursor.fetchall()
            return jsonify({
                'status': 'success',
                'transcripciones': transcripciones,
                'count': len(transcripciones)
            }), 200
        else:
            return jsonify({'error': 'No se pudo conectar a la base de datos'}), 500
    except Error as e:
        return jsonify({'error': f'Error MySQL: {str(e)}'}), 500
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()

@app.route('/api/audio-texto', methods=['POST'])
def create_audio_texto():
    """Crear una nueva transcripción de audio"""
    data = request.json
    
    if not data or not data.get('usuario_id') or not data.get('archivo_audio'):
        return jsonify({'error': 'usuario_id y archivo_audio son requeridos'}), 400
    
    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        if connection:
            cursor = connection.cursor()
            
            # Verificar que el usuario existe
            cursor.execute("SELECT id FROM Usuarios WHERE id = %s", (data['usuario_id'],))
            if not cursor.fetchone():
                return jsonify({'error': 'Usuario no encontrado'}), 404
            
            # Insertar nueva transcripción
            query = """
                INSERT INTO Audio_a_Texto (usuario_id, archivo_audio, texto_transcrito) 
                VALUES (%s, %s, %s)
            """
            values = (
                data['usuario_id'],
                data['archivo_audio'],
                data.get('texto_transcrito', '')
            )
            cursor.execute(query, values)
            transcripcion_id = cursor.lastrowid
            
            connection.commit()
            
            return jsonify({
                'status': 'success',
                'message': 'Transcripción creada exitosamente',
                'transcripcion_id': transcripcion_id
            }), 201
        else:
            return jsonify({'error': 'No se pudo conectar a la base de datos'}), 500
    except Error as e:
        return jsonify({'error': f'Error MySQL: {str(e)}'}), 500
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()

# ===== RUTAS DE PROCESAMIENTO =====

@app.route('/leer-archivo', methods=['POST'])
def leer_archivo():
    """Leer y procesar archivos subidos"""
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

        return jsonify({'nombre': archivo.filename, 'texto': contenido})

    except Exception as e:
        return jsonify({'error': f'Error al leer el archivo: {e}'}), 500

@app.route('/api/speech-to-text', methods=['POST'])
def speech_to_text():
    """Convertir audio a texto"""
    if 'audio' not in request.files:
        return jsonify({'error': 'No audio file provided'}), 400
    
    audio_file = request.files['audio']
    user_preferences = json.loads(request.form.get('preferences', '{}'))
    
    try:
        # Aquí implementarías la lógica de reconocimiento de voz
        text = "Funcionalidad de reconocimiento de voz pendiente de implementar"
        return jsonify({'text': text}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/text-to-speech', methods=['POST'])
def text_to_speech_endpoint():
    """Convertir texto a audio"""
    data = request.json
    if 'text' not in data:
        return jsonify({'error': 'No text provided'}), 400
    
    text = data['text']
    voice_type = data.get('voice_type', 'default')
    speed = data.get('speed', 1.0)
    
    try:
        # Aquí implementarías la lógica de text-to-speech
        audio_path = "/static/audio/placeholder.mp3"
        return jsonify({'audio_url': audio_path}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/process-text', methods=['POST'])
def process_text():
    """Procesar texto (simplificar, resumir, etc.)"""
    data = request.json
    if 'text' not in data:
        return jsonify({'error': 'No text provided'}), 400
    
    text = data['text']
    operation = data.get('operation', 'simplify')
    
    try:
        # Aquí implementarías la lógica de procesamiento de texto
        result = f"Texto procesado con operación '{operation}': {text[:100]}..."
        return jsonify({'result': result}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/describe-image', methods=['POST'])
def describe_image():
    """Describir una imagen para usuarios con discapacidad visual"""
    if 'image' not in request.files:
        return jsonify({'error': 'No image file provided'}), 400
    
    image_file = request.files['image']
    detail_level = request.form.get('detail_level', 'medium')
    
    try:
        # Aquí implementarías la lógica de descripción de imágenes
        description = "Funcionalidad de descripción de imágenes pendiente de implementar"
        return jsonify({'description': description}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ===== HEALTH CHECK =====

@app.route('/health')
def health_check():
    """Health check endpoint"""
    db_status = 'connected' if test_database_connection()[0] else 'disconnected'
    return jsonify({
        'status': 'healthy',
        'database': db_status,
        'timestamp': '2025-07-12'
    }), 200

# ===== INICIALIZACIÓN =====

if __name__ == '__main__':
    print("🚀 Iniciando aplicación Auris...")
    
    # Verificar conexión a la base de datos existente
    success, message = test_database_connection()
    if success:
        print(f"✅ {message}")
    else:
        print(f"❌ {message}")
        print("Verifica que la base de datos 'Auris' existe y las credenciales son correctas")
    
    # Iniciar servidor
    port = int(os.environ.get("PORT", 5000))
    print(f"🌐 Servidor ejecutándose en puerto {port}")
    
    app.run(host='0.0.0.0', port=port, debug=True)