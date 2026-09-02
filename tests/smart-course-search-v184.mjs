import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root=path.resolve(import.meta.dirname,'..');
const completeGreens=Array.from({length:18},()=>({tee:{lat:40,lng:-74},center:{lat:40.01,lng:-74.01}}));
const partialGreens=[{tee:{lat:40,lng:-74},center:{lat:40.01,lng:-74.01}}];
const courses=[
  {id:'located',name:'Spring Hills',holes:18,greens:[],catalog_point:{lat:41,lng:-75}},
  {id:'ready',name:'Spring Meadows',holes:18,greens:completeGreens,catalog_point:{lat:42,lng:-76}},
  {id:'missing',name:'Spring Valley',holes:18,greens:[]},
  {id:'partial',name:'Spring Creek',holes:18,greens:partialGreens,catalog_point:{lat:43,lng:-77}}
];
const context={
  window:null,courses,courseLibraryQuery:'spring',coursePreviewMaps:[],adminRole:null,s:{v:'home'},
  console,document:{querySelector:()=>null,addEventListener:()=>{}},setTimeout:()=>0,
  mappedCount:course=>(course.greens||[]).filter(hole=>hole?.tee&&hole?.center).length,
  favoriteCourseIds:()=>new Set(),recentCourseIds:()=>[],courseDistanceMiles:()=>null,
  rankedSharedCourses:()=>[],courseLibraryCard:()=>'',filterSharedCourses:()=>{},refreshCourseLibrary:()=>{},
  courseMatchesFilters:()=>true,activeCourseFilterCount:()=>0,initCoursePreviews:()=>{},
  coursesView:()=>'',setCourseFilter:()=>{},clearCourseFilters:()=>{}
};
context.window=context;
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root,'smart-course-search-v176.js'),'utf8'),context);

assert.equal(context.smartCourseGpsState(courses[1]).key,'ready');
assert.equal(context.smartCourseGpsState(courses[3]).key,'partial');
assert.equal(context.smartCourseGpsState(courses[0]).key,'located');
assert.equal(context.smartCourseGpsState(courses[2]).key,'missing');
assert.equal(context.smartCourseGpsState({holes:18,greens:[],catalog_point:{lat:0,lng:0}}).key,'missing');
assert.equal(context.smartCourseGpsState({holes:18,greens:[],catalog_point:{lat:95,lng:-75}}).key,'missing');
assert.equal(context.rankedSharedCourses()[0].course.id,'ready','GPS-ready courses should lead equally relevant search matches');
context.courseLibraryQuery='spring valley';
assert.equal(context.rankedSharedCourses()[0].course.id,'missing','an exact requested course must remain findable even without GPS');

console.log('Smart course search checks passed: ready, partial, located and missing states rank and classify correctly.');
