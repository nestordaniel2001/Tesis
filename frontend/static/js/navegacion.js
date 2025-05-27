// Función para cargar contenido mediante AJAX
function loadContent(url) {
    // Si estás usando AJAX para cargar contenido dinámicamente
    fetch(url)
        .then(response => response.text())
        .then(html => {
            document.querySelector('.main-content').innerHTML = html;
        })
        .catch(error => {
            console.error('Error al cargar el contenido:', error);
        });
}

// Función para redireccionar a las diferentes páginas
function navigateTo(page) {
    window.location.href = page;
}

// Configurar los eventos de clic para los botones de navegación
document.addEventListener('DOMContentLoaded', function() {
    // Botones de la barra lateral
    const btnInicio = document.getElementById('btn-inicio');
    const btnModoVisual = document.getElementById('btn-modo-visual');
    const btnModoAuditivo = document.getElementById('btn-modo-auditivo');
    const btnBiblioteca = document.getElementById('btn-biblioteca');
    const btnConfiguracion = document.getElementById('btn-configuracion');
    
    // Agregar eventos de clic
    if (btnInicio) {
        btnInicio.addEventListener('click', function() {
            navigateTo('/inicio');
        });
    }
    
    if (btnModoVisual) {
        btnModoVisual.addEventListener('click', function() {
            navigateTo('/modo-visual');
        });
    }
    
    if (btnModoAuditivo) {
        btnModoAuditivo.addEventListener('click', function() {
            navigateTo('/modo-auditivo');
        });
    }
    
    if (btnBiblioteca) {
        btnBiblioteca.addEventListener('click', function() {
            navigateTo('/biblioteca');
        });
    }
    
    if (btnConfiguracion) {
        btnConfiguracion.addEventListener('click', function() {
            navigateTo('/configuracion');
        });
    }
    
    // Eventos para los botones de la página de inicio
    const visualAssistantCard = document.querySelector('.visual-assistant');
    const auditoryAssistantCard = document.querySelector('.auditory-assistant');
    
    if (visualAssistantCard) {
        visualAssistantCard.addEventListener('click', function() {
            navigateTo('/modo-visual');
        });
    }
    
    if (auditoryAssistantCard) {
        auditoryAssistantCard.addEventListener('click', function() {
            navigateTo('/modo-auditivo');
        });
    }
    
    // Eventos específicos para cada vista
    // Estos se agregarían dependiendo de las funcionalidades específicas de cada vista
    
    // Por ejemplo, para el Modo Visual:
    const playBtn = document.querySelector('.play-btn');
    if (playBtn) {
        playBtn.addEventListener('click', function() {
            // Código para reproducir o pausar la lectura
            this.classList.toggle('paused');
            // Aquí iría la lógica para controlar la reproducción
        });
    }
    
    // Para el Modo Auditivo:
    const recordBtn = document.querySelector('.record-btn');
    const pauseBtn = document.querySelector('.pause-btn');
    const stopBtn = document.querySelector('.stop-btn');
    
    if (recordBtn && pauseBtn && stopBtn) {
        recordBtn.addEventListener('click', function() {
            // Código para iniciar grabación
            recordBtn.classList.add('active');
            pauseBtn.classList.remove('active');
            stopBtn.classList.remove('active');
        });
        
        pauseBtn.addEventListener('click', function() {
            // Código para pausar grabación
            recordBtn.classList.remove('active');
            pauseBtn.classList.add('active');
            stopBtn.classList.remove('active');
        });
        
        stopBtn.addEventListener('click', function() {
            // Código para detener grabación
            recordBtn.classList.remove('active');
            pauseBtn.classList.remove('active');
            stopBtn.classList.add('active');
        });
    }
});