/**
 * Asistente Visual para Auris
 * Proporciona funcionalidades para usuarios con discapacidad visual
 */

class VisualAssistant {
    constructor() {
        // Configuración por defecto
        this.config = {
            fontSize: 16,
            contrast: 'normal', // normal, high, inverted
            voiceRate: 1.0,
            voiceVolume: 1.0,
            highlightText: true
        };
        
        // Cargar configuración guardada si existe
        this.loadConfig();
        
        // Inicializar el sintetizador de voz
        this.speechSynthesis = window.speechSynthesis;
        this.voices = [];
        
        // Esperar a que las voces se carguen
        if (this.speechSynthesis) {
            this.speechSynthesis.onvoiceschanged = () => {
                this.voices = this.speechSynthesis.getVoices();
                // Preferir voces en español
                this.selectedVoice = this.voices.find(voice => 
                    voice.lang.includes('es')) || this.voices[0];
            };
            this.voices = this.speechSynthesis.getVoices();
        }
    }
    
    // Cargar configuración guardada
    loadConfig() {
        const savedConfig = localStorage.getItem('auris-visual-config');
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
        localStorage.setItem('auris-visual-config', JSON.stringify(this.config));
    }
    
    // Cambiar el tamaño de la fuente
    changeFontSize(size) {
        this.config.fontSize = size;
        document.documentElement.style.setProperty('--base-font-size', `${size}px`);
        this.saveConfig();
    }
    
    // Cambiar el contraste
    changeContrast(contrastMode) {
        this.config.contrast = contrastMode;
        
        // Eliminar clases de contraste anteriores
        document.body.classList.remove('high-contrast', 'inverted-contrast');
        
        // Aplicar nueva clase de contraste
        if (contrastMode === 'high') {
            document.body.classList.add('high-contrast');
        } else if (contrastMode === 'inverted') {
            document.body.classList.add('inverted-contrast');
        }
        
        this.saveConfig();
    }
    
    // Leer texto en voz alta
    readText(text) {
        if (!this.speechSynthesis) return;
        
        // Detener cualquier lectura en curso
        this.stopReading();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.voice = this.selectedVoice;
        utterance.rate = this.config.voiceRate;
        utterance.volume = this.config.voiceVolume;
        utterance.lang = 'es-ES'; // Establecer idioma español
        
        this.speechSynthesis.speak(utterance);
    }
    
    // Detener la lectura
    stopReading() {
        if (this.speechSynthesis) {
            this.speechSynthesis.cancel();
        }
    }
    
    // Pausar/Reanudar la lectura
    toggleReading() {
        if (!this.speechSynthesis) return;
        
        if (this.speechSynthesis.paused) {
            this.speechSynthesis.resume();
        } else if (this.speechSynthesis.speaking) {
            this.speechSynthesis.pause();
        }
    }
    
    // Cambiar la velocidad de lectura
    changeReadingSpeed(rate) {
        this.config.voiceRate = rate;
        this.saveConfig();
    }
    
    // Cambiar el volumen de lectura
    changeVolume(volume) {
        this.config.voiceVolume = volume;
        this.saveConfig();
    }
    
    // Resaltar texto mientras se lee (para seguimiento visual)
    highlightWhileReading(textElement) {
        if (!this.config.highlightText) return;
        
        // Implementación básica del seguimiento de lectura
        // Dividir el texto en palabras
        const words = textElement.textContent.split(/\s+/);
        
        // Limpiar contenido actual
        textElement.innerHTML = '';
        
        // Crear spans para cada palabra para poder resaltarlas individualmente
        words.forEach((word, index) => {
            const span = document.createElement('span');
            span.textContent = word + ' ';
            span.dataset.wordIndex = index;
            textElement.appendChild(span);
        });
        
        // Configurar la lectura con eventos para resaltar
        const utterance = new SpeechSynthesisUtterance(words.join(' '));
        utterance.voice = this.selectedVoice;
        utterance.rate = this.config.voiceRate;
        utterance.volume = this.config.voiceVolume;
        utterance.lang = 'es-ES';
        
        // Aproximación simple: resaltar palabras basadas en eventos de límite de palabras
        let currentWordIndex = 0;
        
        utterance.onboundary = (event) => {
            if (event.name === 'word') {
                // Quitar resaltado de la palabra anterior
                const words = textElement.querySelectorAll('span');
                words.forEach(span => span.classList.remove('highlight'));
                
                // Resaltar la palabra actual
                if (currentWordIndex < words.length) {
                    words[currentWordIndex].classList.add('highlight');
                    currentWordIndex++;
                }
            }
        };
        
        utterance.onend = () => {
            // Quitar todos los resaltados al finalizar
            const words = textElement.querySelectorAll('span');
            words.forEach(span => span.classList.remove('highlight'));
        };
        
        this.speechSynthesis.speak(utterance);
    }
    
    // Iniciar el modo de lectura de documento completo
    startDocumentReading(documentElement) {
        // Extraer todo el texto del documento
        const allText = documentElement.textContent.trim();
        
        // Configurar la interfaz para el modo de lectura
        this.createReadingInterface(allText);
    }
    
    // Crear interfaz de lectura
    createReadingInterface(text) {
        // Crear un modal o panel para la lectura
        const readingPanel = document.createElement('div');
        readingPanel.className = 'reading-panel';
        readingPanel.setAttribute('role', 'dialog');
        readingPanel.setAttribute('aria-label', 'Panel de lectura');
        
        // Añadir controles
        const controls = document.createElement('div');
        controls.className = 'reading-controls';
        
        // Botón de Play/Pause
        const playButton = document.createElement('button');
        playButton.innerHTML = '⏯️';
        playButton.setAttribute('aria-label', 'Reproducir o pausar');
        playButton.addEventListener('click', () => this.toggleReading());
        
        // Botón de Stop
        const stopButton = document.createElement('button');
        stopButton.innerHTML = '⏹️';
        stopButton.setAttribute('aria-label', 'Detener');
        stopButton.addEventListener('click', () => this.stopReading());
        
        // Botón de cerrar
        const closeButton = document.createElement('button');
        closeButton.innerHTML = '✖️';
        closeButton.setAttribute('aria-label', 'Cerrar panel de lectura');
        closeButton.addEventListener('click', () => {
            this.stopReading();
            document.body.removeChild(readingPanel);
        });
        
        // Añadir controles al panel
        controls.appendChild(playButton);
        controls.appendChild(stopButton);
        controls.appendChild(closeButton);
        readingPanel.appendChild(controls);
        
        // Contenedor para el texto
        const textContainer = document.createElement('div');
        textContainer.className = 'reading-text';
        textContainer.textContent = text;
        readingPanel.appendChild(textContainer);
        
        // Añadir el panel al body
        document.body.appendChild(readingPanel);
        
        // Iniciar la lectura con resaltado
        this.highlightWhileReading(textContainer);
    }
}

// Exportar la clase para su uso en otros archivos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VisualAssistant;
} else {
    // Si no estamos en un entorno de módulos, añadir a window
    window.VisualAssistant = VisualAssistant;
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    // Crear instancia del asistente visual
    window.visualAssistant = new VisualAssistant();
});