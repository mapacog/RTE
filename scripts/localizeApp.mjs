import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { resolve, dirname, relative } from "node:path";
import { parse } from "@babel/parser";

const root=resolve(import.meta.dirname,"../src");
const spanish=node=>node?.type==="Identifier" && node.name==="es" ||
  node?.type==="BinaryExpression" && ["===","=="].includes(node.operator) && node.left?.name==="language" && node.right?.value==="es";
const files=directory=>readdirSync(directory,{withFileTypes:true}).flatMap(item=>item.isDirectory()?files(resolve(directory,item.name)):[resolve(directory,item.name)]);
for(const file of files(root)){
  if(!/\.(jsx|js)$/.test(file) || /\.test\.|locales|localization\.js/.test(file))continue;
  const source=readFileSync(file,"utf8"),edits=[];
  const walk=node=>{
    if(!node || typeof node!=="object")return;
    if(node.type==="ConditionalExpression" && spanish(node.test) && ["StringLiteral","TemplateLiteral"].includes(node.alternate.type)){
      const alt=node.alternate;
      if(alt.type!=="StringLiteral" || !/^[a-z]{2}-[A-Z]{2}$|^https?:|^#$/.test(alt.value))
        edits.push({start:alt.start,end:alt.end,value:`translateText(${source.slice(alt.start,alt.end)},language)`});
    }
    for(const [key,value] of Object.entries(node))if(!["start","end","loc"].includes(key)){
      if(Array.isArray(value))value.forEach(walk);else if(value && typeof value==="object")walk(value);
    }
  };
  walk(parse(source,{sourceType:"module",plugins:["jsx"]}));
  if(!edits.length)continue;
  let updated=source;
  for(const edit of edits.sort((a,b)=>b.start-a.start))updated=updated.slice(0,edit.start)+edit.value+updated.slice(edit.end);
  const module=relative(dirname(file),resolve(root,"utils/localization.js")).replaceAll("\\","/");
  if(!source.includes('import { translateText'))updated=`import { translateText } from "${module.startsWith(".")?module:`./${module}`}";\n`+updated;
  writeFileSync(file,updated);
  console.log(relative(root,file));
}
