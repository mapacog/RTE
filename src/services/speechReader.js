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
      speech.lang = language === "es" ? "es-US" : "en-US";
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
