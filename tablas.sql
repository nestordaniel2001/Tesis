CREATE DATABASE Auris;
USE Auris;

CREATE TABLE Usuarios (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nombre_usuario VARCHAR(50) NOT NULL UNIQUE,
    correo_electronico VARCHAR(50) NOT NULL UNIQUE,
    contraseña VARCHAR(255) NOT NULL,
    foto_perfil BLOB,  
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE Documentos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    usuario_id INT,
    titulo VARCHAR(50) NOT NULL,
    contenido TEXT,
    archivo_audio LONGBLOB,  -- Cambiado a LONGBLOB (hasta 4GB)
    nombre_archivo VARCHAR(255),  -- Nombre original del archivo
    tipo_mime VARCHAR(100) DEFAULT 'audio/mpeg',  -- Tipo MIME 
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES Usuarios(id) ON DELETE CASCADE
);

CREATE TABLE Audio_a_Texto (
    id INT PRIMARY KEY AUTO_INCREMENT,
    usuario_id INT,
    archivo_audio BLOB NOT NULL,  
    texto_transcrito TEXT,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES Usuarios(id) ON DELETE CASCADE
);

CREATE TABLE Configuraciones_Usuario (
    id INT PRIMARY KEY AUTO_INCREMENT,
    usuario_id INT,
    nombre_configuracion VARCHAR(50) NOT NULL,
    valor_configuracion TEXT,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES Usuarios(id) ON DELETE CASCADE
);

CREATE TABLE Historial_Transcripciones (
    id INT PRIMARY KEY AUTO_INCREMENT,
    usuario_id INT,
    documento_id INT,
    texto_transcrito TEXT,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES Usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (documento_id) REFERENCES Documentos(id) ON DELETE CASCADE
);
