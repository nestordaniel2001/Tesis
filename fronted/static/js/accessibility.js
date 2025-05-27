/**
 * Funcionalidades de accesibilidad para Auris
 * Proporciona utilidades y herramientas para mejorar la accesibilidad
 */

class AccessibilityManager {
    constructor() {
        // Configuración inicial
        this.config = {
            highContrast: false,
            largeText: false,
            reduceMotion: false,
            focusMode: false,
            keyboardNavigationEnabled: true
        };
        
        // Cargar configuración guardada
        this.loadConfig();
        
        // Inicializar funcionalidades
        this.init();
    }
    
    // Cargar configuración guardada
    loadConfig() {
        const savedConfig = localStorage.getItem('auris-accessibility-config');
        if (savedConfig) {
            try {
                const parsedConfig = JSON.parse(savedConfig);
                this.config = { ...this.config, ...parsedConfig };
            } catch (e) {
                console.error('Error al cargar la configuración de accesibilidad', e);
            }
        }
    }
    
    // Guardar configuración actual
    saveConfig() {
        localStorage.setItem('auris-accessibility-config', JSON.stringify(this.config));
    }
    
    // Inicializar configuraciones y event listeners
    init() {
        // Aplicar configuraciones iniciales
        this.applyHighContrast(this.config.highContrast);
        this.applyLargeText(this.config.largeText);
        this.applyReduceMotion(this.config.reduceMotion);
        this.applyFocusMode(this.config.focusMode);
        
        // Inicializar navegación por teclado
        if (this.config.keyboardNavigationEnabled) {
            this.initKeyboardNavigation();
        }
        
        // Añadir botón de accesibilidad
        this.addAccessibilityButton();
    }
    
    // Añadir botón de accesibilidad en la página
    addAccessibilityButton() {
        const button = document.createElement('button');
        button.className = 'accessibility-button';
        button.setAttribute('aria-label', 'Abrir menú de accesibilidad');
        button.innerHTML = '♿'; // Símbolo de accesibilidad
        
        button.addEventListener('click', () => this.toggleAccessibilityMenu());
        
        document.body.appendChild(button);
    }
    
    // Mostrar/ocultar menú de accesibilidad
    toggleAccessibilityMenu() {
        let menu = document.getElementById('accessibility-menu');
        
        if (menu) {
            // Si el menú ya existe, eliminarlo
            document.body.removeChild(menu);
        } else {
            // Crear nuevo menú
            menu = document.createElement('div');
            menu.id = 'accessibility-menu';
            menu.className = 'accessibility-menu';
            menu.setAttribute('role', 'dialog');
            menu.setAttribute('aria-labelledby', 'accessibility-title');
            
            // Título del menú
            const title = document.createElement('h2');
            title.id = 'accessibility-title';
            title.textContent = 'Opciones de Accesibilidad';
            menu.appendChild(title);
            
            // Añadir opciones
            this.createMenuOptions(menu);
            
            // Botón para cerrar
            const closeButton = document.createElement('button');
            closeButton.textContent = 'Cerrar';
            closeButton.setAttribute('aria-label', 'Cerrar menú de accesibilidad');
            closeButton.addEventListener('click', () => {
                document.body.removeChild(menu);
            });
            menu.appendChild(closeButton);
            
            // Añadir el menú al documento
            document.body.appendChild(menu);
            
            // Enfocar el título para lectores de pantalla
            title.focus();
        }
    }
    
    // Crear opciones dentro del menú de accesibilidad
    createMenuOptions(menuElement) {
        // Opción de alto contraste
        this.addToggleOption(
            menuElement,
            'Alto contraste',
            'Mejora la legibilidad con mayor contraste entre texto y fondo',
            this.config.highContrast,
            (checked) => {
                this.config.highContrast = checked;
                this.saveConfig();
                this.applyHighContrast(checked);
            }
        );
        
        // Opción de texto grande
        this.addToggleOption(
            menuElement,
            'Texto grande',
            'Aumenta el tamaño del texto para mejor legibilidad',
            this.config.largeText,
            (checked) => {
                this.config.largeText = checked;
                this.saveConfig();
                this.applyLargeText(checked);
            }
        );
        
        // Opción de reducir movimiento
        this.addToggleOption(
            menuElement,
            'Reducir movimiento',
            'Minimiza animaciones y efectos de movimiento',
            this.config.reduceMotion,
            (checked) => {
                this.config.reduceMotion = checked;
                this.saveConfig();
                this.applyReduceMotion(checked);
            }
        );
        
        // Opción de modo de enfoque
        this.addToggleOption(
            menuElement,
            'Modo de enfoque',
            'Resalta el elemento activo y reduce distracciones',
            this.config.focusMode,
            (checked) => {
                this.config.focusMode = checked;
                this.saveConfig();
                this.applyFocusMode(checked);
            }
        );
    }
    
    // Añadir una opción de toggle al menú
    addToggleOption(parent, label, description, initialState, onChangeCallback) {
        const container = document.createElement('div');
        container.className = 'accessibility-option';
        
        // Checkbox
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `accessibility-${label.toLowerCase().replace(/\s+/g, '-')}`;
        checkbox.checked = initialState;
        checkbox.addEventListener('change', () => {
            onChangeCallback(checkbox.checked);
        });
        
        // Etiqueta
        const labelElement = document.createElement('label');
        labelElement.htmlFor = checkbox.id;
        labelElement.textContent = label;
        
        // Descripción
        const descElement = document.createElement('p');
        descElement.className = 'accessibility-description';
        descElement.textContent = description;
        
        // Añadir elementos al contenedor
        container.appendChild(checkbox);
        container.appendChild(labelElement);
        container.appendChild(descElement);
        
        // Añadir contenedor al padre
        parent.appendChild(container);
    }
    
    // Aplicar estilo de alto contraste
    applyHighContrast(enabled) {
        if (enabled) {
            document.body.classList.add('high-contrast-mode');
        } else {
            document.body.classList.remove('high-contrast-mode');
        }
    }
    
    // Aplicar estilo de texto grande
    applyLargeText(enabled) {
        if (enabled) {
            document.body.classList.add('large-text-mode');
        } else {
            document.body.classList.remove('large-text-mode');
        }
    }
    
    // Aplicar reducción de movimiento
    applyReduceMotion(enabled) {
        if (enabled) {
            document.body.classList.add('reduce-motion');
        } else {
            document.body.classList.remove('reduce-motion');
        }
    }
    
    // Aplicar modo de enfoque
    applyFocusMode(enabled) {
        if (enabled) {
            document.body.classList.add('focus-mode');
            
            // Mejorar visibilidad del enfoque
            this.addFocusStyleSheet();
        } else {
            document.body.classList.remove('focus-mode');
        }
    }
    
    // Añadir estilos para mejorar la visibilidad del enfoque
    addFocusStyleSheet() {
        // Verificar si ya existe la hoja de estilos
        if (document.getElementById('focus-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'focus-styles';
        style.textContent = `
            .focus-mode *:focus {
                outline: 3px solid #ff9966 !important;
                outline-offset: 2px !important;
                box-shadow: 0 0 8px #ff9966 !important;
            }
            
            .focus-mode .focused-element {
                position: relative;
                z-index: 100;
                box-shadow: 0 0 0 1000px rgba(0, 0, 0, 0.3) !important;
            }
        `;
        
        document.head.appendChild(style);
    }
    
    // Inicializar navegación mejorada por teclado
    initKeyboardNavigation() {
        document.addEventListener('keydown', (e) => {
            // Atajos de teclado para accesibilidad
            
            // Alt + A: Abrir menú de accesibilidad
            if (e.altKey && e.key === 'a') {
                e.preventDefault();
                this.toggleAccessibilityMenu();
            }
            
            // Alt + H: Alternar alto contraste
            if (e.altKey && e.key === 'h') {
                e.preventDefault();
                this.config.highContrast = !this.config.highContrast;
                this.saveConfig();
                this.applyHighContrast(this.config.highContrast);
            }
            
            // Alt + T: Alternar texto grande
            if (e.altKey && e.key === 't') {
                e.preventDefault();
                this.config.largeText = !this.config.largeText;
                this.saveConfig();
                this.applyLargeText(this.config.largeText);
            }
            
            // Alt + F: Alternar modo de enfoque
            if (e.altKey && e.key === 'f') {
                e.preventDefault();
                this.config.focusMode = !this.config.focusMode;
                this.saveConfig();
                this.applyFocusMode(this.config.focusMode);
            }
        });
        
        // Mejorar el indicador de enfoque para navegación por teclado
        document.addEventListener('focusin', (e) => {
            if (this.config.focusMode) {
                // Quitar clase de elemento enfocado anteriormente
                const prevFocused = document.querySelector('.focused-element');
                if (prevFocused) {
                    prevFocused.classList.remove('focused-element');
                }
                
                // Añadir clase al elemento actualmente enfocado
                e.target.classList.add('focused-element');
            }
        });
    }
    
    // Anunciar mensajes para lectores de pantalla
    announceForScreenReader(message, priority = 'polite') {
        // Crear región live o usar una existente
        let announcer = document.getElementById('screen-reader-announcer');
        
        if (!announcer) {
            announcer = document.createElement('div');
            announcer.id = 'screen-reader-announcer';
            announcer.setAttribute('aria-live', priority);
            announcer.setAttribute('aria-atomic', 'true');
            announcer.className = 'sr-only'; // Estilo para ocultar visualmente
            document.body.appendChild(announcer);
        }
        
        // Limpiar el contenido anterior
        announcer.textContent = '';
        
        // Forzar actualización del DOM antes de añadir nuevo contenido
        setTimeout(() => {
            announcer.textContent = message;
        }, 50);
    }
    
    // Mejora específica para ayudar en la navegación por teclado
    enableKeyboardNavigationHelp() {
        // Mostrar indicaciones de atajos al presionar Alt
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Alt') {
                const shortcuts = document.getElementById('keyboard-shortcuts');
                if (!shortcuts) {
                    const info = document.createElement('div');
                    info.id = 'keyboard-shortcuts';
                    info.className = 'keyboard-shortcuts-help';
                    info.innerHTML = `
                        <h3>Atajos de teclado:</h3>
                        <ul>
                            <li>Alt + A: Abrir menú de accesibilidad</li>
                            <li>Alt + H: Alternar alto contraste</li>
                            <li>Alt + T: Alternar texto grande</li>
                            <li>Alt + F: Alternar modo de enfoque</li>
                        </ul>
                    `;
                    document.body.appendChild(info);
                    
                    // Eliminar después de un tiempo
                    document.addEventListener('keyup', function removeInfo(ev) {
                        if (ev.key === 'Alt') {
                            if (info.parentNode) {
                                document.body.removeChild(info);
                            }
                            document.removeEventListener('keyup', removeInfo);
                        }
                    });
                }
            }
        });
    }
}

// Exportar la clase para su uso en otros archivos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AccessibilityManager;
} else {
    // Si no estamos en un entorno de módulos, añadir a window
    window.AccessibilityManager = AccessibilityManager;
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    // Crear instancia del gestor de accesibilidad
    window.accessibilityManager = new AccessibilityManager();
});