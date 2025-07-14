/**
 * home.js - Manejo de la página de inicio
 */

// Inicializar página de inicio
document.addEventListener('DOMContentLoaded', async () => {
    // Verificar autenticación
    if (!(await authAPI.verifyAuthentication())) {
        window.location.href = '/';
        return;
    }

    await loadUserInfo();
    setupHomeEventListeners();
    setupNavigationListeners(); // Añadido para configurar el menú
});

/**
 * Cargar información del usuario
 */
async function loadUserInfo() {
    try {
        const response = await authAPI.authenticatedFetch('/api/user/config');
        
        if (response.ok) {
            const data = await response.json();
            const user = data.usuario;
            
            // Mostrar bienvenida personalizada
            const userWelcome = document.getElementById('user-welcome');
            const userName = document.getElementById('user-name');
            
            if (user && user.nombre_usuario) {
                userName.textContent = user.nombre_usuario;
                userWelcome.style.display = 'block';
            }
            
        } else {
            console.warn('No se pudo cargar la información del usuario');
        }
    } catch (error) {
        console.error('Error cargando información del usuario:', error);
    }
}

/**
 * Configurar event listeners para la página de inicio
 */
function setupHomeEventListeners() {
    // Tarjetas principales
    const cardVisual = document.getElementById('card-visual');
    const cardAuditivo = document.getElementById('card-auditivo');
    
    if (cardVisual) {
        cardVisual.addEventListener('click', () => {
            window.location.href = '/modo_visual';
        });
    }
    
    if (cardAuditivo) {
        cardAuditivo.addEventListener('click', () => {
            window.location.href = '/modo_auditivo';
        });
    }
    
    // Botones de acción
    const visualButton = document.querySelector('.visual-button');
    const auditoryButton = document.querySelector('.auditory-button');
    
    if (visualButton) {
        visualButton.addEventListener('click', (e) => {
            e.stopPropagation();
            window.location.href = '/modo_visual';
        });
    }
    
    if (auditoryButton) {
        auditoryButton.addEventListener('click', (e) => {
            e.stopPropagation();
            window.location.href = '/modo_auditivo';
        });
    }
    
    // Accesos rápidos
    const quickBiblioteca = document.getElementById('quick-biblioteca');
    const quickConfiguracion = document.getElementById('quick-configuracion');
    
    if (quickBiblioteca) {
        quickBiblioteca.addEventListener('click', () => {
            window.location.href = '/biblioteca';
        });
    }
    
    if (quickConfiguracion) {
        quickConfiguracion.addEventListener('click', () => {
            window.location.href = '/configuracion';
        });
    }
    
    // Efectos hover para las tarjetas
    setupHoverEffects();
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
            // Ya estamos en inicio, pero podríamos recargar o hacer scroll al top
            window.scrollTo(0, 0);
            setActiveNavButton(btnInicio);
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
    
    // Marcar el botón de inicio como activo por defecto
    setActiveNavButton(btnInicio);
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
 * Configurar efectos hover para las tarjetas
 */
function setupHoverEffects() {
    const cards = document.querySelectorAll('.assistant-card, .quick-access-item');
    
    cards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-5px)';
            card.style.transition = 'transform 0.3s ease';
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'translateY(0)';
        });
    });
}


// Mostrar tips de características después de cargar
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        showFeatureTips();
    }, 2000);
});