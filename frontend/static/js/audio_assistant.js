// Patrón de módulo para evitar conflictos de variables globales
(function() {
    'use strict';
    
    // Verificar si ya se inicializó para evitar ejecuciones duplicadas
    if (window.audioAssistantInitialized) {
        console.log('Audio Assistant ya está inicializado');
        return;
    }
    window.audioAssistantInitialized = true;

    // Variables locales del módulo
    let mediaRecorder;
    let audioChunks = [];
    let isRecording = false;
    let isPaused = false;
    let audioStream;
    let recognition = null;
    let finalTranscript = '';

// Obtener elementos del DOM
const recordBtn = document.getElementById('recordBtn');
const pauseBtn = document.getElementById('pauseBtn');
const stopBtn = document.getElementById('stopBtn');
const transcriptBox = document.getElementById('transcriptBox');
const saveBtn = document.getElementById('saveBtn');
const clearBtn = document.getElementById('btnlimpiar');

// Función para verificar compatibilidad del navegador
function checkBrowserSupport() {
    // Verificar MediaRecorder
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Tu navegador no soporta grabación de audio. Usa Chrome, Firefox o Edge.');
        return false;
    }
    
    // Verificar SpeechRecognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        alert('Tu navegador no soporta reconocimiento de voz. Usa Chrome para mejor compatibilidad.');
        return false;
    }
    
    return true;
}

// Inicializar reconocimiento de voz
function initializeSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
        console.error('SpeechRecognition no está disponible en este navegador');
        return null;
    }
    
    try {
        recognition = new SpeechRecognition();
        recognition.lang = 'es-ES';
        recognition.interimResults = true;
        recognition.continuous = true;
        recognition.maxAlternatives = 1;
        
        // Manejar resultados de transcripción
        recognition.onresult = (event) => {
            let interimTranscript = '';
            
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript + ' ';
                } else {
                    interimTranscript += transcript;
                }
            }
            
            if (transcriptBox) {
                transcriptBox.value = finalTranscript + interimTranscript;
                // Auto scroll al final del texto
                transcriptBox.scrollTop = transcriptBox.scrollHeight;
            }
        };
        
        // Manejar errores de reconocimiento
        recognition.onerror = (event) => {
            console.error('Error en reconocimiento de voz:', event.error);
            if (event.error === 'not-allowed') {
                alert('Permiso de micrófono denegado. Por favor, permite el acceso al micrófono.');
            } else if (event.error === 'no-speech') {
                console.log('No se detectó habla - continuando...');
                // No mostrar alerta para no-speech, es normal
            } else if (event.error === 'network') {
                console.log('Error de red - reintentando...');
            } else {
                console.log('Error en reconocimiento de voz: ' + event.error);
            }
        };
        
        // Manejar fin de reconocimiento - reiniciar automáticamente si aún estamos grabando
        recognition.onend = () => {
            console.log('Reconocimiento de voz terminado');
            if (isRecording && !isPaused) {
                console.log('Reiniciando reconocimiento de voz automáticamente...');
                setTimeout(() => {
                    if (recognition && isRecording && !isPaused) {
                        try {
                            recognition.start();
                        } catch (error) {
                            console.error('Error al reiniciar reconocimiento:', error);
                        }
                    }
                }, 100);
            }
        };
        
        recognition.onstart = () => {
            console.log('Reconocimiento de voz iniciado');
        };
        
        return recognition;
        
    } catch (error) {
        console.error('Error al inicializar SpeechRecognition:', error);
        return null;
    }
}

// Función para detener el reconocimiento de voz de forma segura
function stopSpeechRecognition() {
    if (recognition) {
        try {
            recognition.stop();
        } catch (error) {
            console.log('Error al detener reconocimiento:', error);
        }
    }
}

// Función para iniciar el reconocimiento de voz de forma segura
function startSpeechRecognition() {
    if (recognition && !isRecording) {
        try {
            recognition.start();
        } catch (error) {
            console.log('Error al iniciar reconocimiento:', error);
        }
    }
}

// Inicializar cuando se carga la página
document.addEventListener('DOMContentLoaded', () => {
    console.log('Inicializando asistente de audio...');
    
    // Verificar compatibilidad
    if (!checkBrowserSupport()) {
        return;
    }
    
    // Inicializar reconocimiento de voz
    recognition = initializeSpeechRecognition();
    
    if (!recognition) {
        console.error('No se pudo inicializar el reconocimiento de voz');
        alert('Error: No se puede inicializar el reconocimiento de voz en este navegador.');
        return;
    }
    
    console.log('Reconocimiento de voz inicializado correctamente');
    
    // Verificar que los elementos existen
    if (!recordBtn || !pauseBtn || !stopBtn || !transcriptBox || !saveBtn || !clearBtn) {
        console.error('Algunos elementos del DOM no se encontraron');
        console.log('Elementos encontrados:', {
            recordBtn: !!recordBtn,
            pauseBtn: !!pauseBtn, 
            stopBtn: !!stopBtn,
            transcriptBox: !!transcriptBox,
            saveBtn: !!saveBtn,
            clearBtn: !!clearBtn
        });
        return;
    }
    
    // Establecer estado inicial de los botones
    resetButtonStates();
    
    // Event listeners
    setupEventListeners();
});

// Función para resetear el estado de los botones
function resetButtonStates() {
    recordBtn.disabled = false;
    pauseBtn.disabled = true;
    stopBtn.disabled = true;
    recordBtn.textContent = "Grabar";
    pauseBtn.textContent = "Pausar";
    recordBtn.classList.remove('active');
}

// Configurar event listeners
function setupEventListeners() {
    // Botón limpiar
    clearBtn.addEventListener('click', () => {
        finalTranscript = '';
        transcriptBox.value = '';
        console.log('Transcripción limpiada');
    });

    // Botón grabar
    recordBtn.addEventListener('click', async () => {
        if (!isRecording) {
            try {
                console.log('Iniciando grabación...');
                
                // Solicitar acceso al micrófono
                audioStream = await navigator.mediaDevices.getUserMedia({ 
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true,
                        sampleRate: 44100
                    }
                });
                
                // Verificar si MediaRecorder soporta el tipo MIME
                let options = {};
                if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
                    options.mimeType = 'audio/webm;codecs=opus';
                } else if (MediaRecorder.isTypeSupported('audio/webm')) {
                    options.mimeType = 'audio/webm';
                } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
                    options.mimeType = 'audio/mp4';
                }
                
                // Configurar MediaRecorder
                mediaRecorder = new MediaRecorder(audioStream, options);
                
                audioChunks = [];

                mediaRecorder.ondataavailable = event => {
                    if (event.data.size > 0) {
                        audioChunks.push(event.data);
                        console.log('Chunk de audio recibido, tamaño:', event.data.size);
                    }
                };

                mediaRecorder.onstart = () => {
                    console.log('MediaRecorder iniciado');
                };

                mediaRecorder.onstop = () => {
                    console.log('MediaRecorder detenido');
                    handleRecordedAudio();
                };

                mediaRecorder.onerror = (event) => {
                    console.error('Error en MediaRecorder:', event.error);
                };

                // Iniciar grabación
                mediaRecorder.start(1000); // Recopilar datos cada segundo
                
                // Iniciar reconocimiento de voz
                if (recognition) {
                    try {
                        startSpeechRecognition();
                    } catch (error) {
                        console.error('Error al iniciar reconocimiento de voz:', error);
                    }
                }

                // Actualizar estado
                isRecording = true;
                isPaused = false;
                
                // Actualizar UI
                recordBtn.classList.add('active');
                recordBtn.textContent = "Grabando...";
                recordBtn.disabled = true;
                pauseBtn.disabled = false;
                stopBtn.disabled = false;
                
                console.log('Grabación iniciada exitosamente');
                
            } catch (err) {
                console.error('Error al acceder al micrófono:', err);
                alert("Error al acceder al micrófono: " + err.message + "\nAsegúrate de permitir el acceso al micrófono.");
                resetButtonStates();
            }
        }
    });

    // Botón pausar/reanudar
    pauseBtn.addEventListener('click', () => {
        if (!mediaRecorder || !isRecording) {
            console.log('No se puede pausar: no hay grabación activa');
            return;
        }

        if (!isPaused) {
            console.log('Pausando grabación...');
            
            try {
                if (mediaRecorder.state === 'recording') {
                    mediaRecorder.pause();
                }
                stopSpeechRecognition();
                
                isPaused = true;
                pauseBtn.textContent = "Reanudar";
                recordBtn.textContent = "Pausado";
                
                console.log('Grabación pausada');
            } catch (error) {
                console.error('Error al pausar:', error);
            }
            
        } else {
            console.log('Reanudando grabación...');
            
            try {
                if (mediaRecorder.state === 'paused') {
                    mediaRecorder.resume();
                }
                
                // Reiniciar reconocimiento de voz
                if (recognition) {
                    setTimeout(() => {
                        startSpeechRecognition();
                    }, 100);
                }
                
                isPaused = false;
                pauseBtn.textContent = "Pausar";
                recordBtn.textContent = "Grabando...";
                
                console.log('Grabación reanudada');
            } catch (error) {
                console.error('Error al reanudar:', error);
            }
        }
    });

    // Botón detener
    stopBtn.addEventListener('click', () => {
        if (mediaRecorder && isRecording) {
            console.log('Deteniendo grabación...');
            
            try {
                // Detener MediaRecorder
                if (mediaRecorder.state !== 'inactive') {
                    mediaRecorder.stop();
                }
                
                // Detener reconocimiento de voz
                stopSpeechRecognition();
                
                // Detener todas las pistas de audio
                if (audioStream) {
                    audioStream.getTracks().forEach(track => {
                        track.stop();
                        console.log('Pista de audio detenida');
                    });
                }

                // Resetear estado
                isRecording = false;
                isPaused = false;

                // Restaurar botones
                resetButtonStates();
                
                console.log('Grabación detenida exitosamente');
                
            } catch (error) {
                console.error('Error al detener grabación:', error);
                // Aún así, resetear el estado
                isRecording = false;
                isPaused = false;
                resetButtonStates();
            }
        }
    });

    // Botón guardar
    saveBtn.addEventListener('click', () => {
        const titulo = prompt("Escribe el título del documento:");
        if (!titulo || titulo.trim() === "") {
            alert("No ingresaste un título.");
            return;
        }

        const text = transcriptBox.value;
        if (!text || text.trim() === "") {
            alert("No hay texto para guardar.");
            return;
        }

        try {
            const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = `${titulo.trim()}.txt`;
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            console.log('Transcripción guardada:', titulo);
            alert('Transcripción guardada exitosamente');
        } catch (error) {
            console.error('Error al guardar transcripción:', error);
            alert('Error al guardar la transcripción');
        }
    });
}

// Manejar audio grabado
function handleRecordedAudio() {
    if (audioChunks.length === 0) {
        console.log('No hay chunks de audio para procesar');
        return;
    }
    
    try {
        console.log('Procesando audio grabado. Chunks:', audioChunks.length);
        
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);

        console.log('Audio blob creado. Tamaño:', audioBlob.size, 'bytes');

        const audio = document.createElement('audio');
        audio.src = audioUrl;
        audio.controls = true;
        audio.style.display = 'block';
        audio.style.width = '100%';
        audio.style.marginBottom = '10px';

        // Buscar el contenedor correcto
        let audioContainer = document.querySelector('.save-audio');
        
        if (!audioContainer) {
            // Si no existe, crear uno
            audioContainer = document.createElement('div');
            audioContainer.classList.add('save-audio');
            
            // Insertar en la sección de transcripción
            const transcriptionSection = document.querySelector('.transcription-section');
            if (transcriptionSection) {
                transcriptionSection.appendChild(audioContainer);
            } else {
                console.warn("No se encontró la sección de transcripción");
                document.body.appendChild(audioContainer);
            }
        }
        
        // Limpiar audios anteriores y agregar el nuevo
        audioContainer.innerHTML = '<h4>Audio Grabado:</h4>';
        audioContainer.appendChild(audio);
        
        console.log('Audio grabado agregado al DOM exitosamente');
        
        // Agregar botón para descargar audio
        const downloadBtn = document.createElement('button');
        downloadBtn.textContent = 'Descargar Audio';
        downloadBtn.className = 'btn-save';
        downloadBtn.style.marginTop = '10px';
        downloadBtn.onclick = () => {
            const a = document.createElement('a');
            a.href = audioUrl;
            a.download = `grabacion_${new Date().toISOString().slice(0,19).replace(/:/g,'-')}.webm`;
            a.click();
        };
        audioContainer.appendChild(downloadBtn);
        
    } catch (error) {
        console.error('Error al procesar audio grabado:', error);
    }
}

// Función para manejar errores globales
window.addEventListener('error', (event) => {
    console.error('Error global:', event.error);
});

    // Función para limpiar recursos al cerrar la página
    window.addEventListener('beforeunload', () => {
        if (audioStream) {
            audioStream.getTracks().forEach(track => track.stop());
        }
        if (recognition) {
            recognition.stop();
        }
    });

    console.log('Audio Assistant inicializado correctamente');

})(); // Fin del módulo