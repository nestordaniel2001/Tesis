import re
import nltk
from nltk.corpus import stopwords
from nltk.tokenize import sent_tokenize, word_tokenize
from nltk.stem import SnowballStemmer
from transformers import pipeline

# Descargar recursos de nltk necesarios (si no se han descargado ya)
try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    nltk.download('punkt')

try:
    nltk.data.find('corpora/stopwords')
except LookupError:
    nltk.download('stopwords')

class TextProcessor:
    """Clase para procesar texto para facilitar la accesibilidad"""
    
    def __init__(self, language='spanish'):
        """
        Inicializa el procesador de texto
        
        Args:
            language (str): Idioma para el procesamiento de texto
        """
        self.language = language
        self.stemmer = SnowballStemmer(language)
        
        # Inicializar el modelo de resumen y simplificación
        # Se carga la primera vez que se utiliza para ahorrar memoria
        self._summarizer = None
        self._simplifier = None
        
    def process(self, text, operation='simplify'):
        """
        Procesa el texto según la operación solicitada
        
        Args:
            text (str): Texto a procesar
            operation (str): Operación a realizar (simplify, summarize, highlight)
            
        Returns:
            dict: Resultado del procesamiento
            
        Raises:
            ValueError: Si la operación no es válida
        """
        if operation == 'simplify':
            return self.simplify_text(text)
        elif operation == 'summarize':
            return self.summarize_text(text)
        elif operation == 'highlight':
            return self.highlight_keywords(text)
        else:
            raise ValueError(f"Operación no válida: {operation}")
    
    def simplify_text(self, text):
        """
        Simplifica un texto para hacerlo más accesible
        
        Args:
            text (str): Texto a simplificar
            
        Returns:
            str: Texto simplificado
        """
        # Intentar usar modelo de transformers si está disponible
        try:
            if self._simplifier is None:
                self._simplifier = pipeline("text2text-generation", model="facebook/bart-large-cnn")
            
            # Dividir texto largo en partes manejables (el modelo tiene límite de tokens)
            max_length = 500
            segments = [text[i:i+max_length] for i in range(0, len(text), max_length)]
            
            simplified_segments = []
            for segment in segments:
                result = self._simplifier(segment, max_length=150, min_length=30, do_sample=False)
                simplified_segments.append(result[0]['generated_text'])
            
            return " ".join(simplified_segments)
            
        except Exception:
            # Método alternativo más simple si falla el modelo
            sentences = sent_tokenize(text, language=self.language)
            simplified_sentences = []
            
            for sentence in sentences:
                # Mantener solo oraciones más cortas y simples
                words = word_tokenize(sentence, language=self.language)
                if len(words) < 15:
                    simplified_sentences.append(sentence)
            
            # Si no quedaron oraciones, usar las más cortas del original
            if not simplified_sentences:
                sentences.sort(key=len)
                simplified_sentences = sentences[:max(1, len(sentences)//3)]
                
            return " ".join(simplified_sentences)
    
    def summarize_text(self, text, ratio=0.3):
        """
        Resume un texto conservando la información esencial
        
        Args:
            text (str): Texto a resumir
            ratio (float): Proporción del texto original a mantener
            
        Returns:
            str: Texto resumido
        """
        # Intentar usar modelo de transformers si está disponible
        try:
            if self._summarizer is None:
                self._summarizer = pipeline("summarization", model="facebook/bart-large-cnn")
            
            # Dividir texto largo en partes manejables
            max_length = 1024
            segments = [text[i:i+max_length] for i in range(0, len(text), max_length)]
            
            summary_segments = []
            for segment in segments:
                result = self._summarizer(segment, max_length=150, min_length=30, do_sample=False)
                summary_segments.append(result[0]['summary_text'])
            
            return " ".join(summary_segments)
            
        except Exception:
            # Método alternativo basado en frecuencia de palabras si falla el modelo
            sentences = sent_tokenize(text, language=self.language)
            
            # Filtrar stopwords y contar frecuencia de palabras
            stop_words = set(stopwords.words(self.language))
            word_frequencies = {}
            
            for sentence in sentences:
                for word in word_tokenize(sentence, language=self.language):
                    word = word.lower()
                    if word not in stop_words:
                        if word not in word_frequencies:
                            word_frequencies[word] = 1
                        else:
                            word_frequencies[word] += 1
            
            # Calcular puntuación de cada oración
            sentence_scores = {}
            for i, sentence in enumerate(sentences):
                for word in word_tokenize(sentence, language=self.language):
                    word = word.lower()
                    if word in word_frequencies:
                        if i not in sentence_scores:
                            sentence_scores[i] = word_frequencies[word]
                        else:
                            sentence_scores[i] += word_frequencies[word]
            
            # Seleccionar oraciones con mayor puntuación
            num_sentences = max(1, int(len(sentences) * ratio))
            best_sentences = sorted(sentence_scores.items(), key=lambda x: x[1], reverse=True)[:num_sentences]
            best_sentences = [sentences[i] for i, _ in sorted(best_sentences, key=lambda x: x[0])]
                
            return " ".join(best_sentences)
    
    def highlight_keywords(self, text, num_keywords=5):
        """
        Identifica y destaca palabras clave en un texto
        
        Args:
            text (str): Texto a analizar
            num_keywords (int): Número de palabras clave a destacar
            
        Returns:
            dict: Texto original con palabras clave y lista de palabras clave
        """
        sentences = sent_tokenize(text, language=self.language)
        stop_words = set(stopwords.words(self.language))
        
        # Contar frecuencia de palabras excluyendo stopwords
        word_frequencies = {}
        for sentence in sentences:
            for word in word_tokenize(sentence, language=self.language):
                word = word.lower()
                # Excluir stopwords y palabras cortas
                if word not in stop_words and len(word) > 3 and word.isalnum():
                    if word not in word_frequencies:
                        word_frequencies[word] = 1
                    else:
                        word_frequencies[word] += 1
        
        # Obtener palabras clave según frecuencia
        keywords = sorted(word_frequencies.items(), key=lambda x: x[1], reverse=True)[:num_keywords]
        keywords = [word for word, _ in keywords]
        
        # Crear versión resaltada del texto
        highlighted_text = text
        for keyword in keywords:
            # Crear patrón para encontrar la palabra completa
            pattern = r'\b' + re.escape(keyword) + r'\b'
            # Reemplazar con versión resaltada (aquí usamos mayúsculas como ejemplo)
            highlighted_text = re.sub(pattern, '**' + keyword.upper() + '**', highlighted_text, flags=re.IGNORECASE)
        
        return {
            'highlighted_text': highlighted_text,
            'keywords': keywords
        }
    
    def set_language(self, language):
        """
        Cambia el idioma del procesador
        
        Args:
            language (str): Idioma para el procesamiento
        """
        self.language = language
        self.stemmer = SnowballStemmer(language)