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

/**
 * Mostrar consejos al usuario sobre las nuevas características
 */
function showFeatureTips() {
    const tips = [
        "💡 Ahora puedes elegir entre voz masculina y femenina en Configuración",
        "🎯 Haz clic en la barra de progreso para saltar a cualquier parte del texto",
        "⚡ Cambia la velocidad de lectura en tiempo real sin interrumpir la reproducción",
        "🔊 Las voces ahora suenan más naturales y humanas"
    ];
    
    const randomTip = tips[Math.floor(Math.random() * tips.length)];
    
    // Mostrar tip después de 3 segundos
    setTimeout(() => {
        showNotification(randomTip, 'info');
    }, 3000);
}

/**
 * Mostrar notificación
 */
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `home-notification ${type}`;
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
        <div style="display: flex; align-items: flex-start; gap: 10px;">
            <span style="font-size: 18px; margin-top: 2px;">💡</span>
            <span style="flex: 1; line-height: 1.4;">${message}</span>
            <button onclick="this.parentElement.parentElement.remove()" 
                    style="background: none; border: none; color: white; font-size: 18px; cursor: pointer; padding: 0; margin-top: 2px;">×</button>
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
    }, 8000);
}

// Mostrar tips de características después de cargar
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        showFeatureTips();
    }, 2000);
});