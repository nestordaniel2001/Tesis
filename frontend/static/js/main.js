/**
 * main.js - Funcionalidad principal del frontend
 * Maneja la inicialización y coordinación entre los módulos de la aplicación
 */

// Constantes y configuración
const API_BASE_URL = 'http://localhost:5000/api';
const USER_ID = localStorage.getItem('user_id') || 'anonymous';

// Estado global de la aplicación
const appState = {
    currentMode: localStorage.getItem('currentMode') || 'visual', // 'visual' o 'auditory'
    userPreferences: null,
    isInitialized: false,
    isProcessing: false
};

// Inicialización de la aplicación
document.addEventListener('DOMContentLoaded', () => {
    console.log('Inicializando Asistente Inteligente Auris...');
    
    // Cargar preferencias del usuario
    loadUserPreferences()
        .then(() => {
            // Inicializar componentes según el modo
            initializeComponents();
            
            // Aplicar configuración de accesibilidad
            applyAccessibilitySettings();
            
            // Configurar los botones de cambio de modo
            setupModeSwitchers();
            
            // Configurar la navegación del menú principal
            setupMainNavigation();
            
            // Marcar la aplicación como inicializada
            appState.isInitialized = true;
            console.log('Asistente Inteligente Auris inicializado correctamente');
        })
        .catch(error => {
            console.error('Error al inicializar la aplicación:', error);
            showNotification('Error al inicializar la aplicación', 'error');
        });
});
function setupMobileMenu() {
    const menuToggle = document.getElementById('menu-toggle');
    const mainNav = document.querySelector('.main-nav'); // Cambiado a querySelector con clase

    if (menuToggle && mainNav) {
        menuToggle.addEventListener('click', () => {
            mainNav.classList.toggle('active');
            console.log('Menú toggled, active:', mainNav.classList.contains('active'));
        });
    } else {
        console.warn("No se encontró el botón hamburguesa o el menú principal");
        console.log('menuToggle:', menuToggle);
        console.log('mainNav:', mainNav);
    }
}

// Llamar la función cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', setupMobileMenu);

// También puedes agregar un event listener para cerrar el menú al hacer clic fuera
document.addEventListener('click', (event) => {
    const menuToggle = document.getElementById('menu-toggle');
    const mainNav = document.querySelector('.main-nav');
    
    // Si el clic no fue en el botón hamburguesa ni en el menú, cerrar el menú
    if (mainNav && menuToggle && 
        !menuToggle.contains(event.target) && 
        !mainNav.contains(event.target) && 
        mainNav.classList.contains('active')) {
        mainNav.classList.remove('active');
    }
});
/**
 * Configura los eventos de navegación para los botones del menú principal
 */
function setupMainNavigation() {
    // Obtener referencias a los botones
    const inicioBtn = document.getElementById('btn-inicio');
    const modoVisualBtn = document.getElementById('btn-modo-visual');
    const modoAuditivoBtn = document.getElementById('btn-modo-auditivo');
    const bibliotecaBtn = document.getElementById('btn-biblioteca');
    const configuracionBtn = document.getElementById('btn-configuracion');
    const loginBtn = document.getElementById('btn-login');
    
    // Configurar eventos de clic para cada botón
    if (inicioBtn) {
        inicioBtn.addEventListener('click', () => {
            window.location.href = '/inicio';
        });
    }
    
    if (modoVisualBtn) {
        modoVisualBtn.addEventListener('click', () => {
            window.location.href = '/modo_visual';
        });
    }
    
    if (modoAuditivoBtn) {
        modoAuditivoBtn.addEventListener('click', () => {
            window.location.href = '/modo_auditivo';
        });
    }
    
    if (bibliotecaBtn) {
        bibliotecaBtn.addEventListener('click', () => {
            window.location.href = '/biblioteca';
        });
    }
    
    if (configuracionBtn) {
        configuracionBtn.addEventListener('click', () => {
            window.location.href = '/configuracion';
        });
    }
    
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            window.location.href = '/';
        });
    }

    // Configurar botones de acción rápida en la página principal
    const visualQuickButton = document.querySelector('.visual-button');
    const auditoryQuickButton = document.querySelector('.auditory-button');
    
    if (visualQuickButton) {
        visualQuickButton.addEventListener('click', () => {
            window.location.href = '/modo_visual';
        });
    }
    
    if (auditoryQuickButton) {
        auditoryQuickButton.addEventListener('click', () => {
            window.location.href = '/modo_auditivo';
        });
    }
    
    // Configurar las tarjetas de asistente para que también sean clicables
    const visualAssistantCard = document.querySelector('.visual-assistant');
    const auditoryAssistantCard = document.querySelector('.auditory-assistant');
    
    if (visualAssistantCard) {
        visualAssistantCard.addEventListener('click', () => {
            window.location.href = '/modo_visual';
        });
    }
    
    if (auditoryAssistantCard) {
        auditoryAssistantCard.addEventListener('click', () => {
            window.location.href = '/modo_auditivo';
        });
    }
}

/**
 * Carga las preferencias del usuario desde el backend
 */
async function loadUserPreferences() {
    try {
        const response = await fetch(`${API_BASE_URL}/get-preferences?user_id=${USER_ID}`);
        if (!response.ok) {
            throw new Error('Error al cargar preferencias');
        }
        
        appState.userPreferences = await response.json();
        console.log('Preferencias cargadas:', appState.userPreferences);
        
        // Establecer modo según las preferencias
        if (appState.userPreferences.preferred_mode) {
            appState.currentMode = appState.userPreferences.preferred_mode;
        }
        
        return appState.userPreferences;
    } catch (error) {
        console.error('Error al cargar preferencias:', error);
        
        // Establecer preferencias predeterminadas
        appState.userPreferences = {
            font_size: 'medium',
            high_contrast: false,
            simplified_text: false,
            audio_feedback: true,
            voice_type: 'default',
            speech_speed: 1.0,
            preferred_mode: appState.currentMode
        };
        
        return appState.userPreferences;
    }
}

/**
 * Guarda las preferencias del usuario en el backend
 */
async function saveUserPreferences(preferences = null) {
    const prefsToSave = preferences || appState.userPreferences;
    
    try {
        // Guardar también el modo actual
        prefsToSave.preferred_mode = appState.currentMode;
        
        const response = await fetch(`${API_BASE_URL}/save-preferences`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: USER_ID,
                preferences: prefsToSave
            })
        });
        
        if (!response.ok) {
            throw new Error('Error al guardar preferencias');
        }
        
        console.log('Preferencias guardadas correctamente');
        return true;
    } catch (error) {
        console.error('Error al guardar preferencias:', error);
        showNotification('No se pudieron guardar las preferencias', 'error');
        return false;
    }
}

/**
 * Inicializa los componentes de la aplicación según el modo
 */
function initializeComponents() {
    // Componentes comunes
    initializeToolbar();
    initializeLibrary();
    
    // Componentes específicos del modo
    const visualContainer = document.getElementById('visual-mode-container');
    const auditoryContainer = document.getElementById('auditory-mode-container');
    
    // Solo inicializar los componentes si estamos en la página correspondiente
    if (visualContainer && auditoryContainer) {
        if (appState.currentMode === 'visual') {
            initializeVisualAssistant();
            auditoryContainer.style.display = 'none';
            visualContainer.style.display = 'block';
        } else {
            initializeAudioAssistant();
            visualContainer.style.display = 'none';
            auditoryContainer.style.display = 'block';
        }
    } 
    
    // Si estamos en una página específica, inicializar solo lo necesario
    const currentPath = window.location.pathname;
    
    if (currentPath.includes('modo_visual')) {
        initializeVisualAssistant();
    } else if (currentPath.includes('modo_auditivo')) {
        initializeAudioAssistant();
    }
}

/**
 * Aplica la configuración de accesibilidad según las preferencias
 */
function applyAccessibilitySettings() {
    const prefs = appState.userPreferences;
    
    // Aplicar tamaño de fuente
    document.documentElement.className = document.documentElement.className
        .replace(/ font-size-\w+/g, '')
        .trim();
    document.documentElement.classList.add(`font-size-${prefs.font_size}`);
    
    // Aplicar contraste
    if (prefs.high_contrast) {
        document.documentElement.classList.add('high-contrast');
    } else {
        document.documentElement.classList.remove('high-contrast');
    }
    
    // Configurar velocidad de lectura en el modo auditivo
    if (window.audioAssistant) {
        window.audioAssistant.setSpeechSpeed(prefs.speech_speed || 1.0);
    }
}

/**
 * Configura los botones para cambiar entre modos
 */
function setupModeSwitchers() {
    const visualModeBtn = document.getElementById('switch-to-visual');
    const auditoryModeBtn = document.getElementById('switch-to-auditory');
    
    if (visualModeBtn) {
        visualModeBtn.addEventListener('click', () => switchMode('visual'));
    }
    
    if (auditoryModeBtn) {
        auditoryModeBtn.addEventListener('click', () => switchMode('auditory'));
    }
}

/**
 * Cambia entre el modo visual y auditivo
 */
function switchMode(newMode) {
    if (newMode === appState.currentMode) return;
    
    // Guardar el modo anterior para referencia
    const previousMode = appState.currentMode;
    appState.currentMode = newMode;
    
    // Guardar en localStorage
    localStorage.setItem('currentMode', newMode);
    
    // Si estamos en la página principal, actualizar la interfaz
    const visualContainer = document.getElementById('visual-mode-container');
    const auditoryContainer = document.getElementById('auditory-mode-container');
    
    if (visualContainer && auditoryContainer) {
        if (newMode === 'visual') {
            auditoryContainer.style.display = 'none';
            visualContainer.style.display = 'block';
            initializeVisualAssistant();
        } else {
            visualContainer.style.display = 'none';
            auditoryContainer.style.display = 'block';
            initializeAudioAssistant();
        }
    } else {
        // Si estamos en otra página, redirigir a la página correspondiente
        if (newMode === 'visual') {
            window.location.href = '/modo_visual';
        } else {
            window.location.href = '/modo_auditivo';
        }
    }
    
    // Guardar preferencia en el servidor
    appState.userPreferences.preferred_mode = newMode;
    saveUserPreferences();
    
    // Notificar al usuario
    showNotification(`Cambiado a modo ${newMode === 'visual' ? 'visual' : 'auditivo'}`, 'info');
}

/**
 * Inicializa la barra de herramientas
 */
function initializeToolbar() {
    const settingsBtn = document.getElementById('settings-button');
    const helpBtn = document.getElementById('help-button');
    
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => openSettingsModal());
    }
    
    if (helpBtn) {
        helpBtn.addEventListener('click', () => openHelpModal());
    }
}

/**
 * Inicializa el módulo de biblioteca
 */
function initializeLibrary() {
    // La implementación dependerá de las funcionalidades específicas
    console.log('Biblioteca inicializada');
}

/**
 * Abre el modal de configuración
 */
function openSettingsModal() {
    const modal = document.getElementById('settings-modal');
    if (!modal) return;
    
    // Llenar el modal con la configuración actual
    const fontSizeSelect = document.getElementById('font-size-setting');
    const contrastToggle = document.getElementById('contrast-toggle');
    const simplifiedTextToggle = document.getElementById('simplified-text-toggle');
    const audioFeedbackToggle = document.getElementById('audio-feedback-toggle');
    const voiceTypeSelect = document.getElementById('voice-type-setting');
    const speechSpeedRange = document.getElementById('speech-speed-setting');
    
    if (fontSizeSelect) fontSizeSelect.value = appState.userPreferences.font_size;
    if (contrastToggle) contrastToggle.checked = appState.userPreferences.high_contrast;
    if (simplifiedTextToggle) simplifiedTextToggle.checked = appState.userPreferences.simplified_text;
    if (audioFeedbackToggle) audioFeedbackToggle.checked = appState.userPreferences.audio_feedback;
    if (voiceTypeSelect) voiceTypeSelect.value = appState.userPreferences.voice_type || 'default';
    if (speechSpeedRange) speechSpeedRange.value = appState.userPreferences.speech_speed || 1.0;
    
    // Mostrar el modal
    modal.style.display = 'block';
    
    // Configurar el botón para guardar configuración
    const saveBtn = document.getElementById('save-settings-button');
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            // Recopilar configuración
            if (fontSizeSelect) appState.userPreferences.font_size = fontSizeSelect.value;
            if (contrastToggle) appState.userPreferences.high_contrast = contrastToggle.checked;
            if (simplifiedTextToggle) appState.userPreferences.simplified_text = simplifiedTextToggle.checked;
            if (audioFeedbackToggle) appState.userPreferences.audio_feedback = audioFeedbackToggle.checked;
            if (voiceTypeSelect) appState.userPreferences.voice_type = voiceTypeSelect.value;
            if (speechSpeedRange) appState.userPreferences.speech_speed = parseFloat(speechSpeedRange.value);
            
            // Guardar y aplicar
            saveUserPreferences();
            applyAccessibilitySettings();
            
            // Cerrar modal
            modal.style.display = 'none';
            
            // Notificar
            showNotification('Configuración guardada correctamente', 'success');
        });
    }
    
    // Configurar el botón para cerrar
    const closeBtn = document.getElementById('close-settings-button');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }
}

/**
 * Abre el modal de ayuda
 */
function openHelpModal() {
    const modal = document.getElementById('help-modal');
    if (!modal) return;
    
    // Mostrar el modal
    modal.style.display = 'block';
    
    // Configurar el botón para cerrar
    const closeBtn = document.getElementById('close-help-button');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }
}

/**
 * Muestra una notificación al usuario
 */
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <p>${message}</p>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Reproducir feedback auditivo si está habilitado
    if (appState.userPreferences.audio_feedback) {
        speakText(message);
    }
    
    // Ocultar la notificación después de 5 segundos
    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => {
            notification.remove();
        }, 500);
    }, 5000);
}

/**
 * Función para sintetizar voz a partir de texto
 */
async function speakText(text, voiceType = null, speed = null) {
    if (!appState.userPreferences.audio_feedback) return;
    
    // Usar preferencias del usuario si no se especifica
    const voice = voiceType || appState.userPreferences.voice_type || 'default';
    const speechSpeed = speed || appState.userPreferences.speech_speed || 1.0;
    
    try {
        const response = await fetch(`${API_BASE_URL}/text-to-speech`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text: text,
                voice_type: voice,
                speed: speechSpeed
            })
        });
        
        if (!response.ok) {
            throw new Error('Error al sintetizar voz');
        }
        
        const data = await response.json();
        
        // Reproducir audio
        const audio = new Audio(data.audio_url);
        audio.play();
        
        return true;
    } catch (error) {
        console.error('Error al sintetizar voz:', error);
        return false;
    }
}

/**
 * Inicializa el asistente visual
 */
function initializeVisualAssistant() {
    console.log('Inicializando asistente visual...');
    
    // Cargar el módulo específico solo si es necesario
    if (typeof window.visualAssistant === 'undefined') {
        // Crear script dinámicamente
        const script = document.createElement('script');
        script.src = '/static/js/visual_assistant.js';
        script.onload = () => {
            console.log('Módulo de asistente visual cargado');
            if (window.visualAssistant && typeof window.visualAssistant.initialize === 'function') {
                window.visualAssistant.initialize();
            }
        };
        document.head.appendChild(script);
    } else if (window.visualAssistant && typeof window.visualAssistant.initialize === 'function') {
        window.visualAssistant.initialize();
    }
}

/**
 * Inicializa el asistente auditivo
 */
function initializeAudioAssistant() {
    console.log('Inicializando asistente auditivo...');
    
    // Cargar el módulo específico solo si es necesario
    if (typeof window.audioAssistant === 'undefined') {
        // Crear script dinámicamente
        const script = document.createElement('script');
        script.src = '/static/js/audio_assistant.js';
        script.onload = () => {
            console.log('Módulo de asistente auditivo cargado');
            if (window.audioAssistant && typeof window.audioAssistant.initialize === 'function') {
                window.audioAssistant.initialize();
            }
        };
        document.head.appendChild(script);
    } else if (window.audioAssistant && typeof window.audioAssistant.initialize === 'function') {
        window.audioAssistant.initialize();
    }
}

// Exportar funciones para uso en otros módulos
window.aurisApp = {
    speakText,
    showNotification,
    switchMode,
    getUserPreferences: () => appState.userPreferences,
    saveUserPreferences,
    isProcessing: () => appState.isProcessing,
    setProcessing: (state) => { appState.isProcessing = state; }
};