import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const code = readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
function render(start,end) {
  const tabs=[],events=[],properties={};
  const strip={append:tab=>tabs.push(tab),style:{setProperty:(k,v)=>properties[k]=v}};
  const detail={setAttribute(){},innerHTML:''};
  const document={
    body:{dataset:{trip:'Test trip',start,end}},
    querySelector:selector=>selector==='.day-strip'?strip:selector==='#day-detail'?detail:tabs.find(t=>'#'+t.id===selector),
    querySelectorAll:selector=>selector==='[role=tab]'?tabs:[],
    createElement:()=>({setAttribute(k,v){this[k]=v;},focus(){this.focused=true;}}),
    dispatchEvent:event=>events.push(event)
  };
  vm.runInNewContext(code,{document,Date,CustomEvent:class {constructor(type,options){Object.assign(this,{type,...options});}},IntersectionObserver:class {observe(){}}});
  return {tabs,events,properties};
}
test('four-day trip crosses October into November and wraps keyboard navigation',()=>{
  const {tabs,events,properties}=render('2026-10-29','2026-11-01');
  assert.equal(tabs.length,4);
  assert.equal(properties['--trip-mobile-days'],4);
  assert.equal(events.at(-1).detail.date,'2026-10-29');
  tabs[0].onkeydown({key:'End',preventDefault(){}});
  assert.equal(events.at(-1).detail.date,'2026-11-01');
  assert.equal(tabs[3]['aria-selected'],'true');
  tabs[3].onkeydown({key:'ArrowRight',preventDefault(){}});
  assert.equal(events.at(-1).detail.date,'2026-10-29');
  tabs[0].onkeydown({key:'ArrowLeft',preventDefault(){}});
  assert.equal(events.at(-1).detail.date,'2026-11-01');
});
test('existing Japan and Yunnan itineraries retain their ten dates',()=>{
  for (const [start,end] of [['2027-03-05','2027-03-14'],['2027-05-14','2027-05-23']]) {
    const {tabs,events,properties}=render(start,end);
    assert.equal(tabs.length,10);assert.equal(properties['--trip-mobile-days'],5);
    tabs[9].onclick();assert.equal(events.at(-1).detail.date,end);
  }
});
