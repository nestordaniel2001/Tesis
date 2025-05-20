import sys
import os

# Añadir la carpeta raíz del proyecto al PYTHONPATH
sys.path.append(os.path.abspath("."))

# Importaciones principales
from flask import Flask, request, jsonify, render_template, session
from flask_cors import CORS
import os

# Obtener la ruta absoluta del directorio actual (donde está app.py)
basedir = os.path.abspath(os.path.dirname(__file__))

# Construir las rutas absolutas
template_dir = os.path.join(basedir, '..', 'frontend', 'templates')
static_dir = os.path.join(basedir, '..', 'frontend', 'static')

# Crear la aplicación Flask con rutas absolutas
app = Flask(__name__,
            template_folder=template_dir,
            static_folder=static_dir)
CORS(app)

import json

# Importaciones locales del proyecto
from backend.models.speech_recognition import SpeechRecognizer
from backend.models.text_to_speech import TextToSpeech
from backend.models.text_processing import TextProcessor
from backend.utils.accessibility import create_accessible_response
from backend.utils.config import Config

# Inicializar configuración
config = Config()

# Inicializar modelos
speech_recognizer = SpeechRecognizer()
text_to_speech = TextToSpeech()
text_processor = TextProcessor()

# ===== RUTAS DE NAVEGACIÓN PRINCIPAL =====

@app.route('/')
def index():
    """Página principal de Auris"""
    return render_template('index.html')

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

# ===== RUTAS DE API =====

@app.route('/api/speech-to-text', methods=['POST'])
def speech_to_text():
    """Endpoint para convertir audio a texto"""
    if 'audio' not in request.files:
        return jsonify({'error': 'No audio file provided'}), 400
    
    audio_file = request.files['audio']
    user_preferences = json.loads(request.form.get('preferences', '{}'))
    
    try:
        text = speech_recognizer.recognize(audio_file)
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
        audio_path = text_to_speech.synthesize(text, voice_type, speed)
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
        result = text_processor.process(text, operation)
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
        # Aquí iría la lógica para describir la imagen
        # Por ahora devolvemos un placeholder
        description = "Esta es una descripción de la imagen cargada."
        return jsonify({'description': description}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/save-preferences', methods=['POST'])
def save_preferences():
    """Endpoint para guardar las preferencias de accesibilidad del usuario"""
    data = request.json
    user_id = data.get('user_id', 'anonymous')
    preferences = data.get('preferences', {})
    
    try:
        # Guardar preferencias en un archivo o base de datos
        config.save_user_preferences(user_id, preferences)
        return jsonify({'success': True}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/get-preferences', methods=['GET'])
def get_preferences():
    """Endpoint para obtener las preferencias de accesibilidad del usuario"""
    user_id = request.args.get('user_id', 'anonymous')
    
    try:
        preferences = config.get_user_preferences(user_id)
        return jsonify(preferences), 200
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
        response = create_accessible_response(content, format_type, user_preferences)
        return jsonify(response), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/history', methods=['GET'])
def get_user_history():
    """Endpoint para obtener el historial de actividades del usuario"""
    user_id = request.args.get('user_id', 'anonymous')
    
    try:
        # Implementar lógica para obtener el historial del usuario
        # Por ahora, devolvemos datos de ejemplo
        history = [
            {
                'id': '1',
                'type': 'visual',
                'title': 'Lectura de documento',
                'timestamp': '2025-05-19T10:30:00',
                'details': 'Documento académico sobre accesibilidad web'
            },
            {
                'id': '2',
                'type': 'auditory',
                'title': 'Transcripción de audio',
                'timestamp': '2025-05-18T15:45:00',
                'details': 'Grabación de clase de matemáticas'
            }
        ]
        return jsonify({'history': history}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/favorites', methods=['GET', 'POST', 'DELETE'])
def manage_favorites():
    """Endpoint para gestionar los favoritos del usuario"""
    user_id = request.args.get('user_id', 'anonymous')
    
    if request.method == 'GET':
        try:
            # Obtener favoritos (implementar lógica real)
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
            # Añadir a favoritos (implementar lógica real)
            return jsonify({'success': True, 'message': 'Añadido a favoritos'}), 200
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    
    elif request.method == 'DELETE':
        item_id = request.args.get('item_id')
        
        try:
            # Eliminar de favoritos (implementar lógica real)
            return jsonify({'success': True, 'message': 'Eliminado de favoritos'}), 200
        except Exception as e:
            return jsonify({'error': str(e)}), 500

print("Template folder:", app.template_folder)
print("Static folder:", app.static_folder)
if __name__ == '__main__':
    app.run(debug=True, port=5000)