"""
Rutas para Text-to-Speech con OpenAI
"""

from flask import Blueprint, request, jsonify
from backend.services.edge_tts import EdgeTTSService
from backend.models.text_to_speech import TextToSpeech
import asyncio

# Crear blueprint para las rutas TTS
tts_bp = Blueprint('tts', __name__)

# Inicializar servicios
edge_tts = EdgeTTSService()
fallback_tts = TextToSpeech()

@tts_bp.route('/api/synthesize-speech', methods=['POST'])
def synthesize_speech():
    """
    Endpoint para sintetizar texto a voz
    Usa Edge TTS como primera opción, fallback a pyttsx3/gTTS
    """
    try:
        data = request.json
        
        if not data or 'text' not in data:
            return jsonify({
                'success': False,
                'error': 'Texto requerido'
            }), 400
        
        text = data['text'].strip()
        voice_type = data.get('voice_type', 'mujer')
        speed = float(data.get('speed', 1.0))
        
        if not text:
            return jsonify({
                'success': False,
                'error': 'El texto no puede estar vacío'
            }), 400
        
        # Intentar con Edge TTS primero
        if edge_tts.is_available():
            print(f"🎤 Usando Edge TTS - Voz: {voice_type}, Velocidad: {speed}x")
            
            # Ejecutar función async en el contexto del hilo actual
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                result = loop.run_until_complete(edge_tts.synthesize_speech(text, voice_type, speed))
            finally:
                loop.close()
            
            if result['success']:
                return jsonify({
                    'success': True,
                    'audio_url': result['audio_url'],
                    'file_path': result.get('file_path'),
                    'provider': 'edge-tts',
                    'voice_used': result['voice_used'],
                    'voice_name': result['voice_used']
                })
            elif not result.get('fallback', False):
                # Error sin fallback
                return jsonify({
                    'success': False,
                    'error': result['error']
                }), 500
        
        # Fallback a TTS local
        print(f"🔄 Usando TTS local como fallback - Voz: {voice_type}, Velocidad: {speed}x")
        try:
            audio_path = fallback_tts.synthesize(text, voice_type, speed)
            return jsonify({
                'success': True,
                'audio_url': audio_path,
                'provider': 'local',
                'voice_used': voice_type
            })
        except Exception as e:
            return jsonify({
                'success': False,
                'error': f'Error en TTS local: {str(e)}'
            }), 500
            
    except Exception as e:
        print(f"Error en synthesize_speech: {e}")
        return jsonify({
            'success': False,
            'error': f'Error interno: {str(e)}'
        }), 500

@tts_bp.route('/api/tts-info', methods=['GET'])
def get_tts_info():
    """Obtener información sobre los servicios TTS disponibles"""
    try:
        info = {
            'edge_tts_available': edge_tts.is_available(),
            'local_available': True,
            'voice_options': {
                'mujer': 'Voz femenina',
                'hombre': 'Voz masculina'
            },
            'speed_range': {
                'min': 0.25,
                'max': 4.0,
                'default': 1.0
            }
        }
        
        if edge_tts.is_available():
            info['edge_tts_info'] = edge_tts.get_voice_info()
        
        return jsonify({
            'success': True,
            'info': info
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@tts_bp.route('/api/cleanup-audio', methods=['POST'])
def cleanup_audio_files():
    """Limpiar archivos de audio antiguos"""
    try:
        max_age_hours = request.json.get('max_age_hours', 24) if request.json else 24
        edge_tts.cleanup_old_files(max_age_hours)
        
        return jsonify({
            'success': True,
            'message': f'Archivos más antiguos de {max_age_hours} horas eliminados'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500