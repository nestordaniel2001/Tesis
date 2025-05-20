/* JavaScript para el asistente visual */

document.addEventListener('DOMContentLoaded', function() {
    // Referencias a elementos del DOM
    const fileUpload = document.getElementById('file-upload');
    const examineButton = document.getElementById('examine-button');
    const documentUrl = document.getElementById('document-url');
    const getUrlButton = document.getElementById('get-url-button');
    const textToRead = document.getElementById('text-to-read');
    const playPauseButton = document.getElementById('play-pause-button');
    const speedControl = document.getElementById('speed-control');
    const saveReadingButton = document.getElementById('save-reading-button');
    const readMore = document.getElementById('read-more');

    // Estado de la aplicación
    let isPlaying = false;
    let currentSpeed = 1.0;
    let currentText = textToRead.innerText;
    let speechSynthesis = window.speechSynthesis;
    let speechUtterance = null;

    // Configurar eventos
    examineButton.addEventListener('click', function() {
        fileUpload.click();
    });

    fileUpload.addEventListener('change', function(event) {
        if (event.target.files && event.target.files[0]) {
            const file = event.target.files[0];
            processFile(file);
        }
    });

    getUrlButton.addEventListener('click', function() {
        const url = documentUrl.value.trim();
        if (url) {
            fetchDocument(url);
        } else {
            showNotification('Por favor, ingrese una URL válida');
        }
    });

    playPauseButton.addEventListener('click', function() {
        togglePlayPause();
    });

    speedControl.addEventListener('input', function() {
        currentSpeed = parseFloat(this.value);
        updatePlaybackSpeed();
        
        // Actualizar la etiqueta de velocidad (opcional)
        document.querySelector('.speed-label').textContent = `Velocidad: ${currentSpeed.toFixed(1)}x`;
    });

    saveReadingButton.addEventListener('click', function() {
        saveReading();
    });

    readMore.addEventListener('click', function(e) {
        e.preventDefault();
        // Aquí se podría cargar más texto o expandir el contenido existente
        showNotification('Cargando contenido adicional...');
    });

    // Funciones de la aplicación
    function processFile(file) {
        // Simular procesamiento de archivo
        const reader = new FileReader();
        
        reader.onload = function(e) {
            const content = e.target.result;
            // Actualizar el texto a leer (simulado)
            updateTextContent("Contenido cargado desde archivo: " + file.name + "\n\n" + 
                              "El contenido del archivo se mostraría aquí. Este es un texto de ejemplo " +
                              "para simular el contenido extraído del archivo subido por el usuario.");
            showNotification('Archivo cargado exitosamente');
        };
        
        reader.onerror = function() {
            showNotification('Error al leer el archivo', 'error');
        };
        
        // Leer como texto (ajustar según el tipo de archivo)
        reader.readAsText(file);
    }

    function fetchDocument(url) {
        // Simular obtención de documento desde URL
        showNotification('Obteniendo documento desde URL...');
        
        // Simular tiempo de carga
        setTimeout(function() {
            updateTextContent("Contenido cargado desde URL: " + url + "\n\n" + 
                              "Este es un texto de ejemplo para simular el contenido " +
                              "que se habría extraído de la URL proporcionada por el usuario.");
            showNotification('Documento obtenido exitosamente');
        }, 1500);
    }

    function togglePlayPause() {
        if (!speechUtterance) {
            startReading();
        } else {
            if (isPlaying) {
                pauseReading();
            } else {
                resumeReading();
            }
        }
    }

    function startReading() {
        if (speechSynthesis) {
            speechUtterance = new SpeechSynthesisUtterance(currentText);
            speechUtterance.rate = currentSpeed;
            speechUtterance.lang = 'es-ES'; // Ajustar según el idioma
            
            speechUtterance.onend = function() {
                isPlaying = false;
                updatePlayPauseButton();
                speechUtterance = null;
            };
            
            speechSynthesis.speak(speechUtterance);
            isPlaying = true;
            updatePlayPauseButton();
        } else {
            showNotification('La síntesis de voz no está disponible en su navegador', 'error');
        }
    }

    function pauseReading() {
        if (speechSynthesis && isPlaying) {
            speechSynthesis.pause();
            isPlaying = false;
            updatePlayPauseButton();
        }
    }

    function resumeReading() {
        if (speechSynthesis && !isPlaying && speechUtterance) {
            speechSynthesis.resume();
            isPlaying = true;
            updatePlayPauseButton();
        }
    }

    function updatePlaybackSpeed() {
        if (speechUtterance) {
            // Cancelar y reiniciar con la nueva velocidad
            const currentPosition = speechSynthesis.speaking ? speechSynthesis.currentTime : 0;
            speechSynthesis.cancel();
            
            speechUtterance = new SpeechSynthesisUtterance(currentText);
            speechUtterance.rate = currentSpeed;
            speechUtterance.lang = 'es-ES';
            
            // Intentar reanudar desde la posición actual (limitaciones de la API)
            speechSynthesis.speak(speechUtterance);
            isPlaying = true;
            updatePlayPauseButton();
        }
    }

    function updatePlayPauseButton() {
        if (isPlaying) {
            playPauseButton.innerHTML = '<span>&#10074;&#10074;</span>'; // Ícono de pausa
        } else {
            playPauseButton.innerHTML = '<span>&#9658;</span>'; // Ícono de reproducción
        }
    }

    function updateTextContent(text) {
        currentText = text;
        textToRead.innerText = text;
        
        // Reiniciar la lectura si estaba en curso
        if (speechUtterance) {
            speechSynthesis.cancel();
            speechUtterance = null;
            isPlaying = false;
            updatePlayPauseButton();
        }
    }

    function saveReading() {
        // Simulación de guardado
        showNotification('Guardando lectura en la biblioteca...');
        
        setTimeout(function() {
            showNotification('Lectura guardada exitosamente');
        }, 1000);
    }

    function showNotification(message, type = 'info') {
        // Crear una notificación temporal
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Mostrar y luego ocultar
        setTimeout(function() {
            notification.classList.add('show');
            
            setTimeout(function() {
                notification.classList.remove('show');
                setTimeout(function() {
                    document.body.removeChild(notification);
                }, 300);
            }, 3000);
        }, 10);
    }
});