import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../parfolio-i18n-complete-v331.js',import.meta.url),'utf8');
let observer,frames=[],titleWrites=0,treeWalks=0;
const element=tag=>({nodeType:1,tagName:tag,closest:()=>null,getAttribute:()=>null});
const titleElement=element('TITLE'),body=element('BODY');let title='ParFolio — Your Game. Your Score. Your Story.';
const document={body,documentElement:{lang:'en'},createTreeWalker:()=>{treeWalks++;return{nextNode:()=>null}},addEventListener:()=>{}};
Object.defineProperty(document,'title',{get:()=>title,set:value=>{title=value;titleWrites++;observer([{type:'childList',target:titleElement,addedNodes:[{}]}])}});
const c={document,localStorage:{},PF_I18N_PHRASES:{'Your Game. Your Score. Your Story.':{es:'Tu juego. Tu puntuación. Tu historia.'}},NodeFilter:{SHOW_ELEMENT:1,SHOW_TEXT:4,FILTER_REJECT:2,FILTER_ACCEPT:1},requestAnimationFrame:f=>(frames.push(f),frames.length),setTimeout:()=>{},MutationObserver:class{constructor(f){observer=f}observe(){}},alert:()=>{},confirm:()=>{},prompt:()=>{},addEventListener:()=>{}};
c.window=c;vm.createContext(c);vm.runInContext(source,c);
function drain(){let count=0;while(frames.length&&count<20){frames.shift()();count++}assert.equal(frames.length,0,'translation must settle instead of scheduling itself forever');return count}
assert.equal(drain(),1);assert.equal(titleWrites,0,'unchanged English title must not be assigned');
document.documentElement.lang='es';observer([{type:'attributes',target:document.documentElement,attributeName:'lang'}]);drain();assert.equal(titleWrites,1);assert.match(title,/Tu juego/);
document.documentElement.lang='en';observer([{type:'attributes',target:document.documentElement,attributeName:'lang'}]);drain();assert.equal(titleWrites,2);assert.match(title,/Your Game/);
const mapNode={...element('DIV'),closest:selector=>selector.includes('#liveHoleMap')?{}:null};
const before=treeWalks;for(let i=0;i<100;i++)observer([{type:'childList',target:mapNode,addedNodes:[{}]}]);assert.equal(frames.length,0);assert.equal(treeWalks,before,'map tile churn must not launch translation work');
console.log('Translation recovery: idle settling, two language changes and 100 ignored map mutations passed.');
