/**
 * library.js - Manejo de la página de biblioteca
 */

let currentDocuments = [];
let currentFilter = 'todos';
let currentDocumentId = null;

// Inicializar página de biblioteca
document.addEventListener('DOMContentLoaded', async () => {
    console.log('📚 Cargando página de biblioteca...');
    
    // Verificar autenticación
    const isAuth = await authAPI.verifyAuthentication();
    console.log('🔐 Estado de autenticación:', isAuth);
    
    if (!isAuth) {
        console.log('❌ Usuario no autenticado, redirigiendo al login...');
        window.location.href = '/';
        return;
    }

    console.log('✅ Usuario autenticado, cargando biblioteca...');
    await loadDocuments();
    setupLibraryEventListeners();
    setupNavigationListeners();
    setupModals();
});

/**
 * Cargar documentos del usuario
 */
async function loadDocuments() {
    const loadingElement = document.getElementById('loading-documents');
    const noDocumentsElement = document.getElementById('no-documents');
    const libraryItems = document.querySelector('.library-items');
    
    if (loadingElement) loadingElement.style.display = 'block';
    if (noDocumentsElement) noDocumentsElement.style.display = 'none';

    try {
        const response = await authAPI.authenticatedFetch('/api/documents');
        
        if (response.ok) {
            const data = await response.json();
            currentDocuments = data.documents || [];
            
            console.log(`📄 Cargados ${currentDocuments.length} documentos`);
            renderDocuments();
            
        } else {
            throw new Error('Error al cargar documentos');
        }
    } catch (error) {
        console.error('Error cargando documentos:', error);
        showNotification('Error al cargar los documentos', 'error');
        
        if (libraryItems) {
            libraryItems.innerHTML = '<div class="error-message">Error al cargar documentos</div>';
        }
    } finally {
        if (loadingElement) loadingElement.style.display = 'none';
    }
}

/**
 * Renderizar documentos en la interfaz
 */
function renderDocuments() {
    const libraryItems = document.querySelector('.library-items');
    const noDocumentsElement = document.getElementById('no-documents');
    
    if (!libraryItems) return;

    // Filtrar documentos según el filtro actual
    let filteredDocuments = currentDocuments;
    if (currentFilter !== 'todos') {
        // Por ahora solo tenemos documentos, pero se puede expandir para transcripciones
        filteredDocuments = currentDocuments;
    }

    if (filteredDocuments.length === 0) {
        libraryItems.innerHTML = '';
        if (noDocumentsElement) noDocumentsElement.style.display = 'block';
        return;
    }

    if (noDocumentsElement) noDocumentsElement.style.display = 'none';

    // Generar HTML para cada documento
    const documentsHTML = filteredDocuments.map(doc => {
        const createdDate = new Date(doc.creado_en).toLocaleDateString('es-ES');
        const preview = doc.contenido ? doc.contenido.substring(0, 100) + '...' : 'Sin contenido';
        const hasAudio = doc.archivo_audio ? true : false;
        
        return `
            <div class="library-item" data-document-id="${doc.id}">
                <div class="item-icon visual-item">
                    <img src="/static/assets/images/${hasAudio ? 'audio_icon.png' : 'document_icon.png'}" alt="Icono de documento">
                </div>
                <div class="item-info">
                    <h3>${escapeHtml(doc.titulo)}</h3>
                    <p>${createdDate} · Documento${hasAudio ? ' con Audio' : ''}</p>
                    <small class="document-preview">${escapeHtml(preview)}</small>
                </div>
                <div class="item-actions">
                    <button class="btn-item-action view-document" data-document-id="${doc.id}">Ver</button>
                    <button class="btn-item-action edit-document" data-document-id="${doc.id}">Editar</button>
                </div>
            </div>
        `;
    }).join('');

    libraryItems.innerHTML = documentsHTML;

    // Configurar event listeners para los botones
    setupDocumentButtons();
}

/**
 * Configurar event listeners para los botones de documentos
 */
function setupDocumentButtons() {
    // Botones de ver documento
    document.querySelectorAll('.view-document').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const documentId = parseInt(e.target.dataset.documentId);
            viewDocument(documentId);
        });
    });

    // Botones de editar documento
    document.querySelectorAll('.edit-document').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const documentId = parseInt(e.target.dataset.documentId);
            editDocument(documentId);
        });
    });
}

/**
 * Ver documento en modal
 */
function viewDocument(documentId) {
    const document = currentDocuments.find(doc => doc.id === documentId);
    if (!document) return;

    const modal = document.getElementById('view-document-modal');
    const overlay = document.getElementById('document-modal-overlay');
    const titleElement = document.getElementById('view-document-title');
    const contentElement = document.getElementById('view-document-content');
    const audioControlsElement = document.getElementById('view-document-audio-controls');

    if (modal && overlay && titleElement && contentElement) {
        titleElement.textContent = document.titulo;
        contentElement.textContent = document.contenido || 'Sin contenido';
        
        // Mostrar controles de audio si el documento tiene audio
        if (document.archivo_audio && audioControlsElement) {
            audioControlsElement.style.display = 'block';
            setupAudioControls(document.archivo_audio);
        } else if (audioControlsElement) {
            audioControlsElement.style.display = 'none';
        }
        
        modal.style.display = 'block';
        overlay.style.display = 'block';
        
        currentDocumentId = documentId;
    }
}

/**
 * Configurar controles de audio para el documento
 */
function setupAudioControls(audioPath) {
    const audioPlayer = document.getElementById('document-audio-player');
    const playAudioBtn = document.getElementById('play-document-audio-btn');
    
    if (audioPlayer && audioPath) {
        // Configurar la fuente del audio
        audioPlayer.src = audioPath.replace(/^.*[\\\/]/, '/static/assets/audio/');
        
        if (playAudioBtn) {
            playAudioBtn.onclick = () => {
                if (audioPlayer.paused) {
                    audioPlayer.play();
                    playAudioBtn.textContent = '⏸️ Pausar Audio';
                } else {
                    audioPlayer.pause();
                    playAudioBtn.textContent = '▶️ Reproducir Audio';
                }
            };
            
            audioPlayer.onended = () => {
                playAudioBtn.textContent = '▶️ Reproducir Audio';
            };
            
            audioPlayer.onpause = () => {
                playAudioBtn.textContent = '▶️ Reproducir Audio';
            };
            
            audioPlayer.onplay = () => {
                playAudioBtn.textContent = '⏸️ Pausar Audio';
            };
        }
    }
}

/**
 * Editar documento en modal
 */
function editDocument(documentId) {
    const document = currentDocuments.find(doc => doc.id === documentId);
    if (!document) return;

    const modal = document.getElementById('edit-document-modal');
    const overlay = document.getElementById('document-modal-overlay');
    const titleInput = document.getElementById('edit-document-title');
    const contentTextarea = document.getElementById('edit-document-content');
    const charCounter = document.getElementById('edit-char-counter');

    if (modal && overlay && titleInput && contentTextarea) {
        titleInput.value = document.titulo;
        contentTextarea.value = document.contenido || '';
        
        // Actualizar contador de caracteres
        updateEditCharCounter();
        
        modal.style.display = 'block';
        overlay.style.display = 'block';
        
        currentDocumentId = documentId;
        
        // Enfocar el input del título
        setTimeout(() => titleInput.focus(), 100);
    }
}

/**
 * Actualizar contador de caracteres en edición
 */
function updateEditCharCounter() {
    const titleInput = document.getElementById('edit-document-title');
    const charCounter = document.getElementById('edit-char-counter');
    
    if (titleInput && charCounter) {
        const length = titleInput.value.length;
        charCounter.textContent = `${length}/50 caracteres`;
        charCounter.style.color = length > 45 ? '#ef4444' : '#6b7280';
    }
}

/**
 * Guardar cambios del documento
 */
async function saveDocumentChanges() {
    const titleInput = document.getElementById('edit-document-title');
    const contentTextarea = document.getElementById('edit-document-content');
    const saveBtn = document.getElementById('save-edit-btn');
    
    if (!titleInput || !contentTextarea || !saveBtn || !currentDocumentId) return;

    const title = titleInput.value.trim();
    const content = contentTextarea.value.trim();

    // Validaciones
    if (!title) {
        showNotification('Por favor ingresa un título', 'error');
        titleInput.focus();
        return;
    }

    if (title.length > 50) {
        showNotification('El título no puede exceder 50 caracteres', 'error');
        titleInput.focus();
        return;
    }

    // Mostrar estado de carga
    const originalText = saveBtn.textContent;
    saveBtn.disabled = true;
    saveBtn.textContent = 'Guardando...';

    try {
        const response = await authAPI.authenticatedFetch(`/api/documents/${currentDocumentId}`, {
            method: 'PUT',
            body: JSON.stringify({
                titulo: title,
                contenido: content
            })
        });

        const data = await response.json();

        if (response.ok && data.status === 'success') {
            showNotification('Documento actualizado exitosamente', 'success');
            
            // Cerrar modal
            closeEditModal();
            
            // Recargar documentos
            await loadDocuments();
            
        } else {
            throw new Error(data.error || 'Error al actualizar el documento');
        }

    } catch (error) {
        console.error('Error actualizando documento:', error);
        showNotification('Error al actualizar el documento: ' + error.message, 'error');
    } finally {
        // Restaurar botón
        saveBtn.disabled = false;
        saveBtn.textContent = originalText;
    }
}

/**
 * Eliminar documento
 */
async function deleteDocument() {
    if (!currentDocumentId) return;

    const document = currentDocuments.find(doc => doc.id === currentDocumentId);
    if (!document) return;

    const confirmDelete = confirm(`¿Estás seguro de que deseas eliminar el documento "${document.titulo}"?\n\nEsta acción no se puede deshacer.`);
    if (!confirmDelete) return;

    const deleteBtn = document.getElementById('delete-document-btn');
    if (deleteBtn) {
        const originalText = deleteBtn.textContent;
        deleteBtn.disabled = true;
        deleteBtn.textContent = 'Eliminando...';

        try {
            const response = await authAPI.authenticatedFetch(`/api/documents/${currentDocumentId}`, {
                method: 'DELETE'
            });

            const data = await response.json();

            if (response.ok && data.status === 'success') {
                showNotification('Documento eliminado exitosamente', 'success');
                
                // Cerrar modal
                closeEditModal();
                
                // Recargar documentos
                await loadDocuments();
                
            } else {
                throw new Error(data.error || 'Error al eliminar el documento');
            }

        } catch (error) {
            console.error('Error eliminando documento:', error);
            showNotification('Error al eliminar el documento: ' + error.message, 'error');
        } finally {
            // Restaurar botón
            deleteBtn.disabled = false;
            deleteBtn.textContent = originalText;
        }
    }
}

/**
 * Reproducir documento con TTS
 */
async function playDocument() {
    const document = currentDocuments.find(doc => doc.id === currentDocumentId);
    if (!document || !document.contenido) {
        showNotification('No hay contenido para reproducir', 'error');
        return;
    }

    // Si el documento tiene audio guardado, reproducirlo directamente
    if (document.archivo_audio) {
        const audioPlayer = document.getElementById('document-audio-player');
        if (audioPlayer) {
            audioPlayer.play();
            return;
        }
    }

    const playBtn = document.getElementById('play-document-btn');
    if (!playBtn) return;

    try {
        // Obtener configuración del usuario
        const userConfig = JSON.parse(localStorage.getItem('user_config') || '{}');
        const voiceType = userConfig.tipo_voz || 'mujer';
        const speed = userConfig.velocidad_lectura || 1.0;

        playBtn.disabled = true;
        playBtn.textContent = '🔄 Cargando...';

        // Intentar usar Edge TTS
        const response = await fetch('/api/synthesize-speech', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: document.contenido,
                voice_type: voiceType,
                speed: speed
            })
        });

        const data = await response.json();

        if (data.success) {
            // Reproducir audio
            const audio = new Audio(data.audio_url);
            
            playBtn.textContent = '⏸️ Pausar';
            
            audio.onplay = () => {
                playBtn.textContent = '⏸️ Pausar';
                startDocumentProgress(audio);
            };
            
            audio.onended = () => {
                playBtn.textContent = '▶️ Reproducir';
                playBtn.disabled = false;
                resetDocumentProgress();
                showNotification('Reproducción completada', 'success');
            };
            
            audio.onerror = () => {
                playBtn.textContent = '▶️ Reproducir';
                playBtn.disabled = false;
                showNotification('Error al reproducir audio', 'error');
            };
            
            // Manejar clic en botón durante reproducción
            playBtn.onclick = () => {
                if (audio.paused) {
                    audio.play();
                } else {
                    audio.pause();
                    playBtn.textContent = '▶️ Continuar';
                }
            };
            
            await audio.play();
            
        } else {
            throw new Error(data.error || 'Error en síntesis de voz');
        }

    } catch (error) {
        console.error('Error reproduciendo documento:', error);
        showNotification('Error al reproducir el documento', 'error');
        
        // Fallback al TTS del navegador
        try {
            const utterance = new SpeechSynthesisUtterance(document.contenido);
            utterance.lang = 'es-ES';
            speechSynthesis.speak(utterance);
            
            utterance.onend = () => {
                playBtn.textContent = '▶️ Reproducir';
                playBtn.disabled = false;
            };
            
        } catch (fallbackError) {
            console.error('Error en TTS fallback:', fallbackError);
        }
    } finally {
        if (playBtn.textContent === '🔄 Cargando...') {
            playBtn.textContent = '▶️ Reproducir';
            playBtn.disabled = false;
        }
    }
}

/**
 * Iniciar progreso de reproducción de documento
 */
function startDocumentProgress(audio) {
    const progressBar = document.getElementById('document-progress-bar');
    if (!progressBar) return;

    const updateProgress = () => {
        if (audio.duration > 0) {
            const progress = (audio.currentTime / audio.duration) * 100;
            progressBar.style.width = `${progress}%`;
        }
    };

    audio.addEventListener('timeupdate', updateProgress);
}

/**
 * Resetear progreso de reproducción
 */
function resetDocumentProgress() {
    const progressBar = document.getElementById('document-progress-bar');
    if (progressBar) {
        progressBar.style.width = '0%';
    }
}

/**
 * Cerrar modal de visualización
 */
function closeViewModal() {
    const modal = document.getElementById('view-document-modal');
    const overlay = document.getElementById('document-modal-overlay');
    
    if (modal && overlay) {
        modal.style.display = 'none';
        overlay.style.display = 'none';
        currentDocumentId = null;
        
        // Detener cualquier reproducción
        speechSynthesis.cancel();
        resetDocumentProgress();
        
        const playBtn = document.getElementById('play-document-btn');
        if (playBtn) {
            playBtn.textContent = '▶️ Reproducir';
            playBtn.disabled = false;
            playBtn.onclick = playDocument;
        }
    }
}

/**
 * Cerrar modal de edición
 */
function closeEditModal() {
    const modal = document.getElementById('edit-document-modal');
    const overlay = document.getElementById('document-modal-overlay');
    const titleInput = document.getElementById('edit-document-title');
    const contentTextarea = document.getElementById('edit-document-content');
    
    if (modal && overlay) {
        modal.style.display = 'none';
        overlay.style.display = 'none';
        currentDocumentId = null;
        
        if (titleInput) titleInput.value = '';
        if (contentTextarea) contentTextarea.value = '';
        updateEditCharCounter();
    }
}

/**
 * Configurar modales
 */
function setupModals() {
    // Modal de visualización
    const closeViewBtn = document.getElementById('close-view-modal');
    const playBtn = document.getElementById('play-document-btn');
    
    if (closeViewBtn) closeViewBtn.addEventListener('click', closeViewModal);
    if (playBtn) playBtn.addEventListener('click', playDocument);
    
    // Modal de edición
    const closeEditBtn = document.getElementById('close-edit-modal');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    const saveEditBtn = document.getElementById('save-edit-btn');
    const deleteBtn = document.getElementById('delete-document-btn');
    const titleInput = document.getElementById('edit-document-title');
    
    if (closeEditBtn) closeEditBtn.addEventListener('click', closeEditModal);
    if (cancelEditBtn) cancelEditBtn.addEventListener('click', closeEditModal);
    if (saveEditBtn) saveEditBtn.addEventListener('click', saveDocumentChanges);
    if (deleteBtn) deleteBtn.addEventListener('click', deleteDocument);
    
    if (titleInput) {
        titleInput.addEventListener('input', updateEditCharCounter);
    }
    
    // Cerrar modales con overlay
    const overlay = document.getElementById('document-modal-overlay');
    if (overlay) {
        overlay.addEventListener('click', () => {
            closeViewModal();
            closeEditModal();
        });
    }
    
    // Cerrar modales con Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeViewModal();
            closeEditModal();
        }
    });
}

/**
 * Configurar event listeners de la biblioteca
 */
function setupLibraryEventListeners() {
    // Filtros
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Remover clase active de todos los filtros
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            
            // Añadir clase active al filtro seleccionado
            e.target.classList.add('active');
            
            // Actualizar filtro actual
            const filterText = e.target.textContent.toLowerCase();
            currentFilter = filterText === 'todos' ? 'todos' : filterText;
            
            // Renderizar documentos filtrados
            renderDocuments();
        });
    });
    
    // Búsqueda
    const searchInput = document.querySelector('.search-input');
    const searchBtn = document.querySelector('.btn-search');
    
    if (searchInput && searchBtn) {
        const performSearch = () => {
            const searchTerm = searchInput.value.toLowerCase().trim();
            
            if (searchTerm) {
                const filteredDocuments = currentDocuments.filter(doc => 
                    doc.titulo.toLowerCase().includes(searchTerm) ||
                    (doc.contenido && doc.contenido.toLowerCase().includes(searchTerm))
                );
                
                // Renderizar resultados de búsqueda
                renderFilteredDocuments(filteredDocuments, `Resultados para: "${searchTerm}"`);
            } else {
                renderDocuments();
            }
        };
        
        searchBtn.addEventListener('click', performSearch);
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                performSearch();
            }
        });
    }
}

/**
 * Renderizar documentos filtrados
 */
function renderFilteredDocuments(documents, title) {
    const libraryItems = document.querySelector('.library-items');
    const noDocumentsElement = document.getElementById('no-documents');
    
    if (!libraryItems) return;

    if (documents.length === 0) {
        libraryItems.innerHTML = `<div class="no-documents-message"><p>No se encontraron documentos.</p></div>`;
        if (noDocumentsElement) noDocumentsElement.style.display = 'none';
        return;
    }

    if (noDocumentsElement) noDocumentsElement.style.display = 'none';

    // Generar HTML para documentos filtrados
    const documentsHTML = documents.map(doc => {
        const createdDate = new Date(doc.creado_en).toLocaleDateString('es-ES');
        const preview = doc.contenido ? doc.contenido.substring(0, 100) + '...' : 'Sin contenido';
        
        return `
            <div class="library-item" data-document-id="${doc.id}">
                <div class="item-icon visual-item">
                    <img src="/static/assets/images/document_icon.png" alt="Icono de documento">
                </div>
                <div class="item-info">
                    <h3>${escapeHtml(doc.titulo)}</h3>
                    <p>${createdDate} · Documento</p>
                    <small class="document-preview">${escapeHtml(preview)}</small>
                </div>
                <div class="item-actions">
                    <button class="btn-item-action view-document" data-document-id="${doc.id}">Ver</button>
                    <button class="btn-item-action edit-document" data-document-id="${doc.id}">Editar</button>
                </div>
            </div>
        `;
    }).join('');

    libraryItems.innerHTML = documentsHTML;
    setupDocumentButtons();
}

/**
 * Configurar navegación
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
            window.location.href = '/modo_auditivo';
        });
    }
    
    if (btnBiblioteca) {
        btnBiblioteca.addEventListener('click', () => {
            window.scrollTo(0, 0);
            setActiveNavButton(btnBiblioteca);
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
                await authAPI.logout();
                window.location.href = '/';
            } catch (error) {
                console.error('Error al cerrar sesión:', error);
                showNotification('Error al cerrar sesión', 'error');
            }
        });
    }
    
    // Marcar el botón de biblioteca como activo por defecto
    setActiveNavButton(btnBiblioteca);
}

/**
 * Establecer el botón de navegación activo
 */
function setActiveNavButton(activeButton) {
    const allNavButtons = document.querySelectorAll('.nav-button');
    allNavButtons.forEach(button => {
        button.classList.remove('active');
    });
    
    if (activeButton) {
        activeButton.classList.add('active');
    }
}

/**
 * Escapar HTML para prevenir XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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

console.log('📚 Módulo library.js cargado correctamente');