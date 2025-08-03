# Opción 1: Instalar edge-tts directamente en tu proyecto
# pip install edge-tts

# backend/routes/edge_tts_routes.py
from flask import Blueprint, request, jsonify, Response
import edge_tts
import asyncio
import io

edge_tts_bp = Blueprint('edge_tts', __name__)

# Voces en español disponibles (muy realistas)
SPANISH_VOICES = {
    'elena': 'es-ES-ElviraNeural',      # Mujer española, muy natural
    'pablo': 'es-ES-AlvaroNeural',      # Hombre español, muy natural
    'maria': 'es-MX-DaliaNeural',       # Mujer mexicana
    'jorge': 'es-MX-JorgeNeural',       # Hombre mexicano
    'sofia': 'es-AR-ElenaNeural',       # Mujer argentina
    'tomas': 'es-AR-TomasNeural',       # Hombre argentino
    'catalina': 'es-CO-SalomeNeural',   # Mujer colombiana
    'gonzalo': 'es-CO-GonzaloNeural'    # Hombre colombiano
}

async def generate_speech_async(text, voice='es-ES-ElviraNeural', rate='+0%'):
    """Generar audio usando Edge TTS de forma asíncrona"""
    communicate = edge_tts.Communicate(text, voice, rate=rate)
    
    # Generar audio en memoria
    audio_data = b""
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            audio_data += chunk["data"]
    
    return audio_data

@edge_tts_bp.route('/api/edge-tts/synthesize', methods=['POST'])
def synthesize_edge_speech():
    try:
        data = request.json
        text = data.get('text', '')
        voice_name = data.get('voice', 'elena')  # Nombre simplificado
        speed = data.get('speed', 1.0)
        
        if not text:
            return jsonify({'error': 'Texto requerido'}), 400
        
        # Convertir velocidad a formato Edge TTS
        if speed < 0.5:
            rate = '-50%'
        elif speed < 0.75:
            rate = '-25%'
        elif speed > 1.5:
            rate = '+50%'
        elif speed > 1.25:
            rate = '+25%'
        else:
            rate = '+0%'
        
        # Obtener voz real de Edge TTS
        edge_voice = SPANISH_VOICES.get(voice_name, 'es-ES-ElviraNeural')
        
        # Generar audio de forma asíncrona
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            audio_data = loop.run_until_complete(
                generate_speech_async(text, edge_voice, rate)
            )
            
            return Response(
                audio_data,
                mimetype='audio/mpeg',
                headers={
                    'Content-Disposition': 'inline; filename="edge_speech.mp3"',
                    'Cache-Control': 'no-cache'
                }
            )
            
        finally:
            loop.close()
            
    except Exception as e:
        return jsonify({
            'error': f'Error generando audio: {str(e)}',
            'type': 'edge_tts_error'
        }), 500

@edge_tts_bp.route('/api/edge-tts/voices', methods=['GET'])
def get_available_voices():
    """Obtener lista de voces disponibles con nombres amigables"""
    voices_info = []
    for name, edge_name in SPANISH_VOICES.items():
        voices_info.append({
            'id': name,
            'name': name.title(),
            'language': 'es',
            'gender': 'female' if name in ['elena', 'maria', 'sofia', 'catalina'] else 'male',
            'region': edge_name.split('-')[1]  # ES, MX, AR, CO
        })
    
    return jsonify({'voices': voices_info})

# En tu archivo principal app.py, registra el blueprint:
# from backend.routes.edge_tts_routes import edge_tts_bp
# app.register_blueprint(edge_tts_bp)