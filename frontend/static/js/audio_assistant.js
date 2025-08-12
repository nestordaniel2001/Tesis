
    // Grabación de audio
    let mediaRecorder;
    let audioChunks = [];
    let isRecording = false;
    let isPaused = false;
    let audioStream;

    const recordBtn = document.getElementById('recordBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const stopBtn = document.getElementById('stopBtn');
    const transcriptBox = document.getElementById('transcriptBox');
    const saveBtn = document.getElementById('saveBtn');
    const clearBtn = document.getElementById('btnlimpiar');
    // Acción del botón Limpiar
    clearBtn.addEventListener('click', () => {
    finalTranscript = ''; // resetea el texto final
    transcriptBox.value = ''; // limpia el textarea
   });


    // Transcripción por voz (Web Speech API)
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'es-ES';
    recognition.interimResults = true;
    recognition.continuous = true;

    let finalTranscript = '';

    recognition.onresult = (event) => {
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }
      transcriptBox.value = finalTranscript + interimTranscript;
    };

    recordBtn.addEventListener('click', async () => {
      if (!isRecording) {
        try {
          audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          mediaRecorder = new MediaRecorder(audioStream);
          audioChunks = [];

          mediaRecorder.ondataavailable = event => {
            audioChunks.push(event.data);
          };

          mediaRecorder.start();
          recognition.start();

          isRecording = true;
          recordBtn.classList.add('active');
          recordBtn.textContent = "Grabando...";
        } catch (err) {
          alert("Error al acceder al micrófono: " + err.message);
        }
      }
    });

    pauseBtn.addEventListener('click', () => {
      if (!mediaRecorder) return;

      if (!isPaused) {
        mediaRecorder.pause();
        recognition.stop();
        isPaused = true;
        pauseBtn.textContent = "Reanudar";
      } else {
        mediaRecorder.resume();
        recognition.start();
        isPaused = false;
        pauseBtn.textContent = "Pausar";
      }
    });
     
    stopBtn.addEventListener('click', () => {
  if (mediaRecorder && isRecording) {
    mediaRecorder.stop();
    recognition.stop();
    audioStream.getTracks().forEach(track => track.stop());

    isRecording = false;
    isPaused = false;

    recordBtn.classList.remove('active');
    recordBtn.textContent = "Grabar";
    pauseBtn.textContent = "Pausar";

    // Guardar el audio grabado y mostrarlo debajo de las barras
    mediaRecorder.onstop = () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      const audioUrl = URL.createObjectURL(audioBlob);

      const audio = document.createElement('audio');
      audio.src = audioUrl;
      audio.controls = true;
      audio.style.display = 'block';
      audio.style.width = '100%';
      audio.style.marginTop = '10px';

      // Seleccionamos el contenedor de las barras
      const visualizerContainer = document.querySelector('.save-audio');

      if (visualizerContainer) {
        visualizerContainer.appendChild(audio); // Aquí se coloca debajo de las barras
      } else {
        console.warn("No se encontró el contenedor .audio-visualization, se agrega al body");
        document.body.appendChild(audio);
      }
    };
  }
});
    saveBtn.addEventListener('click', () => {
    const titulo = prompt("Escribe el título del documento:");
    if (!titulo || titulo.trim() === "") {
        alert("No ingresaste un título.");
        return;
    }

    const text = transcriptBox.value;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${titulo}.txt`;
    a.click();
});