export function createSpeechReader(synthesis, createUtterance) {
  let current = null;
  const stop = () => {
    if (!current) return;
    const previous = current;
    current = null;
    previous.speech.onend = null;
    previous.speech.onerror = null;
    synthesis.cancel();
    previous.onChange(false);
  };
  return {
    stop,
    speak(text, language, onChange) {
      stop();
      const speech = createUtterance(text);
      speech.lang = language === "es" ? "es-US" : language === "en" ? "en-US" : language;
      const voices = synthesis.getVoices?.() || [];
      const target = speech.lang.toLowerCase();
      const voice = voices.find(item => item.lang.toLowerCase() === target) ||
        voices.find(item => item.lang.toLowerCase().split("-")[0] === target.split("-")[0]);
      if (voice) speech.voice = voice;
      const reading = { speech, onChange };
      current = reading;
      const finish = () => {
        if (current !== reading) return;
        current = null;
        onChange(false);
      };
      speech.onend = finish;
      speech.onerror = finish;
      onChange(true);
      try { synthesis.speak(speech); } catch { finish(); }
      return () => { if (current === reading) stop(); };
    },
  };
}
