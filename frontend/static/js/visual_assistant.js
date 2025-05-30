// Verificación de variables globales
if (typeof utterance === 'undefined') {
    var utterance = null;
    var isPaused = false;
    var isReading = false;
    var currentIndex = 0;
    var sentences = [];
    var progressInterval = null;
    var totalDuration = 0;
    var startTime = 0;
}

const synth = window.speechSynthesis;

// Función para inicializar solo una vez
function initSpeechAssistant() {
    // Si ya está inicializado, salir
    if (window.speechAssistantInitialized) return;
    window.speechAssistantInitialized = true;

    // Elementos del DOM
    const btnExaminar = document.getElementById("btn-examinar");
    const fileInput = document.getElementById("file-input");
    const archivoNombreBtn = document.getElementById("archivo-nombre");
    const readingContent = document.querySelector(".reading-content");
    const playPauseBtn = document.getElementById("play-pause-btn");
    const progressBar = document.getElementById("progress-bar");
    const speedControl = document.getElementById("speed-control");
    const speedDisplay = document.getElementById("speed-display");
    const overlay = document.getElementById("overlay");
    const btnCerrarMax = document.getElementById("btn-cerrar-max");

    // Verificación de elementos esenciales
    if (!playPauseBtn || !progressBar || !speedControl) {
        console.error("Elementos esenciales no encontrados");
        return;
    }

    // Evento para el botón Examinar
    if (btnExaminar && fileInput) {
        btnExaminar.addEventListener("click", () => fileInput.click());
    }

    // Evento para selección de archivo
    if (fileInput) {
        fileInput.addEventListener("change", async (event) => {
            const file = event.target.files[0];
            if (!file) return;

            archivoNombreBtn.textContent = file.name;

            try {
                const formData = new FormData();
                formData.append("file", file);

                const res = await fetch("/leer-archivo", {
                    method: "POST",
                    body: formData
                });

                const data = await res.json();

                if (data.texto) {
                    mostrarTexto(data.texto);
                } else {
                    alert("No se pudo leer el archivo.");
                }
            } catch (err) {
                console.error("Error al leer archivo:", err);
                alert("Hubo un error al leer el archivo.");
            }
        });
    }

    // Botón Limpiar
    document.getElementById("btn-limpiar")?.addEventListener("click", () => {
        if (readingContent) {
            readingContent.innerHTML = "";
            if (archivoNombreBtn) archivoNombreBtn.textContent = "Seleccionar archivo";
            stopReading();
        }
    });

    // Botones Zoom
    document.getElementById("btn-zoom-in")?.addEventListener("click", () => {
        if (readingContent) {
            const currentSize = parseFloat(getComputedStyle(readingContent).fontSize);
            readingContent.style.fontSize = `${currentSize + 2}px`;
        }
    });

    document.getElementById("btn-zoom-out")?.addEventListener("click", () => {
        if (readingContent) {
            const currentSize = parseFloat(getComputedStyle(readingContent).fontSize);
            if (currentSize > 10) {
                readingContent.style.fontSize = `${currentSize - 2}px`;
            }
        }
    });

    // Botón Tamaño
    document.getElementById("btn-toggle-size")?.addEventListener("click", () => {
        if (readingContent) {
            const isMaximized = readingContent.classList.contains("maximized");
            readingContent.classList.toggle("maximized");
            if (overlay) overlay.style.display = isMaximized ? "none" : "block";
        }
    });

    // Cerrar vista maximizada
    if (btnCerrarMax) {
        btnCerrarMax.addEventListener("click", () => {
            if (readingContent) {
                readingContent.classList.remove("maximized");
                if (overlay) overlay.style.display = "none";
            }
        });
    }

    if (overlay) {
        overlay.addEventListener("click", () => {
            if (readingContent) {
                readingContent.classList.remove("maximized");
                overlay.style.display = "none";
            }
        });
    }

    // Control de velocidad - CORREGIDO
    speedControl.addEventListener("input", () => {
        const newRate = parseFloat(speedControl.value);
        
        // Actualizar display de velocidad
        if (speedDisplay) {
            speedDisplay.textContent = `${newRate}x`;
        }
        
        // Si hay una lectura en curso, aplicar nueva velocidad sin interrumpir
        if (utterance && isReading && !isPaused) {
            // Cancelar la síntesis actual
            synth.cancel();
            
            // Crear nueva utterance con la velocidad actualizada
            setTimeout(() => {
                speakFromCurrentIndex();
            }, 50);
        }
    });

    // Botón Play/Pause - SOLO responde a clics en el botón
    playPauseBtn.addEventListener("click", (e) => {
        e.stopPropagation(); // Evitar propagación del evento
        togglePlayPause();
    });

    // Prevenir que otros clics interfieran con la reproducción
    document.addEventListener("click", (e) => {
        // Solo pausar si se hace clic fuera del área de controles de audio
        const audioControls = document.querySelector(".playback-controls");
        const readingArea = document.querySelector(".reading-content");
        
        // No hacer nada si el clic fue en los controles o en el área de lectura
        if (audioControls?.contains(e.target) || readingArea?.contains(e.target)) {
            return;
        }
    });

    // Cargar voces disponibles
    loadVoices();
}

// Cambiar el DOMContentLoaded para usar la función de inicialización
document.addEventListener("DOMContentLoaded", function() {
    // Limpiar cualquier inicialización previa
    if (window.speechAssistantInitialized) {
        synth.cancel();
        if (progressInterval) clearInterval(progressInterval);
    }
    
    initSpeechAssistant();
});

// Función para mostrar texto en el área de lectura
function mostrarTexto(texto) {
    const readingContent = document.querySelector(".reading-content");
    if (!readingContent) return;

    stopReading();
    readingContent.innerHTML = "";

    const parrafos = texto.split(/\r?\n/);
    parrafos.forEach(line => {
        if (line.trim() !== "") {
            const p = document.createElement("p");
            p.textContent = line;
            readingContent.appendChild(p);
        }
    });
}

// Función para cargar voces
function loadVoices() {
    return new Promise(resolve => {
        const voices = synth.getVoices();
        if (voices.length) {
            resolve(voices);
        } else {
            synth.onvoiceschanged = () => {
                resolve(synth.getVoices());
            };
        }
    });
}

// Función para hablar desde el índice actual - CORREGIDA
async function speakFromCurrentIndex() {
    if (currentIndex >= sentences.length) {
        stopReading();
        return;
    }

    const voices = await loadVoices();
    utterance = new SpeechSynthesisUtterance();
    utterance.voice = voices.find(voice => voice.lang === 'es-ES') || voices[0];
    utterance.lang = 'es-ES';
    utterance.rate = parseFloat(document.getElementById("speed-control").value);
    utterance.text = sentences[currentIndex];

    // Marcar como reproduciendo
    isReading = true;
    isPaused = false;

    utterance.onstart = () => {
        startTime = Date.now();
        updateButtonState();
        startProgress();
    };

    utterance.onend = () => {
        currentIndex++;
        updateProgress();
        
        // Solo continuar si no está pausado y hay más oraciones
        if (!isPaused && currentIndex < sentences.length && isReading) {
            setTimeout(() => speakFromCurrentIndex(), 50);
        } else if (currentIndex >= sentences.length) {
            stopReading();
        }
    };

    utterance.onerror = (event) => {
        console.error("Error en síntesis de voz:", event);
        stopReading();
    };

    synth.speak(utterance);
}

// Función principal para iniciar la lectura - MEJORADA
async function speakText() {
    try {
        const text = document.querySelector(".reading-content")?.innerText.trim();
        if (!text) return alert("No hay texto para leer.");

        // Dividir el texto en oraciones de manera más inteligente
        sentences = text.split(/[.!?]+\s*/).filter(s => s.trim().length > 0);
        
        // Si no hay oraciones, usar párrafos
        if (sentences.length === 0) {
            sentences = text.split(/\n+/).filter(s => s.trim().length > 0);
        }
        
        // Si aún no hay contenido, usar el texto completo
        if (sentences.length === 0) {
            sentences = [text];
        }
        
        currentIndex = 0;
        isPaused = false;
        isReading = true;

        synth.cancel(); // Limpiar cualquier síntesis anterior
        
        speakFromCurrentIndex();
    } catch (error) {
        console.error("Error en speakText:", error);
        alert("Error al iniciar la lectura");
    }
}

// Detener la lectura completamente - CORREGIDA
function stopReading() {
    isPaused = false;
    isReading = false;
    synth.cancel();
    stopProgress();
    currentIndex = 0;
    updateButtonState();
    
    // Resetear barra de progreso
    const progressBar = document.getElementById("progress-bar");
    if (progressBar) {
        progressBar.style.width = "0%";
    }
}

// Pausar la lectura - MANTIENE LA POSICIÓN
function pauseReading() {
    isPaused = true;
    isReading = false;
    synth.cancel();
    stopProgress();
    updateButtonState();
    // NO resetear currentIndex para mantener la posición
}

// Reanudar la lectura desde donde se pausó
function resumeReading() {
    if (currentIndex < sentences.length) {
        isPaused = false;
        isReading = true;
        speakFromCurrentIndex();
    }
}

// Alternar entre play/pause - LÓGICA SIMPLIFICADA
function togglePlayPause() {
    console.log(`Estado actual: isReading=${isReading}, isPaused=${isPaused}, currentIndex=${currentIndex}`);
    
    if (isReading && !isPaused) {
        // Está reproduciendo -> PAUSAR
        pauseReading();
    } else if (isPaused || (currentIndex > 0 && currentIndex < sentences.length)) {
        // Está pausado o interrumpido -> REANUDAR
        resumeReading();
    } else {
        // No está reproduciendo y está al inicio -> INICIAR
        speakText();
    }
}

// Actualizar estado del botón
function updateButtonState() {
    const playPauseBtn = document.getElementById("play-pause-btn");
    if (!playPauseBtn) return;
    
    if (isReading && !isPaused) {
        playPauseBtn.innerHTML = "⏸️";
        playPauseBtn.title = "Pausar";
    } else {
        playPauseBtn.innerHTML = "▶️";
        playPauseBtn.title = isPaused ? "Reanudar" : "Reproducir";
    }
}

// Control de progreso - MEJORADO
function startProgress() {
    stopProgress();
    
    progressInterval = setInterval(() => {
        updateProgress();
    }, 100);
}

function stopProgress() {
    if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
    }
}

function updateProgress() {
    const progressBar = document.getElementById("progress-bar");
    if (!progressBar || sentences.length === 0) return;

    // Calcular progreso basado en oraciones completadas
    let progress = (currentIndex / sentences.length) * 100;
    
    // Si está hablando actualmente, añadir progreso parcial
    if (synth.speaking && currentIndex < sentences.length) {
        const partialProgress = (1 / sentences.length) * 100 * 0.5;
        progress += partialProgress;
    }
    
    progress = Math.min(progress, 100);
    progressBar.style.width = `${progress}%`;
}

// Función para manejar el clic en la barra de progreso
function handleProgressClick(event) {
    if (sentences.length === 0) return;

    const progressContainer = document.getElementById("progress-container");
    if (!progressContainer) return;

    const rect = progressContainer.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, clickX / rect.width));
    const newIndex = Math.floor(percentage * sentences.length);

    if (newIndex >= 0 && newIndex < sentences.length) {
        const wasReading = isReading && !isPaused;
        
        synth.cancel();
        currentIndex = newIndex;
        updateProgress();
        
        if (wasReading) {
            setTimeout(() => speakFromCurrentIndex(), 100);
        }
    }
}

// Event listeners adicionales
document.addEventListener("DOMContentLoaded", function() {
    const progressContainer = document.getElementById("progress-container");
    if (progressContainer) {
        progressContainer.addEventListener("click", handleProgressClick);
        progressContainer.style.cursor = "pointer";
    }
    
    // Inicializar display de velocidad
    const speedDisplay = document.getElementById("speed-display");
    const speedControl = document.getElementById("speed-control");
    if (speedDisplay && speedControl) {
        speedDisplay.textContent = `${speedControl.value}x`;
    }
});

// Manejar cuando la página se cierra o se recarga
window.addEventListener("beforeunload", () => {
    synth.cancel();
    stopProgress();
});