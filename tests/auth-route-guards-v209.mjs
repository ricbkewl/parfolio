import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root=path.resolve(import.meta.dirname,'..');
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');

const accessBlock=app.match(/const VIEW_ACCESS=Object\.freeze\(\{([\s\S]*?)\}\);/)?.[1]||'';
for(const view of ['setup','pars','round','recap','accountView','historyView','historyDetailView','clubsView','chatView','profileView','roundManageView']){
  assert.match(accessBlock,new RegExp(`\\b${view}:'authenticated'`),`${view} must require an authenticated session`);
}
assert.match(accessBlock,/mapCourse:'course_admin'/,'course mapping must require a course administrator');
assert.match(accessBlock,/usersView:'super_admin'/,'the private player directory must require a super administrator');
assert.match(app,/if\(cloudLoading\)return'authLoadingView'/,'private views must not flash before session restoration');
assert.match(app,/if\(!currentUser\)\{s\.v='home';return'home'\}/,'signed-out users must be redirected home');
assert.match(app,/event==='SIGNED_OUT'[\s\S]*clearAuthenticatedClientState\(\)/,'expired or externally revoked sessions must clear private client state');
assert.match(app,/db\.auth\.signOut\(\{scope:'local'\}\)/,'sign out must end the current device session');
assert.match(app,/auth:\{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true/,'Supabase Auth session persistence and redirect handling must remain enabled');

const accessDeclaration=app.match(/const VIEW_ACCESS=Object\.freeze\(\{[\s\S]*?\}\);/)?.[0];
const guardStart=app.indexOf('function authorizedView('),guardEnd=app.indexOf('function render()',guardStart);
assert.ok(accessDeclaration&&guardStart>0&&guardEnd>guardStart,'route guard must be executable in isolation');
const context={cloudLoading:false,currentUser:null,adminRole:null,draft:{unsaved:true},s:{v:'round'}};
vm.createContext(context);
vm.runInContext(`${accessDeclaration}\n${app.slice(guardStart,guardEnd)}\nglobalThis.guard=authorizedView;`,context);

context.cloudLoading=true;
assert.equal(context.guard('round'),'authLoadingView','session restoration must block private rendering');
assert.equal(context.s.v,'round','the requested private view must survive session restoration');
context.cloudLoading=false;
assert.equal(context.guard('round'),'home','signed-out golfers must be sent home');
context.currentUser={id:'golfer'};context.s={v:'round'};
assert.equal(context.guard('round'),'round','authenticated golfers may open round views');
assert.equal(context.guard('signupView'),'signupView','public views remain public');
assert.equal(context.guard('mapCourse'),'coursesView','regular golfers may not open course mapping');
assert.equal(context.draft,null,'an unauthorized mapping draft must be discarded');
context.adminRole='course_admin';
assert.equal(context.guard('mapCourse'),'mapCourse','course administrators may open course mapping');
assert.equal(context.guard('usersView'),'accountView','course administrators may not open the player directory');
context.adminRole='super_admin';
assert.equal(context.guard('usersView'),'usersView','super administrators may open the player directory');

console.log('ParFolio v209 auth and protected-view checks passed.');
