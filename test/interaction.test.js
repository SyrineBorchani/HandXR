import {test} from 'node:test';
import assert from 'node:assert/strict';
import {pinchState,pinchRatio,smooth,angleDelta,toCSV} from '../src/interaction.js';
test('pinch hysteresis prevents threshold chatter',()=>{assert.equal(pinchState(.35,false),false);assert.equal(pinchState(.35,true),true);assert.equal(pinchState(.5,true),false);assert.equal(pinchState(.2,false),true);});
test('pinch measurement is scale invariant',()=>{const l=Array.from({length:21},()=>({x:0,y:0,z:0}));l[9].y=2;l[4].x=.4;assert.equal(pinchRatio(l),.2);const scaled=l.map(p=>({x:p.x*4,y:p.y*4,z:p.z*4}));assert.equal(pinchRatio(scaled),.2);});
test('smoothing is independent of frame interval',()=>{const one=smooth(0,1,.5,33.334);const two=smooth(smooth(0,1,.5,16.667),1,.5,16.667);assert.ok(Math.abs(one-two)<1e-8);assert.equal(smooth(0,1,0,16),1);});
test('rotation wraps at pi without jumps',()=>assert.ok(Math.abs(angleDelta(-Math.PI+.1,Math.PI-.1)-.2)<1e-10));
test('CSV quotes participant text safely',()=>assert.equal(toCSV([{participant:'P,"1',mode:'mouse'}]),'"participant","mode"\r\n"P,""1","mouse"'));
