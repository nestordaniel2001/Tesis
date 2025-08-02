/**
 * Edge TTS Integration for Visual Assistant
 * Integración de Edge Text-to-Speech para el asistente visual
 */

class EdgeTTSManager {
    constructor() {
        this.isAvailable = false;
        this.currentAudio = null;
        this.checkAvailability();
    }

    /**
     * Verificar si Edge TTS está disponible
     */
    async checkAvailability() {
        try {
            const response = await fetch('/api/tts-info');
            const data = await response.json();
            
            if (data.success) {
                this.isAvailable = data.info.edge_tts_available;
                console.log(`🎤 Edge TTS ${this.isAvailable ? 'disponible' : 'no disponible'}`);
                return this.isAvailable;
            }
        } catch (error) {
            console.warn('Error verificando disponibilidad de Edge TTS:', error);
            this.isAvailable = false;
        }
        return false;
    }

    /**
     * Sintetizar texto usando Edge TTS
     */
    async synthesizeText(text, voiceType = 'mujer', speed = 1.0) {
        if (!text || typeof text !== 'string') {
            throw new Error('Texto inválido para síntesis');
        }

        try {
            console.log(`🎯 Sintetizando con Edge TTS: "${text.substring(0, 50)}..." (${voiceType}, ${speed}x)`);

            const response = await fetch('/api/synthesize-speech', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text: text,
                    voice_type: voiceType,
                    speed: speed
                })
            });

            const data = await response.json();

            if (data.success) {
                console.log(`✅ Síntesis exitosa con ${data.provider} (${data.voice_used || voiceType})`);
                return {
                    success: true,
                    audioUrl: data.audio_url,
                    provider: data.provider,
                    voiceUsed: data.voice_used || voiceType
                };
            } else {
                throw new Error(data.error || 'Error en la síntesis de voz');
            }

        } catch (error) {
            console.error('❌ Error en síntesis Edge TTS:', error);
            throw error;
        }
    }

    /**
     * Reproducir audio sintetizado
     */
    async playAudio(audioUrl) {
        return new Promise((resolve, reject) => {
            try {
                // Detener audio anterior si existe
                if (this.currentAudio) {
                    this.currentAudio.pause();
                    this.currentAudio = null;
                }

                this.currentAudio = new Audio(audioUrl);
                
                this.currentAudio.onloadeddata = () => {
                    console.log('🎵 Audio cargado, iniciando reproducción...');
                };

                this.currentAudio.onplay = () => {
                    console.log('▶️ Reproducción iniciada');
                };

                this.currentAudio.onended = () => {
                    console.log('✅ Reproducción completada');
                    this.currentAudio = null;
                    resolve();
                };

                this.currentAudio.onerror = (error) => {
                    console.error('❌ Error reproduciendo audio:', error);
                    this.currentAudio = null;
                    reject(new Error('Error al reproducir audio'));
                };

                this.currentAudio.play().catch(reject);

            } catch (error) {
                console.error('❌ Error configurando reproducción:', error);
                reject(error);
            }
        });
    }

    /**
     * Pausar reproducción actual
     */
    pauseAudio() {
        if (this.currentAudio && !this.currentAudio.paused) {
            this.currentAudio.pause();
            console.log('⏸️ Audio pausado');
            return true;
        }
        return false;
    }

    /**
     * Reanudar reproducción
     */
    resumeAudio() {
        if (this.currentAudio && this.currentAudio.paused) {
            this.currentAudio.play();
            console.log('▶️ Audio reanudado');
            return true;
        }
        return false;
    }

    /**
     * Detener reproducción
     */
    stopAudio() {
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio.currentTime = 0;
            this.currentAudio = null;
            console.log('⏹️ Audio detenido');
            return true;
        }
        return false;
    }

    /**
     * Verificar si hay audio reproduciéndose
     */
    isPlaying() {
        return this.currentAudio && !this.currentAudio.paused;
    }

    /**
     * Limpiar archivos de audio antiguos
     */
    async cleanupOldFiles(maxAgeHours = 24) {
        try {
            const response = await fetch('/api/cleanup-audio', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    max_age_hours: maxAgeHours
                })
            });

            const data = await response.json();
            if (data.success) {
                console.log('🧹 Limpieza de archivos completada');
            }
        } catch (error) {
            console.warn('Error en limpieza de archivos:', error);
        }
    }
}

// Crear instancia global
window.edgeTTS = new EdgeTTSManager();

// Exportar para uso en otros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EdgeTTSManager;
}

console.log('🎤 Edge TTS Manager cargado');