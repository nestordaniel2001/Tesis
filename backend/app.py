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

# Configuración para NLTK en Render
try:
    nltk_data_path = "/opt/render/project/src/nltk_data"
    os.makedirs(nltk_data_path, exist_ok=True)
    nltk.data.path.append(nltk_data_path)
    
    # Intentar descargar paquetes NLTK solo si no existen
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

# Configuración segura para pyttsx3 en Render (servidor sin audio)
engine = None
try:
    # En Render no hay sistema de audio, usar dummy driver
    engine = pyttsx3.init(driverName='dummy')
except Exception as e:
    print(f"Advertencia: pyttsx3 no disponible en servidor: {e}")
    engine = None

# Añadir la carpeta raíz del proyecto al PYTHONPATH (opcional)
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if project_root not in sys.path:
    sys.path.append(project_root)

# Usa la raíz del proyecto como referencia
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))

# Construir las rutas absolutas
template_dir = os.path.join(project_root, 'frontend', 'templates')
static_dir = os.path.join(project_root, 'frontend', 'static')

# Crear la aplicación Flask con rutas absolutas
app = Flask(__name__,
            template_folder=template_dir,
            static_folder=static_dir)
CORS(app)

# Configurar clave secreta para sesiones
app.secret_key = os.environ.get('SECRET_KEY', 'auris-secret-key-2025')

# ===== CONFIGURACIÓN DE CONEXIÓN MYSQL =====
# Configuración más robusta para diferentes entornos
DB_CONFIG = {
    'host': os.environ.get('DB_HOST'),
    'user': os.environ.get('DB_USER'),
    'password': os.environ.get('DB_PASSWORD'),
    'database': os.environ.get('DB_NAME'),
    'port': int(os.environ.get('DB_PORT', '3306')),
    'charset': 'utf8mb4',
    'autocommit': True,
    'connect_timeout': 10,
    'sql_mode': 'TRADITIONAL'
}

# Verificar si todas las variables de entorno están configuradas
DB_AVAILABLE = all([
    os.environ.get('DB_HOST'),
    os.environ.get('DB_USER'),
    os.environ.get('DB_PASSWORD'),
    os.environ.get('DB_NAME')
])

def get_db_connection():
    """Función para obtener conexión a MySQL con manejo de errores mejorado"""
    if not DB_AVAILABLE:
        print("Advertencia: Variables de entorno de base de datos no configuradas")
        return None
        
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
    """Función para verificar la conexión a la base de datos"""
    if not DB_AVAILABLE:
        return False, "Variables de entorno de base de datos no configuradas"
        
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

# ===== RUTAS PARA VERIFICAR CONEXIÓN =====
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
            'message': message,
            'db_available': DB_AVAILABLE
        }), 500

@app.route('/api/db-tables')
def get_tables():
    """Endpoint para ver las tablas existentes"""
    if not DB_AVAILABLE:
        return jsonify({
            'status': 'error',
            'message': 'Base de datos no configurada'
        }), 500
        
    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        if connection and connection.is_connected():
            cursor = connection.cursor()
            cursor.execute("SHOW TABLES")
            tables = cursor.fetchall()
            table_list = [table[0] for table in tables] if tables else []
            
            return jsonify({
                'status': 'success',
                'tables': table_list,
                'count': len(table_list)
            }), 200
        else:
            return jsonify({
                'status': 'error',
                'message': 'No se pudo conectar a la base de datos'
            }), 500
    except Error as e:
        return jsonify({
            'status': 'error',
            'message': f'Error: {str(e)}'
        }), 500
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()

# Importaciones locales del proyecto (con manejo de errores)
try:
    from models.speech_recognition import SpeechRecognizer
    from models.text_to_speech import TextToSpeech
    from models.text_processing import TextProcessor
    from utils.accessibility import create_accessible_response
    from utils.config import Config
    
    # Inicializar configuración
    config = Config()
    
    # Inicializar modelos
    speech_recognizer = SpeechRecognizer()
    text_to_speech = TextToSpeech()
    text_processor = TextProcessor()
    
    print("✅ Módulos del proyecto cargados correctamente")
except ImportError as e:
    print(f"⚠️ Advertencia: No se pudieron importar algunos módulos: {e}")
    print("La aplicación continuará con funcionalidad básica")
except Exception as e:
    print(f"⚠️ Error cargando módulos: {e}")

# ===== RUTAS DE NAVEGACIÓN PRINCIPAL =====

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

@app.route('/leer-archivo', methods=['POST'])
def leer_archivo():
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
            archivo.save("temp.pdf")  # Guardamos temporalmente
            reader = PdfReader("temp.pdf")
            contenido = ""
            for page in reader.pages:
                contenido += page.extract_text()
            os.remove("temp.pdf")  # Limpiamos el archivo temporal

        elif filename.endswith('.docx'):
            archivo.save("temp.docx")
            contenido = docx2txt.process("temp.docx")
            os.remove("temp.docx")

        else:
            return jsonify({'error': 'Formato no soportado. Usa .txt, .pdf o .docx'}), 400

        return jsonify({'nombre': archivo.filename, 'texto': contenido})

    except Exception as e:
        return jsonify({'error': f'Error al leer el archivo: {e}'}), 500

# ===== RUTAS DE API CON MYSQL (con fallback si no hay BD) =====

@app.route('/api/users', methods=['GET'])
def get_users():
    """Endpoint para obtener usuarios desde MySQL"""
    if not DB_AVAILABLE:
        return jsonify({
            'status': 'warning',
            'message': 'Base de datos no disponible',
            'users': [],
            'count': 0
        }), 200
        
    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        if connection:
            cursor = connection.cursor(dictionary=True)
            cursor.execute("SELECT * FROM users")
            users = cursor.fetchall()
            return jsonify({
                'status': 'success',
                'users': users,
                'count': len(users)
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

@app.route('/api/save-preferences', methods=['POST'])
def save_preferences():
    """Endpoint para guardar las preferencias de accesibilidad del usuario"""
    data = request.json
    user_id = data.get('user_id', 1)
    preferences_data = data.get('preferences', {})
    
    if not DB_AVAILABLE:
        return jsonify({
            'status': 'warning',
            'message': 'Preferencias guardadas localmente (BD no disponible)'
        }), 200
    
    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        if connection:
            cursor = connection.cursor()
            query = "UPDATE user_preferences SET voice_type=%s, speech_speed=%s WHERE user_id=%s"
            values = (
                preferences_data.get('voice_type', 'default'),
                preferences_data.get('speech_speed', 1.0),
                user_id
            )
            cursor.execute(query, values)
            return jsonify({'status': 'success', 'message': 'Preferencias guardadas'}), 200
        else:
            return jsonify({'error': 'No se pudo conectar a la base de datos'}), 500
    except Error as e:
        return jsonify({'error': f'Error MySQL: {str(e)}'}), 500
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()

@app.route('/api/get-preferences', methods=['GET'])
def get_preferences():
    """Endpoint para obtener las preferencias de accesibilidad del usuario"""
    user_id = request.args.get('user_id', 1, type=int)
    
    if not DB_AVAILABLE:
        return jsonify({
            'status': 'warning',
            'message': 'BD no disponible, usando preferencias por defecto',
            'preferences': {
                'voice_type': 'default',
                'speech_speed': 1.0
            }
        }), 200
    
    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        if connection:
            cursor = connection.cursor(dictionary=True)
            cursor.execute("SELECT * FROM user_preferences WHERE user_id = %s", (user_id,))
            preferences = cursor.fetchone()
            
            if preferences:
                return jsonify({
                    'status': 'success',
                    'preferences': preferences
                }), 200
            else:
                return jsonify({
                    'status': 'success',
                    'message': 'No se encontraron preferencias para este usuario'
                }), 404
        else:
            return jsonify({'error': 'No se pudo conectar a la base de datos'}), 500
    except Error as e:
        return jsonify({'error': f'Error MySQL: {str(e)}'}), 500
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()

# ===== RUTAS DE API ORIGINALES (mantenidas para compatibilidad) =====

@app.route('/api/speech-to-text', methods=['POST'])
def speech_to_text():
    """Endpoint para convertir audio a texto"""
    if 'audio' not in request.files:
        return jsonify({'error': 'No audio file provided'}), 400
    
    audio_file = request.files['audio']
    user_preferences = json.loads(request.form.get('preferences', '{}'))
    
    try:
        if 'speech_recognizer' in globals():
            text = speech_recognizer.recognize(audio_file)
        else:
            text = "Funcionalidad de reconocimiento de voz no disponible"
        return jsonify({'text': text}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/text-to-speech', methods=['POST'])
def text_to_speech_endpoint():
    """Endpoint para convertir texto a audio"""
    data = request.json
    if 'text' not in data:
        return jsonify({'error': 'No text provided'}), 400
    
    text = data['text']
    voice_type = data.get('voice_type', 'default')
    speed = data.get('speed', 1.0)
    
    try:
        if 'text_to_speech' in globals():
            audio_path = text_to_speech.synthesize(text, voice_type, speed)
        else:
            audio_path = "/static/audio/placeholder.mp3"
        return jsonify({'audio_url': audio_path}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/process-text', methods=['POST'])
def process_text():
    """Endpoint para procesar texto (simplificar, resumir, etc.)"""
    data = request.json
    if 'text' not in data:
        return jsonify({'error': 'No text provided'}), 400
    
    text = data['text']
    operation = data.get('operation', 'simplify')
    
    try:
        if 'text_processor' in globals():
            result = text_processor.process(text, operation)
        else:
            result = f"Texto procesado: {text[:100]}..."
        return jsonify({'result': result}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/describe-image', methods=['POST'])
def describe_image():
    """Endpoint para describir una imagen para usuarios con discapacidad visual"""
    if 'image' not in request.files:
        return jsonify({'error': 'No image file provided'}), 400
    
    image_file = request.files['image']
    detail_level = request.form.get('detail_level', 'medium')
    
    try:
        description = "Esta es una descripción de la imagen cargada."
        return jsonify({'description': description}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/accessibility/response', methods=['POST'])
def get_accessible_response():
    """Endpoint para obtener respuestas en formato accesible"""
    data = request.json
    content = data.get('content', '')
    format_type = data.get('format', 'text')
    user_preferences = data.get('preferences', {})
    
    try:
        if 'create_accessible_response' in globals():
            response = create_accessible_response(content, format_type, user_preferences)
        else:
            response = {'content': content, 'format': format_type}
        return jsonify(response), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/favorites', methods=['GET', 'POST', 'DELETE'])
def manage_favorites():
    """Endpoint para gestionar los favoritos del usuario"""
    user_id = request.args.get('user_id', 1)
    
    if request.method == 'GET':
        try:
            favorites = [
                {
                    'id': '1',
                    'title': 'Guía de accesibilidad',
                    'type': 'document',
                    'saved_date': '2025-05-15T08:30:00'
                },
                {
                    'id': '2',
                    'title': 'Transcripción importante',
                    'type': 'transcription',
                    'saved_date': '2025-05-12T14:20:00'
                }
            ]
            return jsonify({'favorites': favorites}), 200
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    
    elif request.method == 'POST':
        data = request.json
        item_id = data.get('item_id')
        item_type = data.get('type')
        
        try:
            return jsonify({'success': True, 'message': 'Añadido a favoritos'}), 200
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    
    elif request.method == 'DELETE':
        item_id = request.args.get('item_id')
        
        try:
            return jsonify({'success': True, 'message': 'Eliminado de favoritos'}), 200
        except Exception as e:
            return jsonify({'error': str(e)}), 500

# Ruta de health check para Render
@app.route('/health')
def health_check():
    """Health check endpoint para Render"""
    return jsonify({
        'status': 'healthy',
        'timestamp': str(os.environ.get('RENDER_SERVICE_NAME', 'local')),
        'database': 'connected' if DB_AVAILABLE else 'not_configured'
    }), 200

# === INICIALIZACIÓN ===
if __name__ == '__main__':
    print("🚀 Iniciando aplicación Auris...")
    
    # Verificar conexión BD solo si está configurada
    if DB_AVAILABLE:
        success, message = test_database_connection()
        if success:
            print(f"✅ {message}")
        else:
            print(f"⚠️ {message}")
    else:
        print("⚠️ Base de datos no configurada - funcionando en modo básico")
    
    port = int(os.environ.get("PORT", 5000))
    print(f"🌐 Servidor ejecutándose en puerto {port}")
    
    # En producción (Render) no usar debug=True
    debug_mode = os.environ.get('FLASK_ENV') == 'development'
    app.run(host='0.0.0.0', port=port, debug=debug_mode)