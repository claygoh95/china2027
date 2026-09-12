import test from 'node:test';
import assert from 'node:assert/strict';
import {activityPayload,saveActivity,deleteActivity} from '../dist/travel-data.mjs';
const trip={id:'japan',start_date:'2027-03-05',end_date:'2027-03-14'};
test('validates trip dates, local times and required title',()=>{
  assert.deepEqual(activityPayload({title:' Snowboarding ',activity_date:'2027-03-05',activity_time:'09:30'},trip),{trip_id:'japan',title:'Snowboarding',activity_date:'2027-03-05',activity_time:'09:30',location:'',notes:''});
  for(const invalid of [{title:' '},{activity_date:'2027-03-15'},{activity_time:'25:00'},{title:'x'.repeat(201)},{notes:'x'.repeat(4001)}]) assert.throws(()=>activityPayload({title:'Trip',activity_date:'2027-03-05',...invalid},trip));
});
function fake(result){
  const calls=[];
  const query={};
  for(const method of ['from','insert','update','delete','eq']) query[method]=(...args)=>{calls.push([method,...args]);return query;};
  query.select=async()=>result;
  return {query,calls};
}
test('update filters by identity, trip, and last observed version',async()=>{
  const {query,calls}=fake({data:[{id:'a',version:3}],error:null});
  const saved=await saveActivity(query,{trip_id:'japan',title:'Changed'},{id:'a',version:2});
  assert.equal(saved.version,3);
  assert.deepEqual(calls.slice(-3),[['eq','id','a'],['eq','trip_id','japan'],['eq','version',2]]);
});
test('stale edits and deletions never report success',async()=>{
  const {query}=fake({data:[],error:null});
  await assert.rejects(saveActivity(query,{trip_id:'japan'},{id:'a',version:1}),/another tab/);
  await assert.rejects(deleteActivity(query,{id:'a',trip_id:'japan',version:1}),/another tab/);
});
test('new activity uses stable draft ID so retry cannot create duplicates',async()=>{
  const {query,calls}=fake({data:[{id:'draft-id'}],error:null});
  await saveActivity(query,{trip_id:'japan',title:'Idea'},{id:'draft-id'});
  assert.deepEqual(calls[1],['insert',{trip_id:'japan',title:'Idea',id:'draft-id'}]);
  const duplicate=fake({data:null,error:{code:'23505'}});
  await assert.rejects(saveActivity(duplicate.query,{trip_id:'japan'},{id:'draft-id'}),/already have saved/);
});
test('network and permission errors remain failures',async()=>{
  const {query}=fake({data:null,error:{message:'Network unavailable'}});
  await assert.rejects(saveActivity(query,{trip_id:'japan'},{id:'a'}),/Network unavailable/);
  await assert.rejects(deleteActivity(query,{id:'a',trip_id:'japan',version:1}),/Network unavailable/);
});
