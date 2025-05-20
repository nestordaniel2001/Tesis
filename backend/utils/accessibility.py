"""
Funciones de utilidad para mejorar la accesibilidad de la aplicación
"""
import json
import re

def create_accessible_response(content, format_type, user_preferences):
    """
    Crea una respuesta en un formato accesible según las preferencias del usuario
    
    Args:
        content (str): Contenido a formatear
        format_type (str): Tipo de formato (text, html, json)
        user_preferences (dict): Preferencias del usuario
    
    Returns:
        dict: Respuesta formateada según necesidades de accesibilidad
    """
    # Obtener preferencias relevantes
    font_size = user_preferences.get('font_size', 'medium')
    high_contrast = user_preferences.get('high_contrast', False)
    simplified_text = user_preferences.get('simplified_text', False)
    
    response = {
        'content': content,
        'format': format_type,
        'accessibility': {}
    }
    
    # Aplicar transformaciones según el formato
    if format_type == 'html':
        response['content'] = _make_html_accessible(content, font_size, high_contrast)
        response['accessibility']['has_aria'] = True
    elif format_type == 'text' and simplified_text:
        response['content'] = _simplify_content(content)
    
    # Agregar metadatos de accesibilidad
    response['accessibility'].update({
        'font_size': font_size,
        'high_contrast': high_contrast,
        'simplified': simplified_text
    })
    
    return response

def _make_html_accessible(html_content, font_size, high_contrast):
    """
    Mejora la accesibilidad de contenido HTML
    
    Args:
        html_content (str): Contenido HTML
        font_size (str): Tamaño de fuente preferido
        high_contrast (bool): Si se debe usar alto contraste
    
    Returns:
        str: HTML con mejoras de accesibilidad
    """
    # Aplicar clases CSS según preferencias
    if font_size != 'medium':
        html_content = html_content.replace('<body', f'<body class="font-size-{font_size}"')
    
    if high_contrast:
        html_content = html_content.replace('<body', '<body class="high-contrast"')
    
    # Asegurar que las imágenes tengan texto alternativo
    html_content = re.sub(r'<img([^>]*?)>',
                          lambda m: m.group(0) if 'alt=' in m.group(0) 
                                               else m.group(0).replace('>', ' alt="Imagen" >'),
                          html_content)
    
    # Asegurar que los formularios tengan etiquetas
    html_content = re.sub(r'<input([^>]*?)>',
                          lambda m: f'<label>Campo de entrada {m.group(0)}</label>' 
                                  if 'type="submit"' not in m.group(0) and 'aria-label' not in m.group(0)
                                  else m.group(0),
                          html_content)
    
    return html_content

def _simplify_content(content):
    """
    Simplifica el contenido textual para mejorar la accesibilidad
    
    Args:
        content (str): Contenido a simplificar
    
    Returns:
        str: Contenido simplificado
    """
    # Esta es una simplificación básica; idealmente se integraría con un modelo
    # de procesamiento de lenguaje natural para una mejor simplificación
    
    # Dividir en oraciones
    sentences = re.split(r'(?<=[.!?])\s+', content)
    
    # Conservar oraciones más cortas
    simplified = []
    for sentence in sentences:
        words = sentence.split()
        if len(words) < 15:  # Oraciones simples
            simplified.append(sentence)
        else:
            # Intentar simplificar oraciones largas
            simplified.append(' '.join(words[:10]) + '...')
    
    return ' '.join(simplified)

def create_image_description(image_path, detail_level='medium'):
    """
    Crea una descripción textual de una imagen para usuarios con discapacidad visual
    
    Args:
        image_path (str): Ruta a la imagen
        detail_level (str): Nivel de detalle de la descripción (basic, medium, detailed)
    
    Returns:
        str: Descripción de la imagen
        
    Note:
        Esta función es un placeholder. En una implementación real,
        se integraría con un modelo de visión por computadora.
    """
    # En una implementación real, aquí se conectaría con un servicio
    # de descripción de imágenes basado en IA
    return f"Descripción de imagen (nivel de detalle: {detail_level})"

def enhance_audio_transcript(transcript, annotations=True):
    """
    Mejora una transcripción de audio para usuarios con discapacidad auditiva
    
    Args:
        transcript (str): Transcripción original
        annotations (bool): Si se deben incluir anotaciones de contexto
    
    Returns:
        dict: Transcripción mejorada con metadatos
    """
    enhanced = {
        'text': transcript,
        'metadata': {}
    }
    
    if annotations:
        # Detectar y anotar sonidos relevantes
        enhanced['metadata']['sounds'] = []
        
        # Detectar emociones o tono (placeholder)
        enhanced['metadata']['tone'] = 'neutral'
        
        # Identificar diferentes hablantes (placeholder)
        enhanced['metadata']['speakers'] = 1
    
    return enhanced