/**
 * Archivo principal de JavaScript para la aplicación Auris
 * Controla la navegación y funcionalidades generales de la aplicación
 */

document.addEventListener('DOMContentLoaded', function() {
    // Referencias a elementos DOM
    const btnInicio = document.getElementById('btn-inicio');
    const btnModoVisual = document.getElementById('btn-modo-visual');
    const btnModoAuditivo = document.getElementById('btn-modo-auditivo');
    const btnBiblioteca = document.getElementById('btn-biblioteca');
    const btnConfiguracion = document.getElementById('btn-configuracion');
    
    const visualAssistant = document.querySelector('.visual-assistant');
    const auditoryAssistant = document.querySelector('.auditory-assistant');
    
    const visualButton = document.querySelector('.visual-button');
    const auditoryButton = document.querySelector('.auditory-button');
    
    // Estado para manejar el modo actual
    let currentMode = 'inicio';
    
    // Función para cambiar entre modos
    function switchMode(mode) {
        // Desactivar todos los botones
        const allButtons = document.querySelectorAll('.nav-button');
        allButtons.forEach(btn => {
            btn.classList.remove('inicio-btn');
            btn.style.backgroundColor = '';
        });
        
        // Activar el botón correspondiente
        switch(mode) {
            case 'inicio':
                btnInicio.classList.add('inicio-btn');
                loadHomeContent();
                break;
            case 'visual':
                btnModoVisual.style.backgroundColor = 'var(--primary-orange)';
                loadVisualMode();
                break;
            case 'auditivo':
                btnModoAuditivo.style.backgroundColor = 'var(--primary-blue)';
                loadAuditoryMode();
                break;
            case 'biblioteca':
                btnBiblioteca.style.backgroundColor = '#444';
                loadLibrary();
                break;
            case 'configuracion':
                btnConfiguracion.style.backgroundColor = '#444';
                loadSettings();
                break;
        }
        
        currentMode = mode;
        
        // Guardar preferencia del usuario
        localStorage.setItem('auris-mode', mode);
    }
    
    // Funciones para cargar contenido
    function loadHomeContent() {
        console.log('Cargando página de inicio');
        // Aquí se cargaría el contenido de la página de inicio
        // Por ahora solo mostramos un mensaje en consola
    }
    
    function loadVisualMode() {
        console.log('Cargando modo visual');
        // Implementación para cargar el modo visual
        // Activar el lector de pantalla, ajustar contrastes, etc.
    }
    
    function loadAuditoryMode() {
        console.log('Cargando modo auditivo');
        // Implementación para cargar el modo auditivo
        // Activar el sistema de reconocimiento de voz, etc.
    }
    
    function loadLibrary() {
        console.log('Cargando biblioteca');
        // Implementación para cargar la biblioteca de documentos
    }
    
    function loadSettings() {
        console.log('Cargando configuración');
        // Implementación para cargar la configuración
    }
    
    // Funciones de accesibilidad
    function setupAccessibility() {
        // Añadir roles ARIA para mejorar la accesibilidad
        document.querySelectorAll('.nav-button').forEach(btn => {
            btn.setAttribute('role', 'button');
            btn.setAttribute('aria-pressed', 'false');
        });
        
        document.querySelector('.inicio-btn').setAttribute('aria-pressed', 'true');
        
        // Hacer que los elementos interactivos sean navegables por teclado
        document.querySelectorAll('.assistant-card, .action-button').forEach(el => {
            if (!el.getAttribute('tabindex')) {
                el.setAttribute('tabindex', '0');
            }
            
            // Permitir la activación con teclado (Enter y Space)
            el.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.click();
                }
            });
        });
    }
    
    // Event listeners
    btnInicio.addEventListener('click', () => switchMode('inicio'));
    btnModoVisual.addEventListener('click', () => switchMode('visual'));
    btnModoAuditivo.addEventListener('click', () => switchMode('auditivo'));
    btnBiblioteca.addEventListener('click', () => switchMode('biblioteca'));
    btnConfiguracion.addEventListener('click', () => switchMode('configuracion'));
    
    visualAssistant.addEventListener('click', () => switchMode('visual'));
    auditoryAssistant.addEventListener('click', () => switchMode('auditivo'));
    
    visualButton.addEventListener('click', () => switchMode('visual'));
    auditoryButton.addEventListener('click', () => switchMode('auditivo'));
    
    // Inicialización
    function init() {
        // Recuperar preferencia guardada o usar 'inicio' como valor predeterminado
        const savedMode = localStorage.getItem('auris-mode') || 'inicio';
        switchMode(savedMode);
        
        // Configurar funciones de accesibilidad
        setupAccessibility();
        
        // Añadir soporte para lector de pantalla
        document.body.setAttribute('role', 'application');
        document.body.setAttribute('aria-label', 'Auris - Asistente Académico Inclusivo');
    }
    
    // Iniciar la aplicación
    init();
});