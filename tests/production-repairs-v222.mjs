import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read=f=>fs.readFileSync(new URL('../'+f,import.meta.url),'utf8');
const c={window:null,console,structuredClone,crypto:{randomUUID:()=> '12345678-1234-4123-8123-123456789012'},mapCourse:()=>c.draft,editCourse:()=>{},mapCatalogCourse:()=>{},draft:null,s:{v:'home'},map:null,alert:()=>{},render:()=>{},adminRole:'course_admin',courses:[]};
c.window=c;vm.createContext(c);vm.runInContext(read('course-edit-guard-v214.js'),c);
for(const marker of ['tee','aim1','aim2','front','center','back']){
 c.draft={id:'12345678-1234-4123-8123-123456789012',holes:18,greens:[],mapHole:7,target:marker};
 c.mapCourse();assert.equal(c.draft.mapHole,7);assert.equal(c.draft.target,marker);assert.equal(c.draft.greens.length,18);
}
const app=read('app.js');const body=app.slice(app.indexOf('async function loadCourses(){'),app.indexOf('async function loadClubDistances(){'));
const deleted='12345678-1234-4123-8123-123456789013',saved='12345678-1234-4123-8123-123456789014';
const context={currentUser:{id:'test'},courses:[{id:'parfolio-tx-reference'},{id:'opengolf-ny-reference'},{id:deleted}],cloudError:'',localStorage:{},mergeListedCourseCatalog:x=>x,db:{from:()=>({select:()=>({order:async()=>({data:[{id:saved,greens:[{tee:{lat:1,lng:2}}]}],error:null})})})}};
vm.createContext(context);vm.runInContext(body,context);await context.loadCourses();
assert.equal(context.courses.length,3);assert.ok(context.courses.some(x=>x.id==='parfolio-tx-reference'));assert.ok(!context.courses.some(x=>x.id===deleted));assert.ok(context.courses.some(x=>x.id===saved));
assert.match(read('service-worker.js'),/key\.startsWith\('parfolio-'\)/);
assert.doesNotMatch(read('offline-courses-v193.js'),/script\.src='ui-consistency/);
assert.doesNotMatch(read('ui-consistency-v194.js'),/script\.src='indonesia-catalog/);
console.log('Editor targets, catalog refresh, deleted local rows, cache isolation and duplicate-loader regressions passed.');
