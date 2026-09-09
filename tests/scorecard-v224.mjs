import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../play-v108.css',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const sw=fs.readFileSync(new URL('../service-worker.js',import.meta.url),'utf8');

assert.match(app,/function scorecardYardages\(/,'scorecard must calculate trustworthy hole yardages');
assert.match(app,/official_tees/,'official scorecard yardages must have priority');
assert.match(app,/meterValue\*1\.0936133/,'meter source values must be converted to yards');
assert.match(app,/mappedHoleDistance\(course\.greens\[index\]\)/,'mapped routing must be the yardage fallback');
assert.match(app,/function scorecardNineMarkup\(/,'scorecard must render readable front and back nines');
assert.match(app,/Front Nine/,'scorecard needs an OUT section');
assert.match(app,/Back Nine/,'scorecard needs an IN section');
assert.match(app,/class="yardage-row"/,'each hole must display its yardage');
assert.match(app,/scorecardScoreMarkup/,'scores must be visually compared with par');
assert.match(app,/yardages:scorecardYardages\(\)/,'shared scorecard data must include yardages');
assert.match(app,/data\.yardages\?\.\[hole\]/,'shared scorecard image must print hole yardages');
assert.doesNotMatch(app,/\bHCP\b|\bNET\b|\bADJ\b/,'v224 must not introduce handicap calculations');
assert.match(css,/\.scorecard-table/,'new scorecard presentation must be styled');
assert.match(css,/\.score-mark\.under/,'under-par scores must be identifiable');
assert.match(css,/\.score-mark\.over/,'over-par scores must be identifiable');
assert.doesNotMatch(html,/\?v=223/,'the page must not retain stale v223 assets');
const cacheVersion=Number(sw.match(/parfolio-v(\d+)-/)?.[1]);
assert.ok(cacheVersion>=224,'scorecard release must remain in a non-regressed offline cache');

console.log('Scorecard v224 checks passed: yardages, OUT/IN, totals, score states and shared image.');
