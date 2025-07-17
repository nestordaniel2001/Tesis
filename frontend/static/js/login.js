// Limpiar cualquier token inválido al cargar la página de login
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🔍 Iniciando página de login...');
    
    // Limpiar localStorage completamente para evitar conflictos
    localStorage.clear();
    console.log('🧹 localStorage limpiado');
    
    // Esperar un momento para que se cargue auth.js
    setTimeout(() => {
        initializeLoginPage();
    }, 100);
});

function initializeLoginPage() {
    console.log('🚀 Inicializando página de login...');
    
    // Efecto de partículas
    function createParticle() {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + 'vw';
        particle.style.width = particle.style.height = Math.random() * 10 + 5 + 'px';
        particle.style.animationDuration = Math.random() * 3 + 2 + 's';
        document.body.appendChild(particle);

        setTimeout(() => {
            particle.remove();
        }, 5000);
    }

    // Crear partículas cada cierto tiempo
    setInterval(createParticle, 300);

    // Estado de la aplicación
    let isLoginMode = true;

    // Elementos del DOM
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const loginBtn = document.getElementById('loginBtn');
    const toggleLink = document.querySelector('.toggle-mode');
    const formTitle = document.querySelector('.logo-text');
    const formSubtitle = document.querySelector('.logo-subtitle');

    if (!loginForm || !emailInput || !passwordInput || !loginBtn) {
        console.error('❌ Elementos del formulario no encontrados');
        return;
    }

    // Crear campo de nombre de usuario para registro (oculto inicialmente)
    const usernameGroup = document.createElement('div');
    usernameGroup.className = 'form-group';
    usernameGroup.style.display = 'none';
    usernameGroup.innerHTML = `
        <input 
            type="text" 
            class="form-input" 
            placeholder="Nombre de usuario"
            id="username"
            minlength="3"
        >
    `;
    loginForm.insertBefore(usernameGroup, emailInput.parentElement);
    const usernameInput = document.getElementById('username');

    // Crear enlace para alternar entre login y registro
    if (!toggleLink) {
        const loginLinks = document.querySelector('.login-links');
        if (loginLinks) {
            const newToggleLink = document.createElement('a');
            newToggleLink.href = '#';
            newToggleLink.className = 'login-link toggle-mode';
            newToggleLink.textContent = '¿No tienes cuenta? Regístrate';
            loginLinks.appendChild(newToggleLink);
            
            newToggleLink.addEventListener('click', toggleMode);
        }
    } else {
        toggleLink.addEventListener('click', toggleMode);
    }

    // Función para alternar entre login y registro
    function toggleMode(e) {
        e.preventDefault();
        
        isLoginMode = !isLoginMode;
        
        if (isLoginMode) {
            // Modo Login
            if (formTitle) formTitle.textContent = 'Auris';
            if (formSubtitle) formSubtitle.textContent = 'Tu asistente académico personalizado';
            loginBtn.textContent = 'Iniciar Sesión';
            usernameGroup.style.display = 'none';
            usernameInput.removeAttribute('required');
            const toggleElement = document.querySelector('.toggle-mode');
            if (toggleElement) toggleElement.textContent = '¿No tienes cuenta? Regístrate';
        } else {
            // Modo Registro
            if (formTitle) formTitle.textContent = 'Registro';
            if (formSubtitle) formSubtitle.textContent = 'Crea tu cuenta en Auris';
            loginBtn.textContent = 'Registrarse';
            usernameGroup.style.display = 'block';
            usernameInput.setAttribute('required', '');
            const toggleElement = document.querySelector('.toggle-mode');
            if (toggleElement) toggleElement.textContent = '¿Ya tienes cuenta? Inicia sesión';
        }
    }

    // Manejo del formulario
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        const username = usernameInput.value.trim();

        console.log(`📝 Enviando formulario: ${isLoginMode ? 'Login' : 'Registro'}`);

        // Validaciones básicas
        if (!email || !password) {
            showNotification('Por favor completa todos los campos', 'error');
            return;
        }

        if (!isLoginMode && !username) {
            showNotification('Por favor ingresa un nombre de usuario', 'error');
            return;
        }

        // Mostrar estado de carga
        const originalText = loginBtn.textContent;
        loginBtn.disabled = true;
        loginBtn.textContent = isLoginMode ? 'Iniciando...' : 'Registrando...';
        loginBtn.classList.add('loading');

        try {
            let result;
            
            if (isLoginMode) {
                console.log('🔐 Intentando login...');
                result = await window.authAPI.login({
                    correo_electronico: email,
                    contraseña: password
                });
            } else {
                console.log('📝 Intentando registro...');
                result = await window.authAPI.register({
                    nombre_usuario: username,
                    correo_electronico: email,
                    contraseña: password
                });
                
                if (result.success) {
                    // Cambiar a modo login después del registro exitoso
                    setTimeout(() => {
                        toggleMode(e);
                        emailInput.value = email;
                        passwordInput.value = '';
                        usernameInput.value = '';
                    }, 2000);
                }
            }
        } catch (error) {
            console.error('❌ Error en formulario:', error);
            showNotification('Error de conexión', 'error');
        } finally {
            // Restaurar estado del botón
            loginBtn.disabled = false;
            loginBtn.textContent = originalText;
            loginBtn.classList.remove('loading');
        }
    });

    // Efectos adicionales en los inputs
    const inputs = document.querySelectorAll('.form-input');
    inputs.forEach(input => {
        input.addEventListener('focus', function() {
            this.parentElement.style.transform = 'scale(1.02)';
        });

        input.addEventListener('blur', function() {
            this.parentElement.style.transform = 'scale(1)';
        });
    });

    // Efecto de escritura en el título
    function typeWriter(element, text, speed = 100) {
        if (!element) return;
        
        let i = 0;
        element.textContent = '';
        
        function type() {
            if (i < text.length) {
                element.textContent += text.charAt(i);
                i++;
                setTimeout(type, speed);
            }
        }
        
        type();
    }

    // Activar efecto de escritura después de un delay
    setTimeout(() => {
        const subtitle = document.querySelector('.logo-subtitle');
        if (subtitle) {
            typeWriter(subtitle, 'Tu asistente académico personalizado', 50);
        }
    }, 1000);

    console.log('✅ Página de login inicializada correctamente');
}

// Función de notificación
function showNotification(message, type) {
    console.log(`📢 Notificación ${type}: ${message}`);
    
    if (window.authAPI && window.authAPI.showNotification) {
        window.authAPI.showNotification(message, type);
        return;
    }
    
    // Fallback si authAPI no está disponible
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
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}