/**
 * config.js - Manejo de la página de configuración
 */

let currentConfig = {};
let originalConfig = {};

// Inicializar página de configuración
document.addEventListener('DOMContentLoaded', async () => {
    console.log('⚙️ Cargando página de configuración...');
    
    // Verificar autenticación
    const isAuth = await authAPI.verifyAuthentication();
    console.log('🔐 Estado de autenticación:', isAuth);
    
    if (!isAuth) {
        console.log('❌ Usuario no autenticado, redirigiendo al login...');
        window.location.href = '/';
        return;
    }

    console.log('✅ Usuario autenticado, cargando configuración...');
    await loadUserConfiguration();
    setupEventListeners();
    setupNavigationListeners(); // Añadido para configurar el menú
});

/**
 * Cargar configuración del usuario
 */
async function loadUserConfiguration() {
    const loadingIndicator = document.getElementById('loading-config');
    loadingIndicator.style.display = 'block';

    try {
        const response = await authAPI.authenticatedFetch('/api/user/config');
        
        if (response.ok) {
            const data = await response.json();
            currentConfig = data.configuraciones;
            originalConfig = { ...data.configuraciones };
            
            // Llenar datos del perfil
            fillProfileData(data.usuario);
            
            // Llenar configuraciones
            fillConfigurationData(data.configuraciones);
            
        } else {
            throw new Error('Error al cargar configuración');
        }
    } catch (error) {
        console.error('Error cargando configuración:', error);
        showNotification('Error al cargar la configuración', 'error');
    } finally {
        loadingIndicator.style.display = 'none';
    }
}

/**
 * Llenar datos del perfil del usuario
 */
function fillProfileData(usuario) {
    document.getElementById('username').value = usuario.nombre_usuario || '';
    document.getElementById('email').value = usuario.correo_electronico || '';
    
    // Si hay foto de perfil, mostrarla
    if (usuario.foto_perfil) {
        const avatar = document.querySelector('.user-avatar');
        avatar.innerHTML = `<img src="${usuario.foto_perfil}" alt="Foto de perfil" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
    }
}

/**
 * Llenar datos de configuración
 */
function fillConfigurationData(config) {
    // Tipo de voz
    const voiceType = document.getElementById('voice-type');
    voiceType.value = config.tipo_voz || 'mujer';
    
    // Velocidad de lectura
    const readingSpeed = document.getElementById('reading-speed');
    const speedValue = document.getElementById('speed-value');
    readingSpeed.value = config.velocidad_lectura || 1.0;
    speedValue.textContent = `${readingSpeed.value}x`;
    
    // Tamaño de fuente
    const fontSize = document.getElementById('font-size');
    fontSize.value = config.tamaño_fuente || 'medium';
    
    // Contraste alto
    const highContrast = document.getElementById('high-contrast');
    highContrast.checked = config.contraste_alto || false;
    
    // Retroalimentación de audio
    const audioFeedback = document.getElementById('audio-feedback');
    audioFeedback.checked = config.retroalimentacion_audio !== false;
    
    // Aplicar configuraciones visuales
    applyVisualSettings();
}

/**
 * Aplicar configuraciones visuales
 */
function applyVisualSettings() {
    const fontSize = document.getElementById('font-size').value;
    const highContrast = document.getElementById('high-contrast').checked;
    
    // Aplicar tamaño de fuente
    document.documentElement.className = document.documentElement.className
        .replace(/\bfont-size-\w+\b/g, '');
    document.documentElement.classList.add(`font-size-${fontSize}`);
    
    // Aplicar contraste
    if (highContrast) {
        document.documentElement.classList.add('high-contrast');
    } else {
        document.documentElement.classList.remove('high-contrast');
    }
}

/**
 * Configurar event listeners
 */
function setupEventListeners() {
    // Control de velocidad
    const readingSpeed = document.getElementById('reading-speed');
    const speedValue = document.getElementById('speed-value');
    
    readingSpeed.addEventListener('input', () => {
        speedValue.textContent = `${readingSpeed.value}x`;
    });
    
    // Configuraciones visuales en tiempo real
    document.getElementById('font-size').addEventListener('change', applyVisualSettings);
    document.getElementById('high-contrast').addEventListener('change', applyVisualSettings);
    
    // Botón de prueba de voz
    document.getElementById('test-voice').addEventListener('click', testVoice);
    
    // Botones de acción
    document.getElementById('save-config').addEventListener('click', saveConfiguration);
    document.getElementById('cancel-config').addEventListener('click', cancelConfiguration);
    
    // Botón de cambiar foto (placeholder)
    document.querySelector('.btn-change-photo').addEventListener('click', () => {
        showNotification('Funcionalidad de cambio de foto próximamente', 'info');
    });
}

/**
 * Configurar event listeners para la navegación del menú lateral
 */
function setupNavigationListeners() {
    // Botón hamburguesa para toggle del menú
    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    
    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('sidebar-collapsed');
        });
    }
    
    // Botones de navegación
    const btnInicio = document.getElementById('btn-inicio');
    const btnModoVisual = document.getElementById('btn-modo-visual');
    const btnModoAuditivo = document.getElementById('btn-modo-auditivo');
    const btnBiblioteca = document.getElementById('btn-biblioteca');
    const btnConfiguracion = document.getElementById('btn-configuracion');
    const btnLogin = document.getElementById('btn-login');
    
    // Configurar navegación
    if (btnInicio) {
        btnInicio.addEventListener('click', () => {
            window.location.href = '/inicio';
        });
    }
    
    if (btnModoVisual) {
        btnModoVisual.addEventListener('click', () => {
            window.location.href = '/modo_visual';
        });
    }
    
    if (btnModoAuditivo) {
        btnModoAuditivo.addEventListener('click', () => {
            window.location.href = '/modo_auditivo';
        });
    }
    
    if (btnBiblioteca) {
        btnBiblioteca.addEventListener('click', () => {
            window.location.href = '/biblioteca';
        });
    }
    
    if (btnConfiguracion) {
        btnConfiguracion.addEventListener('click', () => {
            // Ya estamos en configuración, hacer scroll al top
            window.scrollTo(0, 0);
            setActiveNavButton(btnConfiguracion);
        });
    }
    
    if (btnLogin) {
        btnLogin.addEventListener('click', async () => {
            // Mostrar confirmación antes de cerrar sesión
            if (hasUnsavedChanges()) {
                const confirm = window.confirm('Tienes cambios sin guardar. ¿Estás seguro de que deseas cerrar sesión?');
                if (!confirm) return;
            }
            
            try {
                // Cerrar sesión
                await authAPI.logout();
                window.location.href = '/';
            } catch (error) {
                console.error('Error al cerrar sesión:', error);
                showNotification('Error al cerrar sesión', 'error');
            }
        });
    }
    
    // Marcar el botón de configuración como activo por defecto
    setActiveNavButton(btnConfiguracion);
}

/**
 * Establecer el botón de navegación activo
 */
function setActiveNavButton(activeButton) {
    // Remover clase active de todos los botones
    const allNavButtons = document.querySelectorAll('.nav-button');
    allNavButtons.forEach(button => {
        button.classList.remove('active');
    });
    
    // Añadir clase active al botón seleccionado
    if (activeButton) {
        activeButton.classList.add('active');
    }
}

/**
 * Verificar si hay cambios sin guardar
 */
function hasUnsavedChanges() {
    const currentFormConfig = {
        tipo_voz: document.getElementById('voice-type').value,
        velocidad_lectura: parseFloat(document.getElementById('reading-speed').value),
        tamaño_fuente: document.getElementById('font-size').value,
        contraste_alto: document.getElementById('high-contrast').checked,
        retroalimentacion_audio: document.getElementById('audio-feedback').checked
    };
    
    return JSON.stringify(currentFormConfig) !== JSON.stringify(originalConfig);
}

/**
 * Probar la voz seleccionada
 */
async function testVoice() {
    const voiceType = document.getElementById('voice-type').value;
    const speed = parseFloat(document.getElementById('reading-speed').value);
    
    const testText = voiceType === 'mujer' 
        ? "Hola, soy la voz femenina de OpenAI integrada en Auris. Así es como sueno cuando leo tus documentos."
        : "Hola, soy la voz masculina de OpenAI integrada en Auris. Así es como sueno cuando leo tus documentos.";
    
    try {
        // Intentar usar OpenAI TTS primero
        const response = await fetch('/api/synthesize-speech', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: testText,
                voice_type: voiceType,
                speed: speed
            })
        });

        const data = await response.json();

        if (data.success) {
            // Reproducir audio de OpenAI
            const audio = new Audio(data.audio_url);
            audio.play();
            showNotification(`Reproduciendo voz de prueba con ${data.provider === 'openai' ? 'OpenAI' : 'TTS local'}...`, 'info');
        } else {
            throw new Error(data.error || 'Error en síntesis de voz');
        }
        
    } catch (error) {
        console.error('Error al probar voz:', error);
        
        // Fallback al TTS del navegador
        try {
            const utterance = new SpeechSynthesisUtterance(testText);
            utterance.rate = speed;
            utterance.lang = 'es-ES';
            speechSynthesis.cancel();
            speechSynthesis.speak(utterance);
            showNotification('Reproduciendo voz de prueba con TTS del navegador...', 'info');
        } catch (fallbackError) {
            showNotification('Error al reproducir la voz de prueba', 'error');
        }
    }
}

/**
 * Guardar configuración
 */
async function saveConfiguration() {
    const saveBtn = document.getElementById('save-config');
    const originalText = saveBtn.textContent;
    
    saveBtn.disabled = true;
    saveBtn.textContent = 'Guardando...';
    
    try {
        const newConfig = {
            tipo_voz: document.getElementById('voice-type').value,
            velocidad_lectura: parseFloat(document.getElementById('reading-speed').value),
            tamaño_fuente: document.getElementById('font-size').value,
            contraste_alto: document.getElementById('high-contrast').checked,
            retroalimentacion_audio: document.getElementById('audio-feedback').checked
        };
        
        const response = await authAPI.authenticatedFetch('/api/user/config', {
            method: 'PUT',
            body: JSON.stringify(newConfig)
        });
        
        if (response.ok) {
            currentConfig = newConfig;
            originalConfig = { ...newConfig };
            
            // Guardar en localStorage para acceso rápido
            localStorage.setItem('user_config', JSON.stringify(newConfig));
            
            showNotification('Configuración guardada correctamente', 'success');
        } else {
            throw new Error('Error al guardar configuración');
        }
        
    } catch (error) {
        console.error('Error guardando configuración:', error);
        showNotification('Error al guardar la configuración', 'error');
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = originalText;
    }
}

/**
 * Cancelar cambios
 */
function cancelConfiguration() {
    // Restaurar configuración original
    fillConfigurationData(originalConfig);
    showNotification('Cambios cancelados', 'info');
}

/**
 * Mostrar notificación
 */
function showNotification(message, type = 'info') {
    // Crear elemento de notificación
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        max-width: 400px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        transform: translateX(100%);
        transition: transform 0.3s ease;
        background-color: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
    `;
    
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <span>${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
            <span style="flex: 1;">${message}</span>
            <button onclick="this.parentElement.parentElement.remove()" 
                    style="background: none; border: none; color: white; font-size: 18px; cursor: pointer;">×</button>
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
    }, 5000);
}

