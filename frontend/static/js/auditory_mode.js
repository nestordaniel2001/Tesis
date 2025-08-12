/**
 * auditory_mode.js - Manejo específico de la página del modo auditivo
 */

// Inicializar página del modo auditivo
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🎤 Cargando página del modo auditivo...');
    
    // Verificar autenticación
    const isAuth = await authAPI.verifyAuthentication();
    console.log('🔐 Estado de autenticación:', isAuth);
    
    if (!isAuth) {
        console.log('❌ Usuario no autenticado, redirigiendo al login...');
        window.location.href = '/';
        return;
    }

    console.log('✅ Usuario autenticado, cargando modo auditivo...');
    setupAuditoryNavigationListeners();
});

/**
 * Configurar event listeners para la navegación del menú lateral
 */
function setupAuditoryNavigationListeners() {
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
            // Ya estamos en modo auditivo, hacer scroll al top
            window.scrollTo(0, 0);
            setActiveNavButton(btnModoAuditivo);
        });
    }
    
    if (btnBiblioteca) {
        btnBiblioteca.addEventListener('click', () => {
            window.location.href = '/biblioteca';
        });
    }
    
    if (btnConfiguracion) {
        btnConfiguracion.addEventListener('click', () => {
            window.location.href = '/configuracion';
        });
    }
    
    if (btnLogin) {
        btnLogin.addEventListener('click', async () => {
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
    
    // Marcar el botón de modo auditivo como activo por defecto
    setActiveNavButton(btnModoAuditivo);
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
 * Mostrar notificación
 */
function showNotification(message, type = 'info') {
    console.log(`📢 ${type.toUpperCase()}: ${message}`);
    
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
}

console.log('🎤 Módulo auditory_mode.js cargado correctamente');