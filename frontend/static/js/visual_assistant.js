/**
 * visual_assistant.js - Asistente visual mejorado con OpenAI TTS
 */

// Variables globales para el control de síntesis de voz
let speechState = {
    utterance: null,
    isPaused: false,
    isReading: false,
    currentIndex: 0,
    sentences: [],
    progressInterval: null,
    startTime: 0,
    currentVoiceType: 'mujer',
    currentSpeed: 1.0,
    voices: [],
    currentAudio: null,
    useOpenAI: true // Preferir OpenAI TTS
};

const synth = window.speechSynthesis;

/**
 * Inicialización principal del asistente visual
 */
function initSpeechAssistant() {
    if (window.speechAssistantInitialized) return;
    window.speechAssistantInitialized = true;

    console.log('🎧 Inicializando Asistente Visual con OpenAI TTS...');

    // Cargar configuración del usuario
    loadUserVoiceSettings();
    
    // Configurar elementos del DOM
    setupDOMElements();
    
    // Configurar event listeners
    setupEventListeners();
    
    // Configurar modal de guardar documento
    setupSaveDocumentModal();
    
    console.log('✅ Asistente Visual inicializado correctamente');
}

/**
 * Cargar configuración de voz del usuario
 */
function loadUserVoiceSettings() {
    try {
        const userConfig = JSON.parse(localStorage.getItem('user_config') || '{}');
        speechState.currentVoiceType = userConfig.tipo_voz || 'mujer';
        speechState.currentSpeed = userConfig.velocidad_lectura || 1.0;
        
        // Aplicar configuración a los controles visuales
        const voiceSelector = document.getElementById("voice-selector");
        const speedSelector = document.getElementById("speed-selector");
        const speedDisplayVisual = document.getElementById("speed-display-visual");
        
        if (voiceSelector) {
            voiceSelector.value = speechState.currentVoiceType;
        }
        
        if (speedSelector) {
            speedSelector.value = speechState.currentSpeed;
        }
        
        if (speedDisplayVisual) {
            speedDisplayVisual.textContent = `${speechState.currentSpeed}x`;
        }
        
        console.log(`Configuración cargada: Voz ${speechState.currentVoiceType}, Velocidad ${speechState.currentSpeed}x`);
    } catch (error) {
        console.warn('Error cargando configuración de usuario:', error);
        speechState.currentVoiceType = 'mujer';
        speechState.currentSpeed = 1.0;
    }
}

/**
 * Guardar preferencia de tipo de voz
 */
function saveVoicePreference(voiceType) {
    try {
        const userConfig = JSON.parse(localStorage.getItem('user_config') || '{}');
        userConfig.tipo_voz = voiceType;
        localStorage.setItem('user_config', JSON.stringify(userConfig));
        
        // Sincronizar con el backend si hay token de autenticación
        const token = localStorage.getItem('auth_token');
        if (token) {
            fetch('/api/user/config', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    tipo_voz: voiceType
                })
            }).catch(error => {
                console.warn('Error sincronizando configuración de voz:', error);
            });
        }
    } catch (error) {
        console.warn('Error guardando preferencia de voz:', error);
    }
}

/**
 * Configurar elementos del DOM
 */
function setupDOMElements() {
    const elements = {
        btnExaminar: document.getElementById("btn-examinar"),
        fileInput: document.getElementById("file-input"),
        archivoNombreBtn: document.getElementById("archivo-nombre"),
        readingContent: document.querySelector(".reading-content"),
        playPauseBtn: document.getElementById("play-pause-btn"),
        progressBar: document.getElementById("progress-bar"),
        progressContainer: document.getElementById("progress-container"),
        speedControl: document.getElementById("speed-control"),
        speedDisplay: document.getElementById("speed-display"),
        overlay: document.getElementById("overlay"),
        btnCerrarMax: document.getElementById("btn-cerrar-max")
    };

    // Verificar elementos críticos
    const requiredElements = ['playPauseBtn', 'progressBar', 'speedControl'];
    const missingElements = requiredElements.filter(el => !elements[el]);
    
    if (missingElements.length > 0) {
        console.error('❌ Elementos críticos faltantes:', missingElements);
        return false;
    }

    // Configurar display inicial de velocidad
    if (elements.speedControl && elements.speedDisplay) {
        elements.speedControl.value = speechState.currentSpeed;
        elements.speedDisplay.textContent = `${speechState.currentSpeed}x`;
    }

    return elements;
}

/**
 * Configurar event listeners
 */
function setupEventListeners() {
    const elements = setupDOMElements();
    if (!elements) return;

    // === EVENTOS DE ARCHIVOS ===
    if (elements.btnExaminar && elements.fileInput) {
        elements.btnExaminar.addEventListener("click", () => {
            elements.fileInput.click();
        });
    }

    if (elements.fileInput) {
        elements.fileInput.addEventListener("change", handleFileSelection);
    }

    // === EVENTOS DE CONTROL ===
    if (elements.playPauseBtn) {
        elements.playPauseBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            togglePlayPause();
        });
    }

    // Botón de reiniciar
    const restartBtn = document.getElementById("restart-btn");
    if (restartBtn) {
        restartBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            stopReading();
            speechState.currentIndex = 0;
            speakText();
        });
    }
    if (elements.speedControl) {
        elements.speedControl.addEventListener("input", handleSpeedChange);
    }

    if (elements.progressContainer) {
        elements.progressContainer.addEventListener("click", handleProgressClick);
        elements.progressContainer.style.cursor = "pointer";
    }

    // === EVENTOS DE SELECCIÓN DE VOZ ===
    const voiceSelector = document.getElementById("voice-selector");
    const speedSelector = document.getElementById("speed-selector");
    const speedDisplayVisual = document.getElementById("speed-display-visual");
    
    if (voiceSelector) {
        voiceSelector.addEventListener("change", (e) => {
            speechState.currentVoiceType = e.target.value;
            saveVoicePreference(e.target.value);
            showNotification(`Voz cambiada a: ${e.target.value === 'mujer' ? 'Femenina' : 'Masculina'}`, 'info');
        });
    }
    
    if (speedSelector && speedDisplayVisual) {
        speedSelector.addEventListener("input", (e) => {
            const newSpeed = parseFloat(e.target.value);
            speechState.currentSpeed = newSpeed;
            speedDisplayVisual.textContent = `${newSpeed}x`;
            
            // Sincronizar con el control principal
            if (elements.speedControl) {
                elements.speedControl.value = newSpeed;
            }
            if (elements.speedDisplay) {
                elements.speedDisplay.textContent = `${newSpeed}x`;
            }
            
            saveSpeedPreference(newSpeed);
        });
    }
    
    // === EVENTOS DE UI ===
    setupUIControls(elements);
    
    // Configurar botón de guardar documento
    const saveDocumentBtn = document.getElementById("save-document-btn");
    if (saveDocumentBtn) {
        saveDocumentBtn.addEventListener("click", openSaveDocumentModal);
    }
}

/**
 * Configurar controles de UI (zoom, limpiar, etc.)
 */
function setupUIControls(elements) {
    // Botón Limpiar
    const btnLimpiar = document.getElementById("btn-limpiar");
    if (btnLimpiar) {
        btnLimpiar.addEventListener("click", () => {
            if (elements.readingContent) {
                elements.readingContent.innerHTML = "";
                if (elements.archivoNombreBtn) {
                    elements.archivoNombreBtn.textContent = "Seleccionar archivo";
                }
                stopReading();
            }
        });
    }

    // Botones de Zoom
    const btnZoomIn = document.getElementById("btn-zoom-in");
    const btnZoomOut = document.getElementById("btn-zoom-out");
    
    if (btnZoomIn && elements.readingContent) {
        btnZoomIn.addEventListener("click", () => {
            const currentSize = parseFloat(getComputedStyle(elements.readingContent).fontSize);
            elements.readingContent.style.fontSize = `${currentSize + 2}px`;
        });
    }

    if (btnZoomOut && elements.readingContent) {
        btnZoomOut.addEventListener("click", () => {
            const currentSize = parseFloat(getComputedStyle(elements.readingContent).fontSize);
            if (currentSize > 10) {
                elements.readingContent.style.fontSize = `${currentSize - 2}px`;
            }
        });
    }

    // Botón de maximizar
    const btnToggleSize = document.getElementById("btn-toggle-size");
    if (btnToggleSize && elements.readingContent && elements.overlay) {
        btnToggleSize.addEventListener("click", () => {
            const isMaximized = elements.readingContent.classList.contains("maximized");
            elements.readingContent.classList.toggle("maximized");
            elements.overlay.style.display = isMaximized ? "none" : "block";
        });
    }

    // Cerrar vista maximizada
    if (elements.btnCerrarMax && elements.readingContent && elements.overlay) {
        elements.btnCerrarMax.addEventListener("click", () => {
            elements.readingContent.classList.remove("maximized");
            elements.overlay.style.display = "none";
        });

        elements.overlay.addEventListener("click", () => {
            elements.readingContent.classList.remove("maximized");
            elements.overlay.style.display = "none";
        });
    }
}

/**
 * Configurar modal de guardar documento
 */
function setupSaveDocumentModal() {
    const modal = document.getElementById("save-document-modal");
    const overlay = document.getElementById("modal-overlay");
    const closeBtn = document.getElementById("close-save-modal");
    const cancelBtn = document.getElementById("cancel-save-btn");
    const confirmBtn = document.getElementById("confirm-save-btn");
    const titleInput = document.getElementById("document-title");
    const charCounter = document.querySelector(".char-counter");
    
    if (!modal || !overlay || !titleInput) return;
    
    // Cerrar modal
    function closeModal() {
        modal.style.display = "none";
        overlay.style.display = "none";
        titleInput.value = "";
        updateCharCounter();
    }
    
    // Actualizar contador de caracteres
    function updateCharCounter() {
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
        titleInput.addEventListener("input", updateCharCounter);
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
        confirmBtn.addEventListener("click", saveDocument);
    }
    
    // Cerrar con Escape
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && modal.style.display !== "none") {
            closeModal();
        }
    });
}

/**
 * Abrir modal de guardar documento
 */
function openSaveDocumentModal() {
    const readingContent = document.querySelector(".reading-content");
    const text = readingContent?.innerText?.trim();
    
    if (!text) {
        showNotification('No hay contenido para guardar', 'error');
        return;
    }
    
    const modal = document.getElementById("save-document-modal");
    const overlay = document.getElementById("modal-overlay");
    const titleInput = document.getElementById("document-title");
    
    if (modal && overlay) {
        modal.style.display = "block";
        overlay.style.display = "block";
        
        // Enfocar el input del título
        if (titleInput) {
            setTimeout(() => titleInput.focus(), 100);
        }
    }
}

// Variable global para almacenar la ruta del archivo de audio generado
let currentAudioFilePath = null;
let allGeneratedAudioPaths = [];

/**
 * Guardar documento en la base de datos
 */
async function saveDocument() {
    const titleInput = document.getElementById("document-title");
    const confirmBtn = document.getElementById("confirm-save-btn");
    const readingContent = document.querySelector(".reading-content");
    
    if (!titleInput || !confirmBtn || !readingContent) return;
    
    const title = titleInput.value.trim();
    const content = readingContent.innerText?.trim();
    
    // Validaciones
    if (!title) {
        showNotification('Por favor ingresa un título', 'error');
        titleInput.focus();
        return;
    }
    
    if (title.length > 50) {
        showNotification('El título no puede exceder 50 caracteres', 'error');
        titleInput.focus();
        return;
    }
    
    if (!content) {
        showNotification('No hay contenido para guardar', 'error');
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
        
        const response = await fetch('/api/documents', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                titulo: title,
                contenido: content
            })
        });
        
        const data = await response.json();
        
        if (response.ok && data.status === 'success') {
            let message = 'Documento guardado exitosamente';
            if (data.has_audio && data.audio_filename) {
                message = `Documento y audio guardados exitosamente como "${data.audio_filename}"`;
            } else if (data.has_audio) {
                message = 'Documento y audio guardados exitosamente';
            }
            showNotification(message, 'success');
            
            // Cerrar modal
            const modal = document.getElementById("save-document-modal");
            const overlay = document.getElementById("modal-overlay");
            if (modal && overlay) {
                modal.style.display = "none";
                overlay.style.display = "none";
                titleInput.value = "";
            }
            
        } else {
            throw new Error(data.error || 'Error al guardar el documento');
        }
        
    } catch (error) {
        console.error('Error guardando documento:', error);
        showNotification('Error al guardar el documento: ' + error.message, 'error');
    } finally {
        // Restaurar botón
        confirmBtn.disabled = false;
        confirmBtn.textContent = originalText;
    }
}

/**
 * Manejar selección de archivo
 */
async function handleFileSelection(event) {
    const file = event.target.files[0];
    if (!file) return;

    const archivoNombreBtn = document.getElementById("archivo-nombre");
    if (archivoNombreBtn) {
        archivoNombreBtn.textContent = file.name;
    }

    showLoadingState(true);

    try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/leer-archivo", {
            method: "POST",
            body: formData
        });

        const data = await response.json();

        if (data.texto || data.status === 'success') {
            const texto = data.texto || data.contenido || '';
            mostrarTexto(texto);
            showNotification('Archivo cargado correctamente', 'success');
        } else {
            throw new Error(data.error || 'No se pudo leer el archivo');
        }
    } catch (error) {
        console.error("Error al leer archivo:", error);
        showNotification('Error al leer el archivo: ' + error.message, 'error');
    } finally {
        showLoadingState(false);
    }
}

/**
 * Mostrar/ocultar estado de carga
 */
function showLoadingState(isLoading) {
    const playPauseBtn = document.getElementById("play-pause-btn");
    if (playPauseBtn) {
        playPauseBtn.disabled = isLoading;
        if (isLoading) {
            playPauseBtn.innerHTML = "⏳";
            playPauseBtn.title = "Cargando...";
        } else {
            updateButtonState();
        }
    }
}

/**
 * Mostrar texto en el área de lectura
 */
function mostrarTexto(texto) {
    const readingContent = document.querySelector(".reading-content");
    if (!readingContent) return;

    // Detener cualquier lectura en curso
    stopReading();
    
    // Limpiar área de lectura
    readingContent.innerHTML = "";

    if (!texto || typeof texto !== 'string') {
        readingContent.innerHTML = "<p>No se pudo cargar el contenido del archivo.</p>";
        return;
    }

    // Dividir en párrafos
    const parrafos = texto.split(/\r?\n/);
    parrafos.forEach(line => {
        const trimmedLine = line.trim();
        if (trimmedLine !== "") {
            const p = document.createElement("p");
            p.textContent = trimmedLine;
            readingContent.appendChild(p);
        }
    });

    console.log(`📄 Texto cargado: ${parrafos.length} párrafos`);
}

/**
 * Manejar cambio de velocidad
 */
function handleSpeedChange() {
    const speedControl = document.getElementById("speed-control");
    const speedDisplay = document.getElementById("speed-display");
    
    if (!speedControl) return;

    const newSpeed = parseFloat(speedControl.value);
    speechState.currentSpeed = newSpeed;
    
    // Actualizar display
    if (speedDisplay) {
        speedDisplay.textContent = `${newSpeed}x`;
    }
    
    // Si hay una lectura en curso, aplicar nueva velocidad
    if (speechState.isReading && !speechState.isPaused) {
        console.log(`🔄 Cambiando velocidad a ${newSpeed}x`);
        
        // Si está usando OpenAI TTS, detener y continuar
        if (speechState.currentAudio) {
            speechState.currentAudio.pause();
            speechState.currentAudio = null;
            setTimeout(() => {
                if (speechState.isReading) {
                    speakFromCurrentIndex();
                }
            }, 100);
        } else {
            // Cancelar utterance actual del navegador y continuar con nueva velocidad
            synth.cancel();
            setTimeout(() => {
                if (speechState.isReading) {
                    speakFromCurrentIndex();
                }
            }, 100);
        }
    }
    
    // Guardar configuración
    saveSpeedPreference(newSpeed);
}

/**
 * Guardar preferencia de velocidad
 */
function saveSpeedPreference(speed) {
    try {
        const userConfig = JSON.parse(localStorage.getItem('user_config') || '{}');
        userConfig.velocidad_lectura = speed;
        localStorage.setItem('user_config', JSON.stringify(userConfig));
        
        // Sincronizar con el backend si hay token de autenticación
        const token = localStorage.getItem('auth_token');
        if (token) {
            fetch('/api/user/config', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    velocidad_lectura: speed
                })
            }).catch(error => {
                console.warn('Error sincronizando configuración de velocidad:', error);
            });
        }
    } catch (error) {
        console.warn('Error guardando preferencia de velocidad:', error);
    }
}

/**
 * Preparar texto para síntesis
 */
function prepareTextForSpeech(text) {
    if (!text || typeof text !== 'string') return [];

    // Dividir en oraciones de manera inteligente
    let sentences = text
        .split(/[.!?]+/)
        .map(s => s.trim())
        .filter(s => s.length > 0);

    // Si no hay oraciones, dividir por párrafos
    if (sentences.length === 0) {
        sentences = text
            .split(/\n+/)
            .map(s => s.trim())
            .filter(s => s.length > 0);
    }

    // Si aún no hay contenido, usar texto completo
    if (sentences.length === 0) {
        sentences = [text.trim()];
    }

    console.log(`📝 Texto preparado: ${sentences.length} segmentos`);
    return sentences;
}

/**
 * Sintetizar texto usando Edge TTS
 */
async function synthesizeWithEdgeTTS(text, voiceType, speed) {
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
                filePath: data.file_path,
                provider: data.provider
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
async function playAudioFromUrl(audioUrl) {
    return new Promise((resolve, reject) => {
        try {
            // Detener audio anterior si existe
            if (speechState.currentAudio) {
                speechState.currentAudio.pause();
                speechState.currentAudio = null;
            }

            speechState.currentAudio = new Audio(audioUrl);
            
            speechState.currentAudio.onloadeddata = () => {
                console.log('🎵 Audio cargado, iniciando reproducción...');
            };

            speechState.currentAudio.onplay = () => {
                console.log('▶️ Reproducción iniciada');
                speechState.isReading = true;
                speechState.isPaused = false;
                updateButtonState();
                startProgress();
            };

            speechState.currentAudio.onended = () => {
                console.log('✅ Reproducción completada');
                speechState.currentAudio = null;
                // Continuar con el siguiente segmento automáticamente
                speechState.currentIndex++;
                updateProgress();
                
                if (speechState.currentIndex < speechState.sentences.length && speechState.isReading && !speechState.isPaused) {
                    setTimeout(() => speakFromCurrentIndex(), 100);
                } else if (speechState.currentIndex >= speechState.sentences.length) {
                    stopReading();
                    showNotification('Lectura completada', 'success');
                }
                resolve();
            };

            speechState.currentAudio.onerror = (error) => {
                console.error('❌ Error reproduciendo audio:', error);
                speechState.currentAudio = null;
                reject(new Error('Error al reproducir audio'));
            };

            speechState.currentAudio.onpause = () => {
    console.log('⏸️ Audio pausado');
    // Solo actualizar isPaused si fue pausado intencionalmente
    // (no cuando el audio termina naturalmente)
    if (speechState.isReading) {
        speechState.isPaused = true;
        updateButtonState();
        stopProgress();
    }
};

            speechState.currentAudio.ontimeupdate = () => {
                updateProgressDuringPlayback();
            };
            speechState.currentAudio.play().catch(reject);

        } catch (error) {
            console.error('❌ Error configurando reproducción:', error);
            reject(error);
        }
    });
}

/**
 * Iniciar lectura de texto con Edge TTS
 */
async function speakText() {
    try {
        const readingContent = document.querySelector(".reading-content");
        const text = readingContent?.innerText?.trim();
        
        if (!text) {
            showNotification('No hay texto para leer', 'error');
            return;
        }

        console.log('🎯 Iniciando lectura con Edge TTS...');

        // Preparar texto
        speechState.sentences = prepareTextForSpeech(text);
        
        if (speechState.sentences.length === 0) {
            showNotification('No se pudo procesar el texto', 'error');
            return;
        }

        // Resetear estado
        speechState.currentIndex = 0;
        speechState.isPaused = false;
        speechState.isReading = true;

        // Detener cualquier síntesis anterior
        stopReading();
        
        // Iniciar lectura
        await speakFromCurrentIndex();
        
        showNotification('Iniciando lectura con Edge TTS...', 'info');
        
    } catch (error) {
        console.error('❌ Error en speakText:', error);
        showNotification('Error al iniciar la lectura', 'error');
        stopReading();
    }
}

/**
 * Hablar desde el índice actual usando Edge TTS
 */
async function speakFromCurrentIndex() {
    if (speechState.currentIndex >= speechState.sentences.length) {
        console.log('✅ Lectura completada');
        stopReading();
        showNotification('Lectura completada', 'success');
        return;
    }

    const currentText = speechState.sentences[speechState.currentIndex];
    console.log(`🗣️ Hablando segmento ${speechState.currentIndex + 1}/${speechState.sentences.length}: "${currentText.substring(0, 50)}..."`);

    try {
        // Intentar síntesis con Edge TTS
        const result = await synthesizeWithEdgeTTS(
            currentText, 
            speechState.currentVoiceType, 
            speechState.currentSpeed
        );

        if (result.success) {
            // Reproducir audio de Edge TTS
            await playAudioFromUrl(result.audioUrl);
            
            // Guardar la ruta del archivo para uso posterior
            if (result.filePath) {
                allGeneratedAudioPaths.push(result.filePath);
            }
            
            // El progreso se maneja en playAudioFromUrl.onended
        } else {
            throw new Error('Error en síntesis Edge TTS');
        }

    } catch (error) {
        console.error('❌ Error en síntesis Edge TTS, usando fallback del navegador:', error);
        
        // Fallback al TTS del navegador solo si OpenAI falla
        speechState.utterance = new SpeechSynthesisUtterance(currentText);
        speechState.utterance.lang = 'es-ES';
        speechState.utterance.rate = speechState.currentSpeed;
        speechState.utterance.pitch = 1.0;
        speechState.utterance.volume = 1.0;

        speechState.utterance.onstart = () => {
            speechState.startTime = Date.now();
            speechState.isReading = true;
            speechState.isPaused = false;
            updateButtonState();
            startProgress();
        };

        speechState.utterance.onend = () => {
            speechState.currentIndex++;
            updateProgress();
            
            if (!speechState.isPaused && speechState.currentIndex < speechState.sentences.length && speechState.isReading) {
                setTimeout(() => speakFromCurrentIndex(), 100);
            } else if (speechState.currentIndex >= speechState.sentences.length) {
                stopReading();
            }
        };

        speechState.utterance.onerror = (event) => {
            console.error('❌ Error en síntesis de voz:', event.error);
            showNotification('Error en la síntesis de voz', 'error');
            stopReading();
        };

        synth.speak(speechState.utterance);
    }
}

/**
 * Alternar entre play y pausa
 */
function togglePlayPause() {
    console.log(`🎮 Toggle Play/Pause - Estado actual: isReading=${speechState.isReading}, isPaused=${speechState.isPaused}, currentIndex=${speechState.currentIndex}`);
    
    // Verificar si hay texto para leer
    const readingContent = document.querySelector(".reading-content");
    const text = readingContent?.innerText?.trim();
    
    if (!text) {
        showNotification('No hay texto para leer', 'error');
        return;
    }

    // CASO 1: Está reproduciendo actualmente -> PAUSAR
    if (speechState.isReading && !speechState.isPaused) {
        console.log('🎯 Caso 1: Pausando reproducción activa');
        pauseReading();
        return;
    }
    
    // CASO 2: Está pausado -> REANUDAR
    if (speechState.isPaused && speechState.isReading) {
        console.log('🎯 Caso 2: Reanudando desde pausa');
        resumeReading();
        return;
    }
    
    // CASO 3: No está reproduciendo (inicial o detenido) -> INICIAR
    console.log('🎯 Caso 3: Iniciando nueva reproducción');
    speechState.currentIndex = 0;
    speakText();
}
/**
 * Pausar lectura
 */
function pauseReading() {
    console.log('⏸️ Pausando lectura...');
    
    // Cambiar estados ANTES de pausar para evitar conflictos
    speechState.isPaused = true;
    // NO cambiar speechState.isReading aquí, debe mantenerse true para poder reanudar
    
    if (speechState.currentAudio && !speechState.currentAudio.paused) {
        // Pausar audio de Edge TTS
        speechState.currentAudio.pause();
        console.log('🎵 Audio Edge TTS pausado');
    }
    
    if (synth.speaking) {
        // Pausar TTS del navegador
        synth.pause();
        console.log('🗣️ TTS navegador pausado');
    }
    
    stopProgress();
    updateButtonState();
    showNotification('Lectura pausada', 'info');
}
/**
 * Reanudar lectura
 */
function resumeReading() {
    console.log('▶️ Reanudando lectura...');
    
    // Cambiar estado ANTES de reanudar
    speechState.isPaused = false;
    
    if (speechState.currentAudio && speechState.currentAudio.paused) {
        // Reanudar audio de Edge TTS que estaba pausado
        speechState.currentAudio.play()
            .then(() => {
                console.log('🎵 Audio Edge TTS reanudado');
                updateButtonState();
                startProgress();
                showNotification('Reanudando lectura...', 'info');
            })
            .catch(error => {
                console.error('❌ Error reanudando audio Edge TTS:', error);
                // Si falla, continuar desde el índice actual
                speakFromCurrentIndex();
            });
    } else if (synth.paused) {
        // Reanudar TTS del navegador
        synth.resume();
        console.log('🗣️ TTS navegador reanudado');
        updateButtonState();
        startProgress();
        showNotification('Reanudando lectura...', 'info');
    } else {
        // Si no hay audio pausado, continuar desde el índice actual
        console.log('🔄 Continuando desde índice actual');
        speakFromCurrentIndex();
        showNotification('Reanudando lectura...', 'info');
    }
}

/**
 * Detener lectura completamente
 */
function stopReading() {
    console.log('⏹️ Deteniendo lectura...');
    
    speechState.isPaused = false;
    speechState.isReading = false;
    speechState.currentIndex = 0;
    
    if (speechState.currentAudio) {
        speechState.currentAudio.pause();
        speechState.currentAudio = null;
    }
    
    synth.cancel();
    stopProgress();
    updateButtonState();
    
    // Resetear barra de progreso
    const progressBar = document.getElementById("progress-bar");
    if (progressBar) {
        progressBar.style.width = "0%";
    }
}

/**
 * Actualizar estado del botón play/pause
 */
function updateButtonState() {
    const playPauseBtn = document.getElementById("play-pause-btn");
    if (!playPauseBtn) return;
    
    // Determinar estado real de reproducción
    const isEdgeTTSPlaying = speechState.currentAudio && !speechState.currentAudio.paused && !speechState.currentAudio.ended;
    const isBrowserTTSPlaying = synth.speaking && !synth.paused;
    const isActuallyPlaying = isEdgeTTSPlaying || isBrowserTTSPlaying;
    
    console.log(`🔄 Actualizando botón - Edge TTS: ${isEdgeTTSPlaying}, Browser: ${isBrowserTTSPlaying}, isPaused: ${speechState.isPaused}, isReading: ${speechState.isReading}`);
    
    if (speechState.isReading && !speechState.isPaused && isActuallyPlaying) {
        // REPRODUCIENDO
        playPauseBtn.innerHTML = "⏸️";
        playPauseBtn.title = "Pausar lectura";
        playPauseBtn.classList.add('playing');
        playPauseBtn.classList.remove('paused');
    } else if (speechState.isPaused && speechState.isReading) {
        // PAUSADO
        playPauseBtn.innerHTML = "▶️";
        playPauseBtn.title = "Reanudar lectura";
        playPauseBtn.classList.remove('playing');
        playPauseBtn.classList.add('paused');
    } else {
        // DETENIDO O INICIAL
        playPauseBtn.innerHTML = "▶️";
        playPauseBtn.title = "Iniciar lectura";
        playPauseBtn.classList.remove('playing', 'paused');
    }
}

/**
 * Iniciar actualización de progreso
 */
function startProgress() {
    stopProgress();
    
    speechState.progressInterval = setInterval(() => {
        updateProgress();
    }, 100);
}

/**
 * Detener actualización de progreso
 */
function stopProgress() {
    if (speechState.progressInterval) {
        clearInterval(speechState.progressInterval);
        speechState.progressInterval = null;
    }
}

/**
 * Actualizar barra de progreso
 */
function updateProgress() {
    const progressBar = document.getElementById("progress-bar");
    if (!progressBar || speechState.sentences.length === 0) return;

    // Calcular progreso basado en segmentos completados
    const progress = (speechState.currentIndex / speechState.sentences.length) * 100;
    
    const clampedProgress = Math.min(Math.max(progress, 0), 100);
    progressBar.style.width = `${clampedProgress}%`;
}

/**
 * Actualizar progreso durante la reproducción de audio
 */
function updateProgressDuringPlayback() {
    const progressBar = document.getElementById("progress-bar");
    if (!progressBar || speechState.sentences.length === 0 || !speechState.currentAudio) return;

    // Progreso base de segmentos completados
    const baseProgress = (speechState.currentIndex / speechState.sentences.length) * 100;
    
    // Progreso del audio actual
    const audioProgress = speechState.currentAudio.duration > 0 ? 
        (speechState.currentAudio.currentTime / speechState.currentAudio.duration) : 0;
    
    // Progreso del segmento actual
    const segmentProgress = (audioProgress / speechState.sentences.length) * 100;
    
    const totalProgress = Math.min(baseProgress + segmentProgress, 100);
    progressBar.style.width = `${totalProgress}%`;
}

/**
 * Manejar clic en barra de progreso
 */
function handleProgressClick(event) {
    if (speechState.sentences.length === 0) {
        showNotification('No hay texto cargado', 'error');
        return;
    }

    const progressContainer = document.getElementById("progress-container");
    if (!progressContainer) return;

    const rect = progressContainer.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, clickX / rect.width));
    const newIndex = Math.floor(percentage * speechState.sentences.length);

    if (newIndex >= 0 && newIndex < speechState.sentences.length) {
        console.log(`🎯 Saltando a segmento ${newIndex + 1}/${speechState.sentences.length}`);
        
        const wasReading = speechState.isReading && !speechState.isPaused;
        
        // Detener reproducción actual
        if (speechState.currentAudio) {
            speechState.currentAudio.pause();
            speechState.currentAudio = null;
        }
        synth.cancel();
        
        speechState.currentIndex = newIndex;
        updateProgress();
        
        // Continuar reproduciendo si estaba activo
        if (wasReading) {
            setTimeout(() => {
                if (speechState.isReading) {
                    speakFromCurrentIndex();
                }
            }, 150);
        }
        
        showNotification(`Posición: ${newIndex + 1}/${speechState.sentences.length}`, 'info');
    }
}

/**
 * Mostrar notificación
 */
function showNotification(message, type = 'info') {
    console.log(`📢 ${type.toUpperCase()}: ${message}`);
    
    // Crear notificación visual
    const notification = document.createElement('div');
    notification.className = `speech-notification ${type}`;
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

// ===== INICIALIZACIÓN Y LIMPIEZA =====

document.addEventListener("DOMContentLoaded", function() {
    // Limpiar cualquier inicialización previa
    if (window.speechAssistantInitialized) {
        synth.cancel();
        if (speechState.progressInterval) {
            clearInterval(speechState.progressInterval);
        }
    }
    
    // Pequeño delay para asegurar que el DOM esté completamente cargado
    setTimeout(() => {
        initSpeechAssistant();
        loadUserVoiceSettings();
    }, 100);
});

// Limpiar al cerrar la página
window.addEventListener("beforeunload", () => {
    if (speechState.currentAudio) {
        speechState.currentAudio.pause();
    }
    synth.cancel();
    stopProgress();
});

// Manejar cambios de visibilidad de la página
document.addEventListener("visibilitychange", () => {
    if (document.hidden && speechState.isReading) {
        // Pausar cuando la página no es visible
        pauseReading();
    }
});

console.log('📚 Módulo visual_assistant.js con OpenAI TTS cargado correctamente');