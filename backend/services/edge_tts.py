"""
Edge TTS Service
Servicio para síntesis de voz usando Microsoft Edge TTS
"""

import os
import uuid
import asyncio
import edge_tts
from datetime import datetime

class EdgeTTSService:
    """Servicio para síntesis de voz usando Edge TTS"""
    
    def __init__(self):
        self.audio_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'frontend', 'static', 'assets', 'audio')
        os.makedirs(self.audio_dir, exist_ok=True)
        
        # Mapeo de voces según configuración del usuario
        self.voice_mapping = {
            'mujer': 'es-ES-ElviraNeural',  # Voz femenina española
            'hombre': 'es-ES-AlvaroNeural'  # Voz masculina española
        }
        
        # Voces disponibles alternativas
        self.alternative_voices = {
            'mujer': ['es-MX-DaliaNeural', 'es-AR-ElenaNeural', 'es-CO-SalomeNeural'],
            'hombre': ['es-MX-JorgeNeural', 'es-AR-TomasNeural', 'es-CO-GonzaloNeural']
        }
    
    def is_available(self):
        """Verificar si el servicio está disponible"""
        return True  # Edge TTS siempre está disponible
    
    async def synthesize_speech(self, text, voice_type='mujer', speed=1.0):
        """
        Sintetizar texto a voz usando Edge TTS
        
        Args:
            text (str): Texto a sintetizar
            voice_type (str): Tipo de voz ('mujer' o 'hombre')
            speed (float): Velocidad de reproducción (0.5 - 2.0)
            
        Returns:
            dict: Resultado con la URL del archivo de audio o error
        """
        try:
            # Seleccionar voz según el tipo
            voice = self.voice_mapping.get(voice_type, 'es-ES-ElviraNeural')
            
            # Ajustar velocidad (Edge TTS acepta formato de porcentaje)
            speed_percent = int((speed - 1) * 100)
            if speed_percent > 0:
                rate = f"+{speed_percent}%"
            elif speed_percent < 0:
                rate = f"{speed_percent}%"
            else:
                rate = "+0%"
            
            # Generar nombre único para el archivo
            filename = f"edge_tts_{uuid.uuid4().hex[:8]}_{int(datetime.now().timestamp())}.mp3"
            file_path = os.path.join(self.audio_dir, filename)
            
            # Crear comunicación con Edge TTS
            communicate = edge_tts.Communicate(text, voice, rate=rate)
            
            # Generar y guardar audio
            await communicate.save(file_path)
            
            # Retornar URL relativa para el frontend
            audio_url = f"/static/assets/audio/{filename}"
            
            return {
                'success': True,
                'audio_url': audio_url,
                'file_path': file_path,
                'voice_used': voice,
                'provider': 'edge-tts'
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': f'Error en Edge TTS: {str(e)}',
                'fallback': True
            }
    
    def get_voice_info(self):
        """Obtener información sobre las voces disponibles"""
        return {
            'available_voices': list(self.voice_mapping.values()) + 
                              [v for voices in self.alternative_voices.values() for v in voices],
            'voice_mapping': self.voice_mapping,
            'alternative_voices': self.alternative_voices,
            'speed_range': [0.5, 2.0]
        }
    
    def cleanup_old_files(self, max_age_hours=24):
        """Limpiar archivos de audio antiguos"""
        try:
            import time
            current_time = time.time()
            max_age_seconds = max_age_hours * 3600
            
            for filename in os.listdir(self.audio_dir):
                if filename.startswith('edge_tts_') and filename.endswith('.mp3'):
                    file_path = os.path.join(self.audio_dir, filename)
                    file_age = current_time - os.path.getctime(file_path)
                    
                    if file_age > max_age_seconds:
                        os.remove(file_path)
                        print(f"Archivo eliminado: {filename}")
                        
        except Exception as e:
            print(f"Error limpiando archivos: {e}")