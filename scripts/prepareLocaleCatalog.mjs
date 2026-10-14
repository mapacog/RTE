import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { resolve, relative } from "node:path";
import { parse } from "@babel/parser";

const root=resolve(import.meta.dirname,"..");
const entries=new Set();
const add=value=>{if(typeof value==="string" && /[A-Za-z]/.test(value) && !/^https?:|^#[\w-]+$|^[a-z]{2}-[A-Z]{2}$/.test(value))entries.add(value.trim());};
const template=node=>node.quasis.map((part,index)=>part.value.cooked+(index<node.expressions.length?`{${index}}`:"")).join("");
const english=node=>{if(node?.type==="StringLiteral")add(node.value);else if(node?.type==="TemplateLiteral")add(template(node));};
const spanish=node=>node?.type==="Identifier" && node.name==="es" ||
  node?.type==="BinaryExpression" && ["===","=="].includes(node.operator) && node.left?.name==="language" && node.right?.value==="es";
function visit(node){
  if(!node || typeof node!=="object")return;
  if(node.type==="VariableDeclarator" && node.id.name==="translations")node.init.properties.forEach(item=>add(item.key.value));
  if(node.type==="CallExpression" && ["t","text"].includes(node.callee.name))english(node.arguments[0]);
  if(node.type==="ConditionalExpression" && spanish(node.test))english(node.alternate);
  if(node.type==="ObjectProperty" && ["label","title","description"].includes(node.key.name || node.key.value))english(node.value);
  if(node.type==="JSXText")add(node.value.trim());
  for(const [key,value] of Object.entries(node))if(!["loc","start","end"].includes(key)){
    if(Array.isArray(value))value.forEach(visit);else if(value && typeof value==="object")visit(value);
  }
}
function files(directory){return readdirSync(directory,{withFileTypes:true}).flatMap(item=>item.isDirectory()?files(resolve(directory,item.name)):[resolve(directory,item.name)]);}
for(const file of files(resolve(root,"src"))){
  if(/locales|\.test\./.test(file))continue;
  if(/\.(jsx|js)$/.test(file))visit(parse(readFileSync(file,"utf8"),{sourceType:"module",plugins:["jsx"]}));
  else if(file.endsWith(".json")){
    const walk=value=>{if(value && typeof value==="object"){
      if(typeof value.en==="string")add(value.en);
      else for(const [key,child] of Object.entries(value)){if(["title","label"].includes(key))add(child);walk(child);}
    }};
    walk(JSON.parse(readFileSync(file,"utf8")));
  }
}
for(const value of ["Interstate","Other freeway / expressway","Other principal arterial","Principal arterial","Minor arterial","Major collector","Minor collector","Local road","Local street","Urban","Rural","Estimated","Observed","English","French","Arabic","German","Chinese","Russian","Korean","Regional","Traffic","Explorer","Open navigation menu","Close navigation menu","No voice is available for this language on this device.","Audio playback is unavailable.","StreetLight","MATS","OSM"])add(value);
const target=resolve(root,"src/data/locales/en.json");
const previous=existsSync(target)?JSON.parse(readFileSync(target,"utf8")):{};
const result=Object.fromEntries([...new Set([...Object.keys(previous),...entries])].map(value=>[value,value]));
writeFileSync(target,JSON.stringify(result,null,2)+"\n");
console.log(`${relative(root,target)}: ${Object.keys(result).length} messages`);
