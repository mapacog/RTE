const locales={en:"en-US",es:"es-US",fr:"fr-FR",ar:"ar-SA",de:"de-DE",zh:"zh-CN",ru:"ru-RU",ko:"ko-KR"};
export const speechLanguage=language=>locales[language] || language;
export function selectSpeechVoice(voices,language) {
  const target=speechLanguage(language).toLowerCase(),base=target.split("-")[0];
  const score=voice=>(voice.lang.toLowerCase()===target?300:0)+
    (/natural|neural|premium|enhanced|studio/i.test(`${voice.name || ""} ${voice.voiceURI || ""}`)?100:0)+
    (/google/i.test(voice.name || "")?20:0)+(voice.localService===false?10:0)+(voice.default?5:0);
  return voices.filter(voice=>voice.lang.toLowerCase().split("-")[0]===base)
    .sort((a,b)=>score(b)-score(a))[0] || null;
}
