import os
import uuid
import pyttsx3
from gtts import gTTS

class TextToSpeech:
    """Clase para manejar la conversión de texto a voz"""

    def __init__(self, default_language='es', audio_dir=None):
        self.default_language = default_language
        self.audio_dir = audio_dir or os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'frontend', 'assets', 'audio')
        os.makedirs(self.audio_dir, exist_ok=True)

        # Detectar si estamos en Render (producción)
        self.use_gtts = "RENDER" in os.environ  # Variable de entorno en Render

        if not self.use_gtts:
            self.engine = pyttsx3.init()
            # Configuración básica del motor pyttsx3
            self.engine.setProperty('rate', 150)
            voices = self.engine.getProperty('voices')
            for voice in voices:
                if 'spanish' in voice.name.lower() or 'español' in voice.name.lower():
                    self.engine.setProperty('voice', voice.id)
                    break

    def synthesize(self, text, voice_type='default', speed=1.0):
        """
        Sintetiza texto a voz y devuelve la ruta al archivo
        """
        filename = f"{uuid.uuid4()}.mp3"
        output_path = os.path.join(self.audio_dir, filename)

        try:
            if self.use_gtts:
                # Usar gTTS (requiere internet)
                tts = gTTS(text=text, lang=self.default_language, slow=(speed < 1.0))
                tts.save(output_path)
            else:
                # Usar pyttsx3 (funciona offline)
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

            return os.path.join('assets', 'audio', os.path.basename(filename))

        except Exception as e:
            if os.path.exists(output_path):
                os.remove(output_path)
            raise Exception(f"Error al sintetizar texto a voz: {e}")