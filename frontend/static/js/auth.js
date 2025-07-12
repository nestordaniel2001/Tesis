/**
 * auth.js - Manejo de autenticación de usuarios
 */

// Configuración de la API
const API_BASE_URL = window.location.origin;

// Estado de autenticación
let authState = {
    token: localStorage.getItem('auth_token'),
    user: JSON.parse(localStorage.getItem('user_data') || 'null'),
    isAuthenticated: false
};

// Verificar autenticación al cargar
document.addEventListener('DOMContentLoaded', () => {
    verifyAuthentication();
});

/**
 * Verificar si el usuario está autenticado
 */
async function verifyAuthentication() {
    if (!authState.token) {
        authState.isAuthenticated = false;
        return false;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/user/config`, {
            headers: {
                'Authorization': `Bearer ${authState.token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            authState.user = data.usuario;
            authState.isAuthenticated = true;
            return true;
        } else {
            logout();
            return false;
        }
    } catch (error) {
        console.error('Error verificando autenticación:', error);
        logout();
        return false;
    }
}

/**
 * Registrar nuevo usuario
 */
async function register(userData) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        });

        const data = await response.json();

        if (response.ok) {
            showNotification('¡Usuario registrado exitosamente! Puedes iniciar sesión ahora.', 'success');
            return { success: true, data };
        } else {
            showNotification(data.error || 'Error al registrar usuario', 'error');
            return { success: false, error: data.error };
        }
    } catch (error) {
        console.error('Error en registro:', error);
        showNotification('Error de conexión al registrar usuario', 'error');
        return { success: false, error: 'Error de conexión' };
    }
}

/**
 * Iniciar sesión
 */
async function login(credentials) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(credentials)
        });

        const data = await response.json();

        if (response.ok) {
            // Guardar token y datos del usuario
            authState.token = data.token;
            authState.user = data.usuario;
            authState.isAuthenticated = true;

            localStorage.setItem('auth_token', data.token);
            localStorage.setItem('user_data', JSON.stringify(data.usuario));
            localStorage.setItem('user_config', JSON.stringify(data.configuraciones));

            showNotification('¡Bienvenido de vuelta!', 'success');
            
            // Redirigir a la página principal
            setTimeout(() => {
                window.location.href = '/inicio';
            }, 1000);

            return { success: true, data };
        } else {
            showNotification(data.error || 'Credenciales inválidas', 'error');
            return { success: false, error: data.error };
        }
    } catch (error) {
        console.error('Error en login:', error);
        showNotification('Error de conexión al iniciar sesión', 'error');
        return { success: false, error: 'Error de conexión' };
    }
}

/**
 * Cerrar sesión
 */
function logout() {
    authState.token = null;
    authState.user = null;
    authState.isAuthenticated = false;

    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
    localStorage.removeItem('user_config');

    showNotification('Sesión cerrada correctamente', 'info');
    
    // Redirigir al login
    setTimeout(() => {
        window.location.href = '/';
    }, 1000);
}

/**
 * Obtener token de autenticación
 */
function getAuthToken() {
    return authState.token;
}

/**
 * Obtener datos del usuario actual
 */
function getCurrentUser() {
    return authState.user;
}

/**
 * Verificar si el usuario está autenticado
 */
function isAuthenticated() {
    return authState.isAuthenticated;
}

/**
 * Realizar petición autenticada
 */
async function authenticatedFetch(url, options = {}) {
    if (!authState.token) {
        throw new Error('No hay token de autenticación');
    }

    const defaultHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authState.token}`
    };

    const fetchOptions = {
        ...options,
        headers: {
            ...defaultHeaders,
            ...options.headers
        }
    };

    const response = await fetch(url, fetchOptions);

    if (response.status === 401) {
        logout();
        throw new Error('Token expirado');
    }

    return response;
}

/**
 * Mostrar notificación
 */
function showNotification(message, type = 'info') {
    // Crear elemento de notificación
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-icon">
                ${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}
            </span>
            <span class="notification-message">${message}</span>
            <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
    `;

    // Agregar estilos si no existen
    if (!document.querySelector('#notification-styles')) {
        const styles = document.createElement('style');
        styles.id = 'notification-styles';
        styles.textContent = `
            .notification {
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
            }
            .notification.success { background-color: #10b981; }
            .notification.error { background-color: #ef4444; }
            .notification.info { background-color: #3b82f6; }
            .notification-content {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .notification-message { flex: 1; }
            .notification-close {
                background: none;
                border: none;
                color: white;
                font-size: 18px;
                cursor: pointer;
                padding: 0;
                width: 20px;
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
        `;
        document.head.appendChild(styles);
    }

    document.body.appendChild(notification);

    // Animar entrada
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);

    // Auto-remover después de 5 segundos
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 300);
    }, 5000);
}

// Exportar funciones para uso global
window.authAPI = {
    register,
    login,
    logout,
    getAuthToken,
    getCurrentUser,
    isAuthenticated,
    authenticatedFetch,
    verifyAuthentication
};