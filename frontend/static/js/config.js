/**
 * config.js - Manejo de la página de configuración
 */

let currentConfig = {};
let originalConfig = {};

// Inicializar página de configuración
document.addEventListener('DOMContentLoaded', async () => {
    // Verificar autenticación
    if (!(await authAPI.verifyAuthentication())) {
        window.location.href = '/';
        return;
    }

    await loadUserConfiguration();
    setupEventListeners();
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
 * Probar la voz seleccionada
 */
async function testVoice() {
    const voiceType = document.getElementById('voice-type').value;
    const speed = parseFloat(document.getElementById('reading-speed').value);
    
    const testText = voiceType === 'mujer' 
        ? "Hola, soy la voz femenina de Auris. Así es como sueno cuando leo tus documentos."
        : "Hola, soy la voz masculina de Auris. Así es como sueno cuando leo tus documentos.";
    
    try {
        // Usar la API de síntesis de voz del navegador
        const utterance = new SpeechSynthesisUtterance(testText);
        
        // Configurar la voz
        const voices = speechSynthesis.getVoices();
        let selectedVoice;
        
        if (voiceType === 'mujer') {
            selectedVoice = voices.find(voice => 
                voice.lang.includes('es') && voice.name.toLowerCase().includes('female')
            ) || voices.find(voice => voice.lang.includes('es') && voice.name.includes('María'));
        } else {
            selectedVoice = voices.find(voice => 
                voice.lang.includes('es') && voice.name.toLowerCase().includes('male')
            ) || voices.find(voice => voice.lang.includes('es') && voice.name.includes('Carlos'));
        }
        
        // Si no encuentra voz específica, usar la primera en español
        if (!selectedVoice) {
            selectedVoice = voices.find(voice => voice.lang.includes('es'));
        }
        
        if (selectedVoice) {
            utterance.voice = selectedVoice;
        }
        
        utterance.rate = speed;
        utterance.lang = 'es-ES';
        
        // Cancelar cualquier síntesis anterior
        speechSynthesis.cancel();
        
        // Hablar
        speechSynthesis.speak(utterance);
        
        showNotification('Reproduciendo voz de prueba...', 'info');
        
    } catch (error) {
        console.error('Error al probar voz:', error);
        showNotification('Error al reproducir la voz de prueba', 'error');
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