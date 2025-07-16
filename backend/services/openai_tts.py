"""
OpenAI Text-to-Speech Service
Servicio para integrar las voces de alta calidad de OpenAI
"""

import os
import requests
import tempfile
import uuid
from datetime import datetime

class OpenAITTSService:
    """Servicio para síntesis de voz usando OpenAI TTS"""
    
    def __init__(self):
        self.api_key = os.environ.get('OPENAI_API_KEY')
        self.base_url = "https://api.openai.com/v1/audio/speech"
        self.audio_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'frontend', 'static', 'assets', 'audio')
        os.makedirs(self.audio_dir, exist_ok=True)
        
        # Mapeo de voces según configuración del usuario
        self.voice_mapping = {
            'mujer': 'nova',  # Voz femenina de OpenAI (puedes cambiar a 'coral' cuando esté disponible)
            'hombre': 'onyx'  # Voz masculina de OpenAI (puedes cambiar a 'ash' cuando esté disponible)
        }
        
        # Voces disponibles en OpenAI
        self.available_voices = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']
    
    def is_available(self):
        """Verificar si el servicio está disponible"""
        return self.api_key is not None
    
    def synthesize_speech(self, text, voice_type='mujer', speed=1.0):
        """
        Sintetizar texto a voz usando OpenAI TTS
        
        Args:
            text (str): Texto a sintetizar
            voice_type (str): Tipo de voz ('mujer' o 'hombre')
            speed (float): Velocidad de reproducción (0.25 - 4.0)
            
        Returns:
            dict: Resultado con la URL del archivo de audio o error
        """
        if not self.is_available():
            return {
                'success': False,
                'error': 'OpenAI API key no configurada',
                'fallback': True
            }
        
        try:
            # Seleccionar voz según el tipo
            voice = self.voice_mapping.get(voice_type, 'nova')
            
            # Ajustar velocidad (OpenAI acepta 0.25 - 4.0)
            speed = max(0.25, min(4.0, speed))
            
            # Preparar datos para la API
            headers = {
                'Authorization': f'Bearer {self.api_key}',
                'Content-Type': 'application/json'
            }
            
            data = {
                'model': 'tts-1-hd',  # Modelo de alta calidad
                'input': text,
                'voice': voice,
                'speed': speed,
                'response_format': 'mp3'
            }
            
            # Realizar petición a OpenAI
            response = requests.post(
                self.base_url,
                headers=headers,
                json=data,
                timeout=30
            )
            
            if response.status_code == 200:
                # Guardar archivo de audio
                filename = f"openai_tts_{uuid.uuid4().hex[:8]}_{int(datetime.now().timestamp())}.mp3"
                file_path = os.path.join(self.audio_dir, filename)
                
                with open(file_path, 'wb') as f:
                    f.write(response.content)
                
                # Retornar URL relativa para el frontend
                audio_url = f"/static/assets/audio/{filename}"
                
                return {
                    'success': True,
                    'audio_url': audio_url,
                    'voice_used': voice,
                    'model': 'tts-1-hd'
                }
            else:
                error_msg = f"Error de OpenAI API: {response.status_code}"
                try:
                    error_data = response.json()
                    error_msg = error_data.get('error', {}).get('message', error_msg)
                except:
                    pass
                
                return {
                    'success': False,
                    'error': error_msg,
                    'fallback': True
                }
                
        except requests.exceptions.Timeout:
            return {
                'success': False,
                'error': 'Timeout en la conexión con OpenAI',
                'fallback': True
            }
        except requests.exceptions.RequestException as e:
            return {
                'success': False,
                'error': f'Error de conexión: {str(e)}',
                'fallback': True
            }
        except Exception as e:
            return {
                'success': False,
                'error': f'Error inesperado: {str(e)}',
                'fallback': True
            }
    
    def get_voice_info(self):
        """Obtener información sobre las voces disponibles"""
        return {
            'available_voices': self.available_voices,
            'voice_mapping': self.voice_mapping,
            'models': ['tts-1', 'tts-1-hd'],
            'speed_range': [0.25, 4.0]
        }
    
    def cleanup_old_files(self, max_age_hours=24):
        """Limpiar archivos de audio antiguos"""
        try:
            import time
            current_time = time.time()
            max_age_seconds = max_age_hours * 3600
            
            for filename in os.listdir(self.audio_dir):
                if filename.startswith('openai_tts_') and filename.endswith('.mp3'):
                    file_path = os.path.join(self.audio_dir, filename)
                    file_age = current_time - os.path.getctime(file_path)
                    
                    if file_age > max_age_seconds:
                        os.remove(file_path)
                        print(f"Archivo eliminado: {filename}")
                        
        except Exception as e:
            print(f"Error limpiando archivos: {e}")