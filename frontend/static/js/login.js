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

// Manejo del formulario
document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const loginBtn = document.getElementById('loginBtn');
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    // Agregar efecto de carga
    loginBtn.classList.add('loading');
    loginBtn.textContent = '';

    // Simular proceso de login
    setTimeout(() => {
        // Aquí puedes agregar tu lógica de autenticación
        console.log('Login attempt:', { email, password });
        
        // Remover efecto de carga
        loginBtn.classList.remove('loading');
        loginBtn.textContent = 'Iniciar Sesión';
        
        // Redirigir o mostrar mensaje de éxito
        alert('¡Login exitoso! Redirigiendo...');
        // window.location.href = '/dashboard'; // Descomenta para redirección real
    }, 2000);
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
    typeWriter(subtitle, 'Tu asistente académico personalizado', 50);
}, 1000);