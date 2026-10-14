import { selectSpeechVoice, speechLanguage } from "./speechVoices.js";
export function createSpeechReader(synthesis, createUtterance) {
  let current = null;
  const stop = () => {
    if (!current) return;
    const previous = current;
    current = null;
    previous.cancelVoiceWait?.();
    previous.speech.onend = null;
    previous.speech.onerror = null;
    synthesis.cancel();
    previous.onChange(false);
  };
  return {
    stop,
    speak(text, language, onChange, onError = () => {}) {
      stop();
      const speech = createUtterance(text);
      speech.lang = speechLanguage(language);
      const reading = { speech, onChange };
      current = reading;
      const finish = error => {
        if (current !== reading) return;
        current = null;
        reading.cancelVoiceWait?.();
        onChange(false);
        if(error)onError(error);
      };
      speech.onend = () => finish();
      speech.onerror = () => finish("playback-error");
      onChange(true);
      const start=()=>{
        if(current!==reading)return true;
        const voices=synthesis.getVoices?.() || [];
        if(synthesis.getVoices && !voices.length)return false;
        const voice=selectSpeechVoice(voices,language);
        if(voices.length && !voice){finish("voice-unavailable");return true;}
        if(voice){speech.voice=voice;speech.lang=voice.lang;}
        reading.cancelVoiceWait?.();
        try { synthesis.speak(speech); } catch { finish("playback-error"); }
        return true;
      };
      if(!start()){
        const ready=()=>start();
        const timer=setTimeout(()=>{if(!start())finish("voice-unavailable");},1500);
        synthesis.addEventListener?.("voiceschanged",ready);
        reading.cancelVoiceWait=()=>{clearTimeout(timer);synthesis.removeEventListener?.("voiceschanged",ready);};
      }
      return () => { if (current === reading) stop(); };
    },
  };
}
