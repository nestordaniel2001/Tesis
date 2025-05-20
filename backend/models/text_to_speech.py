import os
import tempfile
from gtts import gTTS
import pyttsx3

class TextToSpeech:
    """Clase para manejar la conversión de texto a voz"""
    
    def __init__(self, default_language='es'):
        """
        Inicializa el sintetizador de voz
        
        Args:
            default_language (str): Idioma predeterminado para la síntesis de voz
        """
        self.default_language = default_language
        self.engine = pyttsx3.init()
        # Configuración inicial del motor pyttsx3
        self.engine.setProperty('rate', 150)  # Velocidad de habla
        
        # Intentar configurar una voz en español si está disponible
        voices = self.engine.getProperty('voices')
        for voice in voices:
            if 'spanish' in voice.name.lower() or 'español' in voice.name.lower():
                self.engine.setProperty('voice', voice.id)
                break
    
    def synthesize(self, text, voice_type='default', speed=1.0, use_gtts=False):
        """
        Sintetiza texto a voz y devuelve la ruta al archivo
        
        Args:
            text (str): Texto a sintetizar
            voice_type (str): Tipo de voz a utilizar
            speed (float): Velocidad de reproducción (0.5 a 2.0)
            use_gtts (bool): Si usar gTTS (online) o pyttsx3 (offline)
            
        Returns:
            str: Ruta al archivo de audio generado
            
        Raises:
            Exception: Si ocurre un error durante la síntesis
        """
        # Crear directorio temporal si no existe
        output_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'frontend', 'assets', 'audio')
        os.makedirs(output_dir, exist_ok=True)
        
        # Generar nombre único para el archivo
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.mp3', dir=output_dir)
        output_path = temp_file.name
        temp_file.close()
        
        try:
            if use_gtts:
                # Usar gTTS (requiere conexión a internet pero tiene mejor calidad)
                tts = gTTS(text=text, lang=self.default_language, slow=False)
                tts.save(output_path)
            else:
                # Usar pyttsx3 (funciona offline)
                # Ajustar la velocidad de habla
                rate = int(self.engine.getProperty('rate') * speed)
                self.engine.setProperty('rate', rate)
                
                # Seleccionar tipo de voz si está disponible
                if voice_type != 'default':
                    voices = self.engine.getProperty('voices')
                    for voice in voices:
                        if voice_type.lower() in voice.name.lower():
                            self.engine.setProperty('voice', voice.id)
                            break
                
                # Guardar como archivo
                self.engine.save_to_file(text, output_path)
                self.engine.runAndWait()
            
            # Devolver ruta relativa para frontend
            relative_path = os.path.join('assets', 'audio', os.path.basename(output_path))
            return relative_path
        
        except Exception as e:
            # Limpiar en caso de error
            if os.path.exists(output_path):
                os.unlink(output_path)
            raise Exception(f"Error al sintetizar texto a voz: {e}")
    
    def get_available_voices(self):
        """
        Obtiene una lista de las voces disponibles
        
        Returns:
            list: Lista de nombres de voces disponibles
        """
        voices = self.engine.getProperty('voices')
        return [voice.name for voice in voices]
    
    def set_language(self, language):
        """
        Cambia el idioma predeterminado
        
        Args:
            language (str): Código de idioma
        """
        self.default_language = language