import os
import uuid
from gtts import gTTS

class TextToSpeech:
    """Clase para manejar la conversión de texto a voz"""

    def __init__(self, default_language='es', audio_dir=None):
        """
        Inicializa el sintetizador usando solo gTTS
        
        Args:
            default_language (str): Idioma predeterminado para la síntesis de voz
            audio_dir (str): Carpeta donde se guardarán los audios
        """
        self.default_language = default_language
        self.audio_dir = audio_dir or os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'frontend', 'assets', 'audio')
        os.makedirs(self.audio_dir, exist_ok=True)

    def synthesize(self, text, voice_type='default', speed=1.0, use_gtts=True):
        """
        Sintetiza texto a voz y devuelve la ruta al archivo
        
        Args:
            text (str): Texto a sintetizar
            voice_type (str): Tipo de voz (solo usado como parámetro de interfaz)
            speed (float): Velocidad de reproducción (0.5 a 2.0, afecta a la lentitud)
            use_gtts (bool): Siempre True en Render
            
        Returns:
            str: Ruta relativa al archivo de audio generado
            
        Raises:
            Exception: Si ocurre un error durante la síntesis
        """
        # Generar nombre único para el archivo
        filename = f"{uuid.uuid4()}.mp3"
        output_path = os.path.join(self.audio_dir, filename)
        
        try:
            if use_gtts:
                # Usar gTTS (requiere internet pero funciona en Render)
                tts = gTTS(text=text, lang=self.default_language, slow=(speed < 1.0))
                tts.save(output_path)
            
            return os.path.join('assets', 'audio', filename)
        
        except Exception as e:
            if os.path.exists(output_path):
                os.unlink(output_path)
            raise Exception(f"Error al sintetizar texto a voz: {e}")