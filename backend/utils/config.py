"""
Configuraciones del sistema y gestión de preferencias de usuario
"""
import os
import json

class Config:
    """Clase para manejar la configuración y preferencias de usuario"""
    
    def __init__(self, config_file=None):
        """
        Inicializa la configuración
        
        Args:
            config_file (str, optional): Ruta al archivo de configuración
        """
        self.config_file = config_file or os.path.join(
            os.path.dirname(os.path.abspath(__file__)), 
            '..', 
            'config.json'
        )
        
        # Cargar configuración desde archivo si existe
        if os.path.exists(self.config_file):
            with open(self.config_file, 'r', encoding='utf-8') as f:
                self.config = json.load(f)
        else:
            # Configuración predeterminada
            self.config = {
                'app': {
                    'name': 'Asistente Inteligente Auris',
                    'version': '1.0.0',
                    'language': 'es',
                    'debug': True
                },
                'accessibility': {
                    'default_font_size': 'medium',  # small, medium, large, x-large
                    'high_contrast_mode': False,
                    'simplified_text': False,
                    'audio_feedback': True,
                    'extended_descriptions': True
                },
                'api_keys': {
                    # Aquí irían las claves de API para servicios externos
                },
                'users': {
                    # Preferencias por usuario
                }
            }
            
            # Guardar configuración predeterminada
            self._save_config()
    
    def _save_config(self):
        """Guarda la configuración en el archivo"""
        # Crear directorio si no existe
        os.makedirs(os.path.dirname(self.config_file), exist_ok=True)
        
        with open(self.config_file, 'w', encoding='utf-8') as f:
            json.dump(self.config, f, indent=4)
    
    def get_app_config(self):
        """
        Obtiene la configuración general de la aplicación
        
        Returns:
            dict: Configuración de la aplicación
        """
        return self.config['app']
    
    def get_accessibility_config(self):
        """
        Obtiene la configuración de accesibilidad predeterminada
        
        Returns:
            dict: Configuración de accesibilidad
        """
        return self.config['accessibility']
    
    def get_api_key(self, service):
        """
        Obtiene una clave de API para un servicio
        
        Args:
            service (str): Nombre del servicio
            
        Returns:
            str: Clave de API o None si no existe
        """
        return self.config['api_keys'].get(service)
    
    def set_api_key(self, service, key):
        """
        Establece una clave de API para un servicio
        
        Args:
            service (str): Nombre del servicio
            key (str): Clave de API
        """
        self.config['api_keys'][service] = key
        self._save_config()
    
    def get_user_preferences(self, user_id='anonymous'):
        """
        Obtiene las preferencias de un usuario
        
        Args:
            user_id (str): Identificador del usuario
            
        Returns:
            dict: Preferencias del usuario
        """
        # Si el usuario no existe, devolver configuración predeterminada
        if user_id not in self.config['users']:
            return {
                **self.get_accessibility_config(),
                'user_id': user_id
            }
        
        return self.config['users'][user_id]
    
    def save_user_preferences(self, user_id, preferences):
        """
        Guarda las preferencias de un usuario
        
        Args:
            user_id (str): Identificador del usuario
            preferences (dict): Preferencias a guardar
        """
        if 'users' not in self.config:
            self.config['users'] = {}
            
        # Actualizar preferencias
        if user_id in self.config['users']:
            self.config['users'][user_id].update(preferences)
        else:
            self.config['users'][user_id] = preferences
        
        # Guardar cambios
        self._save_config()
    
    def set_debug_mode(self, debug=True):
        """
        Activa o desactiva el modo de depuración
        
        Args:
            debug (bool): Estado del modo de depuración
        """
        self.config['app']['debug'] = debug
        self._save_config()
    
    def set_default_language(self, language):
        """
        Establece el idioma predeterminado de la aplicación
        
        Args:
            language (str): Código de idioma
        """
        self.config['app']['language'] = language
        self._save_config()