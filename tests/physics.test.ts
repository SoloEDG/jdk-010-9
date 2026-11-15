import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reflect, refract } from '../src/features/optics/lib/refraction';
import { trace } from '../src/features/optics/lib/trace';
test('reflection preserves norm and reverses the normal component',()=>{const r=reflect({x:1,y:0},{x:-1,y:0});assert.deepEqual(r,{x:-1,y:0});});
test('total internal reflection returns no transmitted direction',()=>assert.equal(refract({x:.8,y:.6},{x:0,y:-1},1.5,1),null));
test('parallel rays converge through a thin lens onto a screen',()=>{const r=trace({version:1,items:[{id:'s',kind:'source',x:100,y:300,angle:0,size:100,power:1,rays:9,spread:0,wavelength:550,focal:150,index:1.5},{id:'l',kind:'lens',x:400,y:300,angle:90,size:200,power:1,rays:9,spread:0,wavelength:550,focal:150,index:1.5},{id:'d',kind:'screen',x:550,y:300,angle:90,size:200,power:1,rays:9,spread:0,wavelength:550,focal:150,index:1.5}]});assert.equal(r.hits.length,9);assert.ok(r.hits.every(h=>Math.abs(h.position)<.01));});
