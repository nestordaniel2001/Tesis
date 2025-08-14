/**
 * auditory_assistant.js - Asistente auditivo con grabación y transcripción
 */

// Variables globales para el control de grabación y transcripción
let auditoryState = {
    mediaRecorder: null,
    audioChunks: [],
    isRecording: false,
    isPaused: false,
    audioStream: null,
    recognition: null,
    finalTranscript: '',
    interimTranscript: '',
    isTranscribing: false
};

/**
 * Inicialización principal del asistente auditivo
 */
function initAuditoryAssistant() {
    if (window.auditoryAssistantInitialized) return;
    window.auditoryAssistantInitialized = true;

    console.log('🎤 Inicializando Asistente Auditivo...');

    // Configurar elementos del DOM
    setupAuditoryDOMElements();
    
    // Configurar event listeners
    setupAuditoryEventListeners();
    
    // Configurar reconocimiento de voz
    setupSpeechRecognition();
    
    // Configurar modal de guardar transcripción
    setupSaveTranscriptionModal();
    
    console.log('✅ Asistente Auditivo inicializado correctamente');
}

/**
 * Configurar elementos del DOM
 */
function setupAuditoryDOMElements() {
    const elements = {
        recordBtn: document.getElementById("recordBtn"),
        pauseBtn: document.getElementById("pauseBtn"),
        stopBtn: document.getElementById("stopBtn"),
        transcriptBox: document.getElementById("transcriptBox"),
        saveBtn: document.getElementById("saveBtn"),
        clearBtn: document.getElementById("btnlimpiar")
    };

    // Verificar elementos críticos
    const requiredElements = ['recordBtn', 'pauseBtn', 'stopBtn', 'transcriptBox'];
    const missingElements = requiredElements.filter(el => !elements[el]);
    
    if (missingElements.length > 0) {
        console.error('❌ Elementos críticos faltantes:', missingElements);
        return false;
    }

    return elements;
}

/**
 * Configurar event listeners
 */
function setupAuditoryEventListeners() {
    const elements = setupAuditoryDOMElements();
    if (!elements) return;

    // === EVENTOS DE GRABACIÓN ===
    if (elements.recordBtn) {
        elements.recordBtn.addEventListener('click', startRecording);
    }

    if (elements.pauseBtn) {
        elements.pauseBtn.addEventListener('click', pauseRecording);
    }

    if (elements.stopBtn) {
        elements.stopBtn.addEventListener('click', stopRecording);
    }

    // === EVENTOS DE CONTROL ===
    if (elements.clearBtn) {
        elements.clearBtn.addEventListener('click', clearTranscription);
    }

    if (elements.saveBtn) {
        elements.saveBtn.addEventListener('click', openSaveTranscriptionModal);
    }
}

/**
 * Configurar reconocimiento de voz
 */
function setupSpeechRecognition() {
    // Verificar soporte del navegador
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
        console.warn('⚠️ Reconocimiento de voz no soportado en este navegador');
        showAuditoryNotification('Reconocimiento de voz no soportado en este navegador', 'error');
        return;
    }

    auditoryState.recognition = new SpeechRecognition();
    auditoryState.recognition.lang = 'es-ES';
    auditoryState.recognition.interimResults = true;
    auditoryState.recognition.continuous = true;
    auditoryState.recognition.maxAlternatives = 1;

    auditoryState.recognition.onresult = (event) => {
        let interimTranscript = '';
        
        auditoryState.interimTranscript = ''; // Reset interim transcript
        for (let i = event.resultIndex; i < event.results.length; ++i) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                auditoryState.finalTranscript += transcript + ' ';
            } else {
                interimTranscript += transcript;
            }
            auditoryState.interimTranscript = interimTranscript;
        }
        
        updateTranscriptDisplay();
    };

    auditoryState.recognition.onstart = () => {
        console.log('🎯 Reconocimiento de voz iniciado');
        auditoryState.isTranscribing = true;
    };

    auditoryState.recognition.onend = () => {
        console.log('⏹️ Reconocimiento de voz terminado');
        auditoryState.isTranscribing = false;
        
        // Reiniciar si aún está grabando
        if (auditoryState.isRecording && !auditoryState.isPaused) {
            setTimeout(() => {
                if (auditoryState.isRecording && !auditoryState.isPaused) {
                    auditoryState.recognition.start();
                }
            }, 100);
        }
    };

    auditoryState.recognition.onerror = (event) => {
        console.error('❌ Error en reconocimiento de voz:', event.error);
        
        if (event.error === 'no-speech') {
            console.log('ℹ️ No se detectó habla, continuando...');
        } else if (event.error === 'network') {
            showAuditoryNotification('Error de red en reconocimiento de voz', 'error');
        } else {
            showAuditoryNotification('Error en reconocimiento de voz: ' + event.error, 'error');
        }
    };
}

/**
 * Iniciar grabación
 */
async function startRecording() {
    if (auditoryState.isRecording) return;

    try {
        console.log('🎤 Iniciando grabación...');
        
        // Solicitar permisos de micrófono
        auditoryState.audioStream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            }
        });

        // Configurar MediaRecorder
        auditoryState.mediaRecorder = new MediaRecorder(auditoryState.audioStream, {
            mimeType: 'audio/webm;codecs=opus'
        });
        
        auditoryState.audioChunks = [];

        auditoryState.mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                auditoryState.audioChunks.push(event.data);
            }
        };

        auditoryState.mediaRecorder.onstop = () => {
            console.log('📁 Grabación detenida, procesando audio...');
            processRecordedAudio();
        };

        // Iniciar grabación
        auditoryState.mediaRecorder.start(1000); // Capturar datos cada segundo
        
        // Iniciar reconocimiento de voz
        if (auditoryState.recognition) {
            auditoryState.recognition.start();
        }

        // Actualizar estado
        auditoryState.isRecording = true;
        auditoryState.isPaused = false;
        
        updateRecordingButtons();
        showAuditoryNotification('Grabación iniciada', 'success');

    } catch (error) {
        console.error('❌ Error al iniciar grabación:', error);
        showAuditoryNotification('Error al acceder al micrófono: ' + error.message, 'error');
    }
}

/**
 * Pausar grabación
 */
function pauseRecording() {
    if (!auditoryState.mediaRecorder || !auditoryState.isRecording) return;

    if (!auditoryState.isPaused) {
        console.log('⏸️ Pausando grabación...');
        
        auditoryState.mediaRecorder.pause();
        
        if (auditoryState.recognition && auditoryState.isTranscribing) {
            auditoryState.recognition.stop();
        }
        
        auditoryState.isPaused = true;
        updateRecordingButtons();
        showAuditoryNotification('Grabación pausada', 'info');
        
    } else {
        console.log('▶️ Reanudando grabación...');
        
        auditoryState.mediaRecorder.resume();
        
        if (auditoryState.recognition) {
            auditoryState.recognition.start();
        }
        
        auditoryState.isPaused = false;
        updateRecordingButtons();
        showAuditoryNotification('Grabación reanudada', 'info');
    }
}

/**
 * Detener grabación
 */
function stopRecording() {
    if (!auditoryState.isRecording) return;

    console.log('⏹️ Deteniendo grabación...');

    // Detener MediaRecorder
    if (auditoryState.mediaRecorder && auditoryState.mediaRecorder.state !== 'inactive') {
        auditoryState.mediaRecorder.stop();
    }

    // Detener reconocimiento de voz
    if (auditoryState.recognition && auditoryState.isTranscribing) {
        auditoryState.recognition.stop();
    }

    // Detener stream de audio
    if (auditoryState.audioStream) {
        auditoryState.audioStream.getTracks().forEach(track => track.stop());
        auditoryState.audioStream = null;
    }

    // Actualizar estado
    auditoryState.isRecording = false;
    auditoryState.isPaused = false;
    
    updateRecordingButtons();
    showAuditoryNotification('Grabación detenida', 'info');
}

/**
 * Procesar audio grabado
 */
function processRecordedAudio() {
    if (auditoryState.audioChunks.length === 0) return;

    const audioBlob = new Blob(auditoryState.audioChunks, { type: 'audio/webm' });
    const audioUrl = URL.createObjectURL(audioBlob);

    // Crear elemento de audio para reproducir la grabación
    const audioElement = document.createElement('audio');
    audioElement.src = audioUrl;
    audioElement.controls = true;
    audioElement.style.cssText = `
        width: 100%;
        margin-top: 15px;
        border-radius: 8px;
    `;

    // Buscar contenedor para el audio
    const audioContainer = document.querySelector('.save-audio') || 
                          document.querySelector('.transcription-section') ||
                          document.querySelector('.auditory-mode-card');

    if (audioContainer) {
        // Remover audio anterior si existe
        const existingAudio = audioContainer.querySelector('audio');
        if (existingAudio) {
            existingAudio.remove();
        }
        
        audioContainer.appendChild(audioElement);
        console.log('🎵 Audio de grabación agregado a la interfaz');
    }

    // Guardar referencia del blob para uso posterior
    auditoryState.lastRecordingBlob = audioBlob;
}

/**
 * Actualizar display de transcripción
 */
function updateTranscriptDisplay() {
    const transcriptBox = document.getElementById('transcriptBox');
    if (!transcriptBox) return;

    // Combinar texto final e intermedio
    const fullText = (auditoryState.finalTranscript || '') + (auditoryState.interimTranscript || '');
    
    console.log('📝 Actualizando transcripción:', {
        final: auditoryState.finalTranscript?.length || 0,
        interim: auditoryState.interimTranscript?.length || 0,
        total: fullText.length
    });
    transcriptBox.value = fullText;
    
    // Scroll automático al final
    transcriptBox.scrollTop = transcriptBox.scrollHeight;
}

/**
 * Limpiar transcripción
 */
function clearTranscription() {
    auditoryState.finalTranscript = '';
    auditoryState.interimTranscript = '';
    auditoryState.interimTranscript = '';
    
    const transcriptBox = document.getElementById('transcriptBox');
    if (transcriptBox) {
        transcriptBox.value = '';
    }
    
    // Remover audio si existe
    const audioElement = document.querySelector('.auditory-mode-card audio');
    if (audioElement) {
        audioElement.remove();
    }
    
    showAuditoryNotification('Transcripción limpiada', 'info');
    
    console.log('🧹 Transcripción limpiada');
}

/**
 * Actualizar botones de grabación
 */
function updateRecordingButtons() {
    const recordBtn = document.getElementById('recordBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const stopBtn = document.getElementById('stopBtn');

    if (!recordBtn || !pauseBtn || !stopBtn) return;

    if (auditoryState.isRecording) {
        if (auditoryState.isPaused) {
            recordBtn.textContent = 'Reanudar';
            recordBtn.classList.remove('active');
            pauseBtn.textContent = 'Reanudar';
            pauseBtn.classList.add('active');
        } else {
            recordBtn.textContent = 'Grabando...';
            recordBtn.classList.add('active');
            pauseBtn.textContent = 'Pausar';
            pauseBtn.classList.remove('active');
        }
        stopBtn.disabled = false;
    } else {
        recordBtn.textContent = 'Grabar';
        recordBtn.classList.remove('active');
        pauseBtn.textContent = 'Pausar';
        pauseBtn.classList.remove('active');
        stopBtn.disabled = true;
    }
}

/**
 * Configurar modal de guardar transcripción
 */
function setupSaveTranscriptionModal() {
    const modal = document.getElementById("save-transcription-modal");
    const overlay = document.getElementById("transcription-modal-overlay");
    const closeBtn = document.getElementById("close-transcription-modal");
    const cancelBtn = document.getElementById("cancel-transcription-btn");
    const confirmBtn = document.getElementById("confirm-transcription-btn");
    const titleInput = document.getElementById("transcription-title");
    const charCounter = document.querySelector(".transcription-char-counter");
    
    if (!modal || !overlay || !titleInput) return;
    
    // Cerrar modal
    function closeModal() {
        modal.style.display = "none";
        overlay.style.display = "none";
        titleInput.value = "";
        updateTranscriptionCharCounter();
    }
    
    // Actualizar contador de caracteres
    function updateTranscriptionCharCounter() {
        if (charCounter && titleInput) {
            const length = titleInput.value.length;
            charCounter.textContent = `${length}/50 caracteres`;
            charCounter.style.color = length > 45 ? '#ef4444' : '#6b7280';
        }
    }
    
    // Event listeners
    if (closeBtn) closeBtn.addEventListener("click", closeModal);
    if (cancelBtn) cancelBtn.addEventListener("click", closeModal);
    if (overlay) overlay.addEventListener("click", closeModal);
    
    if (titleInput) {
        titleInput.addEventListener("input", updateTranscriptionCharCounter);
        titleInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                if (confirmBtn && !confirmBtn.disabled) {
                    confirmBtn.click();
                }
            }
        });
    }
    
    if (confirmBtn) {
        confirmBtn.addEventListener("click", saveTranscription);
    }
    
    // Cerrar con Escape
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && modal.style.display !== "none") {
            closeModal();
        }
    });
}

/**
 * Abrir modal de guardar transcripción
 */
function openSaveTranscriptionModal() {
    const transcriptBox = document.getElementById('transcriptBox');
    const text = transcriptBox?.value?.trim();
    
    console.log('💾 Intentando abrir modal de guardado:', {
        hasTranscriptBox: !!transcriptBox,
        textLength: text?.length || 0,
        finalTranscript: auditoryState.finalTranscript?.length || 0,
        interimTranscript: auditoryState.interimTranscript?.length || 0
    });
    
    if (!text) {
        showAuditoryNotification('No hay transcripción para guardar', 'error');
        return;
    }
    
    const modal = document.getElementById("save-transcription-modal");
    const overlay = document.getElementById("transcription-modal-overlay");
    const titleInput = document.getElementById("transcription-title");
    
    if (modal && overlay) {
        modal.style.display = "block";
        overlay.style.display = "block";
        
        // Enfocar el input del título
        if (titleInput) {
            setTimeout(() => titleInput.focus(), 100);
        }
    }
}

/**
 * Guardar transcripción en la base de datos
 */
async function saveTranscription() {
    const titleInput = document.getElementById("transcription-title");
    const confirmBtn = document.getElementById("confirm-transcription-btn");
    const transcriptBox = document.getElementById('transcriptBox');
    
    if (!titleInput || !confirmBtn || !transcriptBox) return;
    
    const title = titleInput.value.trim();
    const content = transcriptBox.value.trim();
    
    console.log('💾 Guardando transcripción:', {
        title: title,
        contentLength: content.length,
        finalTranscript: auditoryState.finalTranscript?.length || 0,
        interimTranscript: auditoryState.interimTranscript?.length || 0
    });
    
    // Validaciones
    if (!title) {
        showAuditoryNotification('Por favor ingresa un título', 'error');
        titleInput.focus();
        return;
    }
    
    if (title.length > 50) {
        showAuditoryNotification('El título no puede exceder 50 caracteres', 'error');
        titleInput.focus();
        return;
    }
    
    if (!content) {
        showAuditoryNotification('No hay transcripción para guardar', 'error');
        return;
    }
    
    // Asegurar que tenemos el contenido más actualizado
    const finalContent = content || auditoryState.finalTranscript || '';
    if (!finalContent.trim()) {
        showAuditoryNotification('No hay contenido para guardar', 'error');
        return;
    }
    
    // Mostrar estado de carga
    const originalText = confirmBtn.textContent;
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Guardando...';
    
    try {
        const token = localStorage.getItem('auth_token');
        if (!token) {
            throw new Error('No hay sesión activa');
        }
        
        // Guardar como documento (sin audio, solo transcripción)
        const response = await fetch('/api/documents', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                titulo: title,
                contenido: finalContent
            })
        });
        
        const data = await response.json();
        
        if (response.ok && data.status === 'success') {
            showAuditoryNotification('Transcripción guardada exitosamente', 'success');
            
            console.log('✅ Transcripción guardada:', data);
            
            // Cerrar modal
            const modal = document.getElementById("save-transcription-modal");
            const overlay = document.getElementById("transcription-modal-overlay");
            if (modal && overlay) {
                modal.style.display = "none";
                overlay.style.display = "none";
                titleInput.value = "";
            }
            
            // Limpiar transcripción actual
            clearTranscription();
            
        } else {
            throw new Error(data.error || 'Error al guardar la transcripción');
        }
        
    } catch (error) {
        console.error('Error guardando transcripción:', error);
        showAuditoryNotification('Error al guardar la transcripción: ' + error.message, 'error');
    } finally {
        // Restaurar botón
        confirmBtn.disabled = false;
        confirmBtn.textContent = originalText;
    }
}

/**
 * Mostrar notificación
 */
function showAuditoryNotification(message, type = 'info') {
    console.log(`📢 ${type.toUpperCase()}: ${message}`);
    
    // Crear notificación visual
    const notification = document.createElement('div');
    notification.className = `auditory-notification ${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 16px;
        border-radius: 6px;
        color: white;
        font-size: 14px;
        font-weight: 500;
        z-index: 10000;
        max-width: 300px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        transform: translateX(100%);
        transition: transform 0.3s ease;
        background-color: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
    `;
    
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
            <span>${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
            <span style="flex: 1;">${message}</span>
            <button onclick="this.parentElement.parentElement.remove()" 
                    style="background: none; border: none; color: white; font-size: 16px; cursor: pointer; padding: 0;">×</button>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => notification.style.transform = 'translateX(0)', 100);
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 300);
    }, 3000);
}

/**
 * Función de prueba para verificar el reconocimiento de voz
 */
function testSpeechRecognition() {
    console.log('🧪 Probando reconocimiento de voz...');
    
    if (!auditoryState.recognition) {
        console.error('❌ Reconocimiento de voz no disponible');
        return;
    }
    
    console.log('📊 Estado actual:', {
        isRecording: auditoryState.isRecording,
        isPaused: auditoryState.isPaused,
        isTranscribing: auditoryState.isTranscribing,
        finalTranscript: auditoryState.finalTranscript?.length || 0,
        interimTranscript: auditoryState.interimTranscript?.length || 0
    });
}

// ===== INICIALIZACIÓN Y LIMPIEZA =====

document.addEventListener("DOMContentLoaded", function() {
    // Limpiar cualquier inicialización previa
    if (window.auditoryAssistantInitialized) {
        if (auditoryState.mediaRecorder && auditoryState.mediaRecorder.state !== 'inactive') {
            auditoryState.mediaRecorder.stop();
        }
        if (auditoryState.audioStream) {
            auditoryState.audioStream.getTracks().forEach(track => track.stop());
        }
        if (auditoryState.recognition) {
            auditoryState.recognition.stop();
        }
    }
    
    // Pequeño delay para asegurar que el DOM esté completamente cargado
    setTimeout(() => {
        initAuditoryAssistant();
        
        // Hacer la función de prueba disponible globalmente para debugging
        window.testSpeechRecognition = testSpeechRecognition;
    }, 100);
});

// Limpiar al cerrar la página
window.addEventListener("beforeunload", () => {
    if (auditoryState.mediaRecorder && auditoryState.mediaRecorder.state !== 'inactive') {
        auditoryState.mediaRecorder.stop();
    }
    if (auditoryState.audioStream) {
        auditoryState.audioStream.getTracks().forEach(track => track.stop());
    }
    if (auditoryState.recognition) {
        auditoryState.recognition.stop();
    }
});

// Manejar cambios de visibilidad de la página
document.addEventListener("visibilitychange", () => {
    if (document.hidden && auditoryState.isRecording) {
        // Pausar cuando la página no es visible
        pauseRecording();
    }
});

console.log('🎤 Módulo auditory_assistant.js cargado correctamente');