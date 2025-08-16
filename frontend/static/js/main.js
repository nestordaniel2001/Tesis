/**
 * main.js - Funcionalidad principal del frontend
 * Maneja la inicialización y coordinación entre los módulos de la aplicación
 */

// Evitar redeclaraciones usando verificaciones
if (typeof window.API_BASE_URL === 'undefined') {
    window.API_BASE_URL = 'http://localhost:5000/api';
}

if (typeof window.USER_ID === 'undefined') {
    window.USER_ID = localStorage.getItem('user_id') || 'anonymous';
}

// Estado global de la aplicación
if (typeof window.appState === 'undefined') {
    window.appState = {
        currentMode: localStorage.getItem('currentMode') || 'visual', // 'visual' o 'auditory'
        userPreferences: null,
        isInitialized: false,
        isProcessing: false
    };
}

// Función principal de inicialización (solo ejecutar una vez)
function initializeMainApp() {
    if (window.appState.isInitialized) {
        console.log('Aplicación ya inicializada');
        return;
    }

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
            
            // Configurar menú móvil
            setupMobileMenu();
            
            // Marcar la aplicación como inicializada
            window.appState.isInitialized = true;
            console.log('Asistente Inteligente Auris inicializado correctamente');
        })
        .catch(error => {
            console.error('Error al inicializar la aplicación:', error);
            showNotification('Error al inicializar la aplicación', 'error');
        });
}

// Inicialización de la aplicación (solo una vez)
document.addEventListener('DOMContentLoaded', initializeMainApp);

function setupMobileMenu() {
    const menuToggle = document.getElementById('menu-toggle');
    const mainNav = document.querySelector('.main-nav');

    if (menuToggle && mainNav) {
        // Remover listeners anteriores para evitar duplicados
        const newMenuToggle = menuToggle.cloneNode(true);
        menuToggle.parentNode.replaceChild(newMenuToggle, menuToggle);
        
        newMenuToggle.addEventListener('click', () => {
            mainNav.classList.toggle('active');
            console.log('Menú toggled, active:', mainNav.classList.contains('active'));
        });
    } else {
        console.warn("No se encontró el botón hamburguesa o el menú principal");
    }
}

// Event listener para cerrar el menú al hacer clic fuera (solo una vez)
function setupOutsideClickListener() {
    if (window.outsideClickListenerAdded) return;
    
    document.addEventListener('click', (event) => {
        const menuToggle = document.getElementById('menu-toggle');
        const mainNav = document.querySelector('.main-nav');
        
        if (mainNav && menuToggle && 
            !menuToggle.contains(event.target) && 
            !mainNav.contains(event.target) && 
            mainNav.classList.contains('active')) {
            mainNav.classList.remove('active');
        }
    });
    
    window.outsideClickListenerAdded = true;
}

document.addEventListener('DOMContentLoaded', setupOutsideClickListener);

/**
 * Configura los eventos de navegación para los botones del menú principal
 */
function setupMainNavigation() {
    const buttons = [
        { id: 'btn-inicio', url: '/inicio' },
        { id: 'btn-modo-visual', url: '/modo_visual' },
        { id: 'btn-modo-auditivo', url: '/modo_auditivo' },
        { id: 'btn-biblioteca', url: '/biblioteca' },
        { id: 'btn-configuracion', url: '/configuracion' },
        { id: 'btn-login', url: '/' }
    ];
    
    buttons.forEach(({ id, url }) => {
        const btn = document.getElementById(id);
        if (btn) {
            // Remover listeners anteriores
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            
            newBtn.addEventListener('click', () => {
                window.location.href = url;
            });
        }
    });

    // Configurar botones de acción rápida
    const quickButtons = [
        { selector: '.visual-button', url: '/modo_visual' },
        { selector: '.auditory-button', url: '/modo_auditivo' },
        { selector: '.visual-assistant', url: '/modo_visual' },
        { selector: '.auditory-assistant', url: '/modo_auditivo' }
    ];
    
    quickButtons.forEach(({ selector, url }) => {
        const btn = document.querySelector(selector);
        if (btn) {
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            
            newBtn.addEventListener('click', () => {
                window.location.href = url;
            });
        }
    });
}

/**
 * Carga las preferencias del usuario desde localStorage o backend
 */
async function loadUserPreferences() {
    // Primero intentar cargar desde localStorage
    const localPrefs = localStorage.getItem('user_preferences');
    if (localPrefs) {
        try {
            window.appState.userPreferences = JSON.parse(localPrefs);
            console.log('Preferencias cargadas desde localStorage:', window.appState.userPreferences);
            
            if (window.appState.userPreferences.preferred_mode) {
                window.appState.currentMode = window.appState.userPreferences.preferred_mode;
            }
            
            return window.appState.userPreferences;
        } catch (error) {
            console.error('Error al parsear preferencias locales:', error);
        }
    }
    
    // Si no hay preferencias locales, intentar cargar del backend
    try {
        const response = await fetch(`${window.API_BASE_URL}/get-preferences?user_id=${window.USER_ID}`);
        if (response.ok) {
            window.appState.userPreferences = await response.json();
            console.log('Preferencias cargadas desde backend:', window.appState.userPreferences);
            
            // Guardar en localStorage para futuras cargas
            localStorage.setItem('user_preferences', JSON.stringify(window.appState.userPreferences));
            
            if (window.appState.userPreferences.preferred_mode) {
                window.appState.currentMode = window.appState.userPreferences.preferred_mode;
            }
            
            return window.appState.userPreferences;
        } else {
            console.log('Backend no disponible o endpoint no encontrado, usando preferencias por defecto');
        }
    } catch (error) {
        console.log('Error al conectar con backend, usando preferencias por defecto:', error.message);
    }
    
    // Usar preferencias por defecto si no se pueden cargar
    window.appState.userPreferences = {
        font_size: 'medium',
        high_contrast: false,
        simplified_text: false,
        audio_feedback: true,
        voice_type: 'default',
        speech_speed: 1.0,
        preferred_mode: window.appState.currentMode
    };
    
    // Guardar las preferencias por defecto en localStorage
    localStorage.setItem('user_preferences', JSON.stringify(window.appState.userPreferences));
    
    console.log('Usando preferencias por defecto:', window.appState.userPreferences);
    return window.appState.userPreferences;
}

/**
 * Guarda las preferencias del usuario en localStorage y backend
 */
async function saveUserPreferences(preferences = null) {
    const prefsToSave = preferences || window.appState.userPreferences;
    prefsToSave.preferred_mode = window.appState.currentMode;
    
    // Siempre guardar en localStorage primero
    try {
        localStorage.setItem('user_preferences', JSON.stringify(prefsToSave));
        console.log('Preferencias guardadas en localStorage');
    } catch (error) {
        console.error('Error al guardar en localStorage:', error);
    }
    
    // Intentar guardar en backend si está disponible
    try {
        const response = await fetch(`${window.API_BASE_URL}/save-preferences`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: window.USER_ID,
                preferences: prefsToSave
            })
        });
        
        if (response.ok) {
            console.log('Preferencias guardadas en backend');
            return true;
        } else {
            console.log('Backend no disponible para guardar preferencias, solo guardado local');
            return true; // Aún consideramos éxito si se guardó localmente
        }
    } catch (error) {
        console.log('Error al conectar con backend para guardar:', error.message);
        return true; // Aún consideramos éxito si se guardó localmente
    }
}

/**
 * Inicializa los componentes de la aplicación según el modo
 */
function initializeComponents() {
    initializeToolbar();
    initializeLibrary();
    
    const visualContainer = document.getElementById('visual-mode-container');
    const auditoryContainer = document.getElementById('auditory-mode-container');
    
    if (visualContainer && auditoryContainer) {
        if (window.appState.currentMode === 'visual') {
            initializeVisualAssistant();
            auditoryContainer.style.display = 'none';
            visualContainer.style.display = 'block';
        } else {
            initializeAudioAssistant();
            visualContainer.style.display = 'none';
            auditoryContainer.style.display = 'block';
        }
    } 
    
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
    const prefs = window.appState.userPreferences;
    
    document.documentElement.className = document.documentElement.className
        .replace(/ font-size-\w+/g, '')
        .trim();
    document.documentElement.classList.add(`font-size-${prefs.font_size}`);
    
    if (prefs.high_contrast) {
        document.documentElement.classList.add('high-contrast');
    } else {
        document.documentElement.classList.remove('high-contrast');
    }
    
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
        const newBtn = visualModeBtn.cloneNode(true);
        visualModeBtn.parentNode.replaceChild(newBtn, visualModeBtn);
        newBtn.addEventListener('click', () => switchMode('visual'));
    }
    
    if (auditoryModeBtn) {
        const newBtn = auditoryModeBtn.cloneNode(true);
        auditoryModeBtn.parentNode.replaceChild(newBtn, auditoryModeBtn);
        newBtn.addEventListener('click', () => switchMode('auditory'));
    }
}

/**
 * Cambia entre el modo visual y auditivo
 */
function switchMode(newMode) {
    if (newMode === window.appState.currentMode) return;
    
    const previousMode = window.appState.currentMode;
    window.appState.currentMode = newMode;
    
    localStorage.setItem('currentMode', newMode);
    
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
        if (newMode === 'visual') {
            window.location.href = '/modo_visual';
        } else {
            window.location.href = '/modo_auditivo';
        }
    }
    
    window.appState.userPreferences.preferred_mode = newMode;
    saveUserPreferences();
    
    showNotification(`Cambiado a modo ${newMode === 'visual' ? 'visual' : 'auditivo'}`, 'info');
}

/**
 * Inicializa la barra de herramientas
 */
function initializeToolbar() {
    const settingsBtn = document.getElementById('settings-button');
    const helpBtn = document.getElementById('help-button');
    
    if (settingsBtn) {
        const newBtn = settingsBtn.cloneNode(true);
        settingsBtn.parentNode.replaceChild(newBtn, settingsBtn);
        newBtn.addEventListener('click', () => openSettingsModal());
    }
    
    if (helpBtn) {
        const newBtn = helpBtn.cloneNode(true);
        helpBtn.parentNode.replaceChild(newBtn, helpBtn);
        newBtn.addEventListener('click', () => openHelpModal());
    }
}

/**
 * Inicializa el módulo de biblioteca
 */
function initializeLibrary() {
    console.log('Biblioteca inicializada');
}

/**
 * Abre el modal de configuración
 */
function openSettingsModal() {
    const modal = document.getElementById('settings-modal');
    if (!modal) return;
    
    const elements = {
        fontSizeSelect: document.getElementById('font-size-setting'),
        contrastToggle: document.getElementById('contrast-toggle'),
        simplifiedTextToggle: document.getElementById('simplified-text-toggle'),
        audioFeedbackToggle: document.getElementById('audio-feedback-toggle'),
        voiceTypeSelect: document.getElementById('voice-type-setting'),
        speechSpeedRange: document.getElementById('speech-speed-setting')
    };
    
    const prefs = window.appState.userPreferences;
    
    if (elements.fontSizeSelect) elements.fontSizeSelect.value = prefs.font_size;
    if (elements.contrastToggle) elements.contrastToggle.checked = prefs.high_contrast;
    if (elements.simplifiedTextToggle) elements.simplifiedTextToggle.checked = prefs.simplified_text;
    if (elements.audioFeedbackToggle) elements.audioFeedbackToggle.checked = prefs.audio_feedback;
    if (elements.voiceTypeSelect) elements.voiceTypeSelect.value = prefs.voice_type || 'default';
    if (elements.speechSpeedRange) elements.speechSpeedRange.value = prefs.speech_speed || 1.0;
    
    modal.style.display = 'block';
    
    const saveBtn = document.getElementById('save-settings-button');
    if (saveBtn) {
        const newBtn = saveBtn.cloneNode(true);
        saveBtn.parentNode.replaceChild(newBtn, saveBtn);
        
        newBtn.addEventListener('click', () => {
            if (elements.fontSizeSelect) prefs.font_size = elements.fontSizeSelect.value;
            if (elements.contrastToggle) prefs.high_contrast = elements.contrastToggle.checked;
            if (elements.simplifiedTextToggle) prefs.simplified_text = elements.simplifiedTextToggle.checked;
            if (elements.audioFeedbackToggle) prefs.audio_feedback = elements.audioFeedbackToggle.checked;
            if (elements.voiceTypeSelect) prefs.voice_type = elements.voiceTypeSelect.value;
            if (elements.speechSpeedRange) prefs.speech_speed = parseFloat(elements.speechSpeedRange.value);
            
            saveUserPreferences();
            applyAccessibilitySettings();
            
            modal.style.display = 'none';
            showNotification('Configuración guardada correctamente', 'success');
        });
    }
    
    const closeBtn = document.getElementById('close-settings-button');
    if (closeBtn) {
        const newBtn = closeBtn.cloneNode(true);
        closeBtn.parentNode.replaceChild(newBtn, closeBtn);
        newBtn.addEventListener('click', () => {
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
    
    modal.style.display = 'block';
    
    const closeBtn = document.getElementById('close-help-button');
    if (closeBtn) {
        const newBtn = closeBtn.cloneNode(true);
        closeBtn.parentNode.replaceChild(newBtn, closeBtn);
        newBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }
}

/**
 * Muestra una notificación al usuario
 */
function showNotification(message, type = 'info') {
    // Remover notificaciones existentes del mismo tipo
    const existingNotifications = document.querySelectorAll(`.notification.${type}`);
    existingNotifications.forEach(notification => notification.remove());
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
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
    
    if (window.appState.userPreferences && window.appState.userPreferences.audio_feedback) {
        speakText(message);
    }
}

/**
 * Función para sintetizar voz a partir de texto
 */
async function speakText(text, voiceType = null, speed = null) {
    if (!window.appState.userPreferences || !window.appState.userPreferences.audio_feedback) return;
    
    const voice = voiceType || window.appState.userPreferences.voice_type || 'default';
    const speechSpeed = speed || window.appState.userPreferences.speech_speed || 1.0;
    
    // Intentar usar el backend primero
    try {
        const response = await fetch(`${window.API_BASE_URL}/text-to-speech`, {
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
        
        if (response.ok) {
            const data = await response.json();
            const audio = new Audio(data.audio_url);
            audio.play();
            return true;
        }
    } catch (error) {
        console.log('Backend TTS no disponible, usando TTS del navegador:', error.message);
    }
    
    // Fallback al TTS del navegador
    try {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'es-ES';
        utterance.rate = speechSpeed;
        
        // Seleccionar voz si está disponible
        const voices = speechSynthesis.getVoices();
        if (voices.length > 0) {
            const spanishVoice = voices.find(v => v.lang.includes('es')) || voices[0];
            utterance.voice = spanishVoice;
        }
        
        speechSynthesis.cancel(); // Cancelar cualquier habla anterior
        speechSynthesis.speak(utterance);
        return true;
    } catch (fallbackError) {
        console.error('Error en TTS fallback:', fallbackError);
        return false;
    }
}

/**
 * Inicializa el asistente visual
 */
function initializeVisualAssistant() {
    console.log('Inicializando asistente visual...');
    
    if (typeof window.visualAssistant === 'undefined') {
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
    
    if (typeof window.auditoryAssistant === 'undefined') {
        const script = document.createElement('script');
        script.src = '/static/js/audio_assistant.js';
        script.onload = () => {
            console.log('Módulo de asistente auditivo cargado');
            if (window.auditoryAssistant && typeof window.auditoryAssistant.initialize === 'function') {
                window.auditoryAssistant.initialize();
            }
        };
        document.head.appendChild(script);
    } else if (window.auditoryAssistant && typeof window.auditoryAssistant.initialize === 'function') {
        window.auditoryAssistant.initialize();
    }
}

// Exportar funciones para uso en otros módulos
if (typeof window.aurisApp === 'undefined') {
    window.aurisApp = {
        speakText,
        showNotification,
        switchMode,
        getUserPreferences: () => window.appState.userPreferences,
        saveUserPreferences,
        isProcessing: () => window.appState.isProcessing,
        setProcessing: (state) => { window.appState.isProcessing = state; }
    };
}