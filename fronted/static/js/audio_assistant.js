/**
 * Asistente Auditivo para Auris
 * Proporciona funcionalidades para usuarios con discapacidad auditiva
 */

class AudioAssistant {
    constructor() {
        // Configuración por defecto
        this.config = {
            enableTranscription: true,
            showCaptions: true,
            captionSize: 'medium',
            enableVisualAlerts: true,
            captionLanguage: 'es-ES',
            useSimplifiedLanguage: false,
            highlightKeywords: true
        };
        
        // Cargar configuración guardada si existe
        this.loadConfig();
        
        // Inicializar reconocimiento de voz si está disponible
        this.recognition = null;
        this.isListening = false;
        
        if ('webkitSpeechRecognition' in window) {
            this.recognition = new webkitSpeechRecognition();
            this.configureRecognition();
        } else if ('SpeechRecognition' in window) {
            this.recognition = new SpeechRecognition();
            this.configureRecognition();
        }
        
        // Contenedor para mostrar transcripciones/subtítulos
        this.captionsContainer = null;
    }
    
    // Cargar configuración guardada
    loadConfig() {
        const savedConfig = localStorage.getItem('auris-audio-config');
        if (savedConfig) {
            try {
                const parsedConfig = JSON.parse(savedConfig);
                this.config = { ...this.config, ...parsedConfig };
            } catch (e) {
                console.error('Error al cargar la configuración guardada', e);
            }
        }
    }
    
    // Guardar configuración actual
    saveConfig() {
        localStorage.setItem('auris-audio-config', JSON.stringify(this.config));
    }
    
    // Configurar el reconocimiento de voz
    configureRecognition() {
        if (!this.recognition) return;
        
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = this.config.captionLanguage;
        
        // Evento de resultado
        this.recognition.onresult = (event) => {
            let finalTranscript = '';
            let interimTranscript = '';
            
            // Procesar resultados
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                
                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                    // Procesar el texto final (guardar, analizar, etc.)
                    this.processTranscription(finalTranscript);
                } else {
                    interimTranscript += transcript;
                }
            }
            
            // Mostrar las transcripciones
            this.displayTranscription(finalTranscript, interimTranscript);
        };
        
        // Manejar errores
        this.recognition.onerror = (event) => {
            console.error('Error en reconocimiento de voz:', event.error);
            // Intentar reiniciar si hay un error temporal
            if (event.error === 'network' || event.error === 'aborted') {
                setTimeout(() => {
                    if (this.isListening) {
                        this.startListening();
                    }
                }, 1000);
            }
        };
        
        // Cuando el reconocimiento termina
        this.recognition.onend = () => {
            // Reiniciar automáticamente si estamos en modo de escucha continua
            if (this.isListening) {
                this.recognition.start();
            }
        };
    }
    
    // Iniciar la escucha y transcripción
    startListening() {
        if (!this.recognition) {
            console.warn('El reconocimiento de voz no está disponible en este navegador');
            return;
        }
        
        try {
            this.recognition.start();
            this.isListening = true;
            this.createCaptionsContainer();
            
            // Notificar visualmente que estamos escuchando
            if (this.config.enableVisualAlerts) {
                this.showVisualAlert('Escuchando...', 'listening');
            }
        } catch (e) {
            console.error('Error al iniciar el reconocimiento de voz', e);
        }
    }
    
    // Detener la escucha
    stopListening() {
        if (!this.recognition) return;
        
        try {
            this.recognition.stop();
            this.isListening = false;
            
            // Notificar que se detuvo la escucha
            if (this.config.enableVisualAlerts) {
                this.showVisualAlert('Escucha detenida', 'stopped');
            }
        } catch (e) {
            console.error('Error al detener el reconocimiento de voz', e);
        }
    }
    
    // Procesar la transcripción final
    processTranscription(text) {
        // Guardar la transcripción en el historial
        this.saveTranscription(text);
        
        // Simplificar el lenguaje si está habilitado
        if (this.config.useSimplifiedLanguage) {
            text = this.simplifyLanguage(text);
        }
        
        // Analizar para posibles palabras clave o comandos
        this.analyzeForCommands(text);
    }
    
    // Guardar transcripción en el historial
    saveTranscription(text) {
        // Obtener el historial existente o crear uno nuevo
        let history = JSON.parse(localStorage.getItem('auris-transcription-history') || '[]');
        
        // Añadir nueva transcripción con marca de tiempo
        history.push({
            text,
            timestamp: new Date().toISOString()
        });
        
        // Limitar el tamaño del historial (guardar solo las últimas 100 entradas)
        if (history.length > 100) {
            history = history.slice(-100);
        }
        
        // Guardar el historial actualizado
        localStorage.setItem('auris-transcription-history', JSON.stringify(history));
    }
    
    // Mostrar transcripciones en pantalla
    displayTranscription(finalText, interimText) {
        if (!this.config.showCaptions) return;
        
        // Asegurarse de que existe el contenedor
        if (!this.captionsContainer) {
            this.createCaptionsContainer();
        }
        
        // Texto a mostrar
        let displayText = finalText;
        
        // Añadir texto provisional si existe
        if (interimText) {
            displayText += ' <span class="interim">' + interimText + '</span>';
        }
        
        // Resaltar palabras clave si está habilitado
        if (this.config.highlightKeywords && displayText) {
            displayText = this.highlightKeywords(displayText);
        }
        
        // Actualizar el contenido
        this.captionsContainer.innerHTML = displayText;
    }
    
    // Crear el contenedor para subtítulos/transcripciones
    createCaptionsContainer() {
        // Verificar si ya existe
        if (this.captionsContainer) return;
        
        // Crear nuevo contenedor
        this.captionsContainer = document.createElement('div');
        this.captionsContainer.className = 'captions-container';
        this.captionsContainer.classList.add(`caption-size-${this.config.captionSize}`);
        
        // Atributos de accesibilidad
        this.captionsContainer.setAttribute('aria-live', 'polite');
        this.captionsContainer.setAttribute('aria-relevant', 'additions text');
        
        // Añadir al DOM
        document.body.appendChild(this.captionsContainer);
    }
    
    // Simplificar el lenguaje (para hacer el texto más accesible)
    simplifyLanguage(text) {
        // Esta es una implementación básica que podría ampliarse
        // con un procesamiento más sofisticado
        
        // Ejemplo: Reemplazar términos complejos con sinónimos más simples
        const simplifications = {
            'adquirir': 'comprar',
            'implementar': 'hacer',
            'solicitar': 'pedir',
            'modificar': 'cambiar',
            'visualizar': 'ver',
            'finalizar': 'terminar',
            // Se pueden añadir más palabras según sea necesario
        };
        
        let simplifiedText = text;
        
        // Aplicar simplificaciones
        Object.keys(simplifications).forEach(complex => {
            const regex = new RegExp('\\b' + complex + '\\b', 'gi');
            simplifiedText = simplifiedText.replace(regex, simplifications[complex]);
        });
        
        return simplifiedText;
    }
    
    // Resaltar palabras clave en el texto
    highlightKeywords(text) {
        // Lista de palabras clave importantes a resaltar
        const keywords = [
            'importante', 'atención', 'cuidado', 'urgente',
            'aviso', 'alerta', 'examen', 'tarea', 'proyecto',
            'fecha límite', 'entrega', 'evaluación'
        ];
        
        let highlightedText = text;
        
        // Resaltar cada palabra clave
        keywords.forEach(keyword => {
            const regex = new RegExp('\\b(' + keyword + ')\\b', 'gi');
            highlightedText = highlightedText.replace(
                regex, 
                '<strong class="keyword-highlight">$1</strong>'
            );
        });
        
        return highlightedText;
    }
    
    // Analizar el texto para detectar posibles comandos
    analyzeForCommands(text) {
        // Convertir a minúsculas para facilitar la comparación
        const lowerText = text.toLowerCase();
        
        // Comandos básicos
        if (lowerText.includes('pausar transcripción') || 
            lowerText.includes('detener transcripción')) {
            this.stopListening();
        } else if (lowerText.includes('iniciar transcripción') || 
                  lowerText.includes('comenzar transcripción')) {
            this.startListening();
        } else if (lowerText.includes('guardar transcripción')) {
            this.downloadTranscription();
        }
        
        // Añadir más comandos según sea necesario
    }
    
    // Mostrar alertas visuales para eventos auditivos
    showVisualAlert(message, type) {
        if (!this.config.enableVisualAlerts) return;
        
        // Crear elemento de alerta
        const alertElement = document.createElement('div');
        alertElement.className = `visual-alert alert-${type}`;
        alertElement.textContent = message;
        
        // Añadir al DOM
        document.body.appendChild(alertElement);
        
        // Eliminar después de un tiempo
        setTimeout(() => {
            alertElement.classList.add('fade-out');
            setTimeout(() => {
                document.body.removeChild(alertElement);
            }, 500);
        }, 3000);
    }
    
    // Cambiar el tamaño de los subtítulos
    changeCaptionSize(size) {
        this.config.captionSize = size;
        
        if (this.captionsContainer) {
            // Eliminar clases de tamaño anteriores
            this.captionsContainer.classList.remove('caption-size-small', 'caption-size-medium', 'caption-size-large');
            // Añadir nueva clase de tamaño
            this.captionsContainer.classList.add(`caption-size-${size}`); 
        }
        
        this.saveConfig();
    }
    
    // Cambiar el idioma de reconocimiento
    changeLanguage(languageCode) {
        this.config.captionLanguage = languageCode;
        
        // Actualizar la configuración del reconocimiento
        if (this.recognition) {
            this.recognition.lang = languageCode;
            
            // Reiniciar reconocimiento si está activo
            if (this.isListening) {
                this.stopListening();
                this.startListening();
            }
        }
        
        this.saveConfig();
    }
    
    // Descargar transcripción como archivo de texto
    downloadTranscription() {
        // Obtener el historial de transcripciones
        const history = JSON.parse(localStorage.getItem('auris-transcription-history') || '[]');
        
        if (history.length === 0) {
            this.showVisualAlert('No hay transcripciones para descargar', 'warning');
            return;
        }
        
        // Formatear el contenido
        let content = "AURIS - HISTORIAL DE TRANSCRIPCIONES\n\n";
        
        history.forEach(item => {
            const date = new Date(item.timestamp);
            content += `[${date.toLocaleString()}]\n${item.text}\n\n`;
        });
        
        // Crear archivo y descargarlo
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `auris-transcripcion-${new Date().toISOString().slice(0, 10)}.txt`;
        document.body.appendChild(a);
        a.click();
        
        // Limpiar
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
    }
}

// Exportar la clase para su uso en otros archivos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AudioAssistant;
} else {
    // Si no estamos en un entorno de módulos, añadir a window
    window.AudioAssistant = AudioAssistant;
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    // Crear instancia del asistente auditivo
    window.audioAssistant = new AudioAssistant();
});