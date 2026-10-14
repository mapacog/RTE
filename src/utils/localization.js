import fr from "../data/locales/fr.json" with { type: "json" };
import ar from "../data/locales/ar.json" with { type: "json" };
import de from "../data/locales/de.json" with { type: "json" };
import zh from "../data/locales/zh.json" with { type: "json" };
import ru from "../data/locales/ru.json" with { type: "json" };
import ko from "../data/locales/ko.json" with { type: "json" };
import supplemental from "../data/locales/supplemental.js";
import review from "../data/locales/review.js";

export const languages = [
  {code:"en",label:"English",locale:"en-US"}, {code:"es",label:"Español",locale:"es-US"},
  {code:"fr",label:"Français",locale:"fr-FR"}, {code:"ar",label:"العربية",locale:"ar-SA"},
  {code:"de",label:"Deutsch",locale:"de-DE"}, {code:"zh",label:"中文",locale:"zh-CN"},
  {code:"ru",label:"Русский",locale:"ru-RU"}, {code:"ko",label:"한국어",locale:"ko-KR"},
];
export const catalogs=Object.fromEntries(Object.entries({fr,ar,de,zh,ru,ko}).map(([code,messages])=>[code,{...messages,...supplemental[code],...review[code]}]));
export const languageLocale=code=>languages.find(item=>item.code===code)?.locale || code;
export const validLanguage=code=>languages.some(item=>item.code===code)?code:"en";
const escape=value=>value.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
const patterns=Object.fromEntries(Object.entries(catalogs).map(([language,catalog])=>[language,
  Object.entries(catalog).filter(([key])=>/\{\d+\}/.test(key)).map(([key,value])=>{
    const tokens=[];
    const expression=key.split(/(\{\d+\})/).map(part=>{
      if(/^\{\d+\}$/.test(part)){tokens.push(part);return "(.+?)";}
      return escape(part);
    }).join("");
    return {pattern:new RegExp(`^${expression}$`),value,tokens};
  })]));

export function translateText(value,language="en") {
  if(typeof value!=="string" || !(catalogs[language] || review[language]))return value;
  const trimmed=value.trim(), catalog=catalogs[language] || review[language];
  let translated=catalog[trimmed];
  if(translated===undefined){
    for(const entry of patterns[language] || []){
      const match=entry.pattern.exec(trimmed);
      if(!match)continue;
      translated=entry.value.replace(/\{\d+\}/g,token=>match[entry.tokens.indexOf(token)+1] || token);
      break;
    }
  }
  return translated===undefined?value:value.slice(0,value.indexOf(trimmed))+translated+value.slice(value.indexOf(trimmed)+trimmed.length);
}

export function expandLanguages(value) {
  if(Array.isArray(value))return value.map(expandLanguages);
  if(!value || typeof value!=="object")return value;
  const result=Object.fromEntries(Object.entries(value).map(([key,child])=>[key,expandLanguages(child)]));
  if(typeof value.en==="string")for(const language of Object.keys(catalogs))result[language]=translateText(value.en,language);
  return result;
}
