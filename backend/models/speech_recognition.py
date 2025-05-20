import speech_recognition as sr
import os
import tempfile

class SpeechRecognizer:
    """Clase para manejar el reconocimiento de voz de audio a texto"""
    
    def __init__(self, language='es-ES'):
        """
        Inicializa el reconocedor de voz
        
        Args:
            language (str): Código de idioma para el reconocimiento
        """
        self.recognizer = sr.Recognizer()
        self.language = language
    
    def recognize(self, audio_file, language=None):
        """
        Reconoce el texto de un archivo de audio
        
        Args:
            audio_file: Archivo de audio a procesar
            language (str, optional): Idioma específico para este reconocimiento
        
        Returns:
            str: Texto reconocido del audio
            
        Raises:
            Exception: Si ocurre un error durante el reconocimiento
        """
        if language is None:
            language = self.language
            
        # Guardar temporalmente el archivo si viene como objeto de Flask
        temp_file = None
        if hasattr(audio_file, 'read'):
            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.wav')
            audio_file.save(temp_file.name)
            audio_path = temp_file.name
        else:
            audio_path = audio_file
            
        try:
            with sr.AudioFile(audio_path) as source:
                audio_data = self.recognizer.record(source)
                text = self.recognizer.recognize_google(audio_data, language=language)
                return text
        except sr.UnknownValueError:
            raise Exception("No se pudo entender el audio")
        except sr.RequestError as e:
            raise Exception(f"Error en la solicitud al servicio de reconocimiento: {e}")
        finally:
            # Limpiar archivo temporal si se creó
            if temp_file:
                temp_file.close()
                os.unlink(temp_file.name)
    
    def set_language(self, language):
        """
        Cambiar el idioma del reconocedor
        
        Args:
            language (str): Código de idioma para el reconocimiento
        """
        self.language = language
        
    def adjust_for_noise(self, audio_file):
        """
        Ajusta el reconocedor para ambientes ruidosos
        
        Args:
            audio_file: Archivo de audio para calibrar
            
        Returns:
            bool: True si la calibración fue exitosa
        """
        try:
            with sr.AudioFile(audio_file) as source:
                self.recognizer.adjust_for_ambient_noise(source)
                return True
        except Exception:
            return False