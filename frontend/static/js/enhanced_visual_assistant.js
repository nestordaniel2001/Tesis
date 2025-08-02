/**
 * Enhanced Visual Assistant with Edge TTS Integration
 * Asistente visual mejorado con integración de Edge TTS
 */

// Extender el asistente visual existente con capacidades de Edge TTS
class EnhancedSpeechAssistant {
    constructor() {
        this.useEdgeTTS = true; // Preferir Edge TTS cuando esté disponible
        this.fallbackToLocal = true; // Usar TTS local como fallback
        this.currentProvider = null;
        this.isInitialized = false;
    }

    /**
     * Inicializar el asistente mejorado
     */
    async initialize() {
        if (this.isInitialized) return;

        console.log('🚀 Inicializando Enhanced Speech Assistant...');

        // Verificar disponibilidad de Edge TTS
        if (window.edgeTTS) {
            await window.edgeTTS.checkAvailability();
            this.useEdgeTTS = window.edgeTTS.isAvailable;
        }

        console.log(`🎤 Configuración TTS: Edge TTS ${this.useEdgeTTS ? 'habilitado' : 'deshabilitado'}, Fallback ${this.fallbackToLocal ? 'habilitado' : 'deshabilitado'}`);

        this.isInitialized = true;
    }

    /**
     * Sintetizar y reproducir texto con la mejor calidad disponible
     */
    async speakTextEnhanced(text, voiceType = 'mujer', speed = 1.0) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        if (!text || typeof text !== 'string') {
            throw new Error('Texto inválido para síntesis');
        }

        try {
            // Intentar con Edge TTS primero
            if (this.useEdgeTTS && window.edgeTTS && window.edgeTTS.isAvailable) {
                console.log('🎯 Usando Edge TTS para síntesis de alta calidad...');
                
                const result = await window.edgeTTS.synthesizeText(text, voiceType, speed);
                
                if (result.success) {
                    this.currentProvider = 'openai';
                    await window.edgeTTS.playAudio(result.audioUrl);
                    return {
                        success: true,
                        provider: 'edge-tts',
                        voiceUsed: result.voiceUsed
                    };
                }
            }

            // Fallback a TTS local (speechSynthesis del navegador)
            if (this.fallbackToLocal) {
                console.log('🔄 Usando TTS local como fallback...');
                this.currentProvider = 'local';
                
                return new Promise((resolve, reject) => {
                    try {
                        const utterance = new SpeechSynthesisUtterance(text);
                        
                        // Configurar voz
                        const voices = speechSynthesis.getVoices();
                        let selectedVoice = null;
                        
                        if (voiceType === 'mujer') {
                            selectedVoice = voices.find(voice => 
                                voice.lang.includes('es') && 
                                (voice.name.toLowerCase().includes('female') || 
                                 voice.name.toLowerCase().includes('mujer') ||
                                 voice.name.includes('María'))
                            );
                        } else {
                            selectedVoice = voices.find(voice => 
                                voice.lang.includes('es') && 
                                (voice.name.toLowerCase().includes('male') || 
                                 voice.name.toLowerCase().includes('hombre') ||
                                 voice.name.includes('Carlos'))
                            );
                        }
                        
                        if (!selectedVoice) {
                            selectedVoice = voices.find(voice => voice.lang.includes('es'));
                        }
                        
                        if (selectedVoice) {
                            utterance.voice = selectedVoice;
                        }
                        
                        utterance.lang = 'es-ES';
                        utterance.rate = speed;
                        utterance.pitch = 1.0;
                        utterance.volume = 1.0;

                        utterance.onend = () => {
                            resolve({
                                success: true,
                                provider: 'local',
                                voiceUsed: selectedVoice ? selectedVoice.name : 'default'
                            });
                        };

                        utterance.onerror = (error) => {
                            reject(new Error(`Error en TTS local: ${error.error}`));
                        };

                        speechSynthesis.speak(utterance);

                    } catch (error) {
                        reject(error);
                    }
                });
            }

            throw new Error('No hay servicios TTS disponibles');

        } catch (error) {
            console.error('❌ Error en síntesis mejorada:', error);
            throw error;
        }
    }

    /**
     * Pausar reproducción actual
     */
    pauseCurrentSpeech() {
        if (this.currentProvider === 'edge-tts' && window.edgeTTS) {
            return window.edgeTTS.pauseAudio();
        } else if (this.currentProvider === 'local') {
            speechSynthesis.pause();
            return true;
        }
        return false;
    }

    /**
     * Reanudar reproducción
     */
    resumeCurrentSpeech() {
        if (this.currentProvider === 'edge-tts' && window.edgeTTS) {
            return window.edgeTTS.resumeAudio();
        } else if (this.currentProvider === 'local') {
            speechSynthesis.resume();
            return true;
        }
        return false;
    }

    /**
     * Detener reproducción
     */
    stopCurrentSpeech() {
        if (this.currentProvider === 'edge-tts' && window.edgeTTS) {
            return window.edgeTTS.stopAudio();
        } else if (this.currentProvider === 'local') {
            speechSynthesis.cancel();
            return true;
        }
        return false;
    }

    /**
     * Verificar si hay reproducción activa
     */
    isSpeaking() {
        if (this.currentProvider === 'edge-tts' && window.edgeTTS) {
            return window.edgeTTS.isPlaying();
        } else if (this.currentProvider === 'local') {
            return speechSynthesis.speaking;
        }
        return false;
    }
}

// Crear instancia global del asistente mejorado
window.enhancedSpeechAssistant = new EnhancedSpeechAssistant();

// Integrar con el asistente visual existente
document.addEventListener('DOMContentLoaded', async () => {
    // Esperar a que el asistente visual original esté cargado
    if (typeof initSpeechAssistant === 'function') {
        console.log('🔗 Integrando Enhanced Speech Assistant con el asistente visual...');
        
        // Inicializar el asistente mejorado
        await window.enhancedSpeechAssistant.initialize();
        
        // Sobrescribir la función speakText original para usar el asistente mejorado
        const originalSpeakText = window.speakText;
        
        window.speakText = async function() {
            try {
                const readingContent = document.querySelector(".reading-content");
                const text = readingContent?.innerText?.trim();
                
                if (!text) {
                    showNotification('No hay texto para leer', 'error');
                    return;
                }

                // Obtener configuración del usuario
                const userConfig = JSON.parse(localStorage.getItem('user_config') || '{}');
                const voiceType = userConfig.tipo_voz || 'mujer';
                if (speechState.currentAudio) {

                console.log('🎯 Iniciando lectura con asistente mejorado...');

                // Preparar texto (usar la función existente si está disponible)
                let sentences = [];
                if (typeof prepareTextForSpeech === 'function') {
                    sentences = prepareTextForSpeech(text);
                } else {
                    sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 0);
                }

                if (sentences.length === 0) {
                    showNotification('No se pudo procesar el texto', 'error');
                    return;
                }

                // Actualizar estado global si existe
                if (window.speechState) {
                    window.speechState.sentences = sentences;
                    window.speechState.currentIndex = 0;
                    window.speechState.isPaused = false;
                    window.speechState.isReading = true;
                }

                // Leer cada segmento
                for (let i = 0; i < sentences.length; i++) {
                    if (window.speechState && !window.speechState.isReading) {
                        break; // Detenido por el usuario
                    }

                    try {
                        await window.enhancedSpeechAssistant.speakTextEnhanced(
                            sentences[i], 
                            voiceType, 
                            speed
                        );

                        // Actualizar progreso si la función existe
                        if (window.speechState && typeof updateProgress === 'function') {
                            window.speechState.currentIndex = i + 1;
                            updateProgress();
                        }

                    } catch (error) {
                        console.error(`Error leyendo segmento ${i + 1}:`, error);
                        // Continuar con el siguiente segmento
                    }
                }

                // Marcar como completado
                if (window.speechState) {
                    window.speechState.isReading = false;
                    window.speechState.currentIndex = 0;
                }

                if (typeof updateButtonState === 'function') {
                    updateButtonState();
                }

                showNotification('Lectura completada', 'success');

            } catch (error) {
                console.error('❌ Error en lectura mejorada:', error);
                showNotification('Error al leer el texto', 'error');
                
                // Fallback al método original si existe
                if (originalSpeakText && typeof originalSpeakText === 'function') {
                    console.log('🔄 Usando método de lectura original como fallback...');
                    originalSpeakText();
                }
            }
        };

        console.log('✅ Enhanced Speech Assistant con Edge TTS integrado correctamente');
    }
});

console.log('🎤 Enhanced Visual Assistant con Edge TTS cargado');