import * as THREE from 'three';
import {HandLandmarker, FilesetResolver} from '@mediapipe/tasks-vision';
import {clamp,pinchRatio,pinchState,smooth,angleDelta,toCSV} from './interaction.js';
import './style.css';

const $=id=>document.getElementById(id);
const stage=$('stage'), video=$('video'), overlay=$('skeleton'), ctx=overlay.getContext('2d');
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(42,1,.1,100); camera.position.set(0,0,11);
const renderer=new THREE.WebGLRenderer({canvas:$('scene'),antialias:true,alpha:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.setClearColor(0,0); renderer.outputColorSpace=THREE.SRGBColorSpace;
scene.add(new THREE.HemisphereLight(0xeaffd6,0x233d32,2.5));
const light=new THREE.DirectionalLight(0xffffff,3);light.position.set(3,5,8);scene.add(light);
const grid=new THREE.GridHelper(24,32,0x70806a,0x3b5040);grid.position.set(0,-2,-2);scene.add(grid);
const objects=[];
const specs=[['Cube',new THREE.BoxGeometry(1.15,1.15,1.15),0xd5ee98,-2.4],['Sphere',new THREE.SphereGeometry(.7,40,24),0xa4c8b8,0],['Torus',new THREE.TorusGeometry(.6,.22,20,60),0xe7ad7b,2.4]];
for(const [name,geometry,color,x] of specs){const mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color,metalness:.15,roughness:.3}));mesh.name=name;mesh.position.set(x,0,0);mesh.rotation.set(.25,.35,0);mesh.userData.initial=mesh.position.clone();scene.add(mesh);objects.push(mesh);}
const cube=objects[0];const target=new THREE.Mesh(new THREE.BoxGeometry(1.19,1.19,1.19),new THREE.MeshBasicMaterial({color:0xd6f792,wireframe:true,transparent:true,opacity:.7}));target.visible=false;scene.add(target);
const ray=new THREE.Raycaster(),ndc=new THREE.Vector2();
let mode='mouse',tool='translate',selected=null,hover=null,held=false,handPinched=false,stream=null,landmarker=null,starting=false;
let lastVideo=-1,lastHand=0,lastInference=0,trial=null,trials=[],inferenceSamples=[],frameCount=0,fpsStart=performance.now();
let pointer={x:.5,y:.5},previousHandTime=0,startPoint=new THREE.Vector3(),startPosition=new THREE.Vector3(),startRotation=new THREE.Euler(),startAngle=0,startPointer={x:0,y:0},pointerId=null;
function message(text){$('message').textContent=text;}
function resize(){const {width,height}=stage.getBoundingClientRect();renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();overlay.width=width;overlay.height=height;}
new ResizeObserver(resize).observe(stage);resize();
function projectPointer(x,y,z){ndc.set(x*2-1,1-y*2);ray.setFromCamera(ndc,camera);const plane=new THREE.Plane(new THREE.Vector3(0,0,1),-z);return ray.ray.intersectPlane(plane,new THREE.Vector3());}
function updateHover(x,y){ndc.set(x*2-1,1-y*2);ray.setFromCamera(ndc,camera);hover=ray.intersectObjects(objects)[0]?.object??null;}
function grab(x,y,angle=0){updateHover(x,y);selected=hover;if(!selected){updateLabels();return;}held=true;startPosition.copy(selected.position);startRotation.copy(selected.rotation);startPoint.copy(projectPointer(x,y,selected.position.z));startAngle=angle;startPointer={x,y};updateLabels();}
function move(x,y,angle=0){if(!held||!selected)return;if(tool==='translate'){const point=projectPointer(x,y,startPosition.z);if(point){selected.position.copy(startPosition).add(point.sub(startPoint));selected.position.x=clamp(selected.position.x,-4.2,4.2);selected.position.y=clamp(selected.position.y,-2.5,2.5);}}else{selected.rotation.copy(startRotation);if(mode==='gesture')selected.rotation.z+=angleDelta(angle,startAngle);else{selected.rotation.z-=(x-startPointer.x)*6;}}}
function release(){held=false;updateLabels();}
function updateLabels(){$('selected').textContent=selected?.name??'None';$('action').textContent=held?`${tool==='translate'?'MOVING':'ROTATING'} ${selected.name.toUpperCase()}`:hover?'PINCH OR DRAG TO GRAB':'POINT TO AN OBJECT';}
function cancelTrial(){if(trial){trial=null;target.visible=false;$('trial').disabled=false;$('finish').disabled=true;$('task').textContent='Trial cancelled. Start a new trial to record a complete attempt.';}}
function setMode(next){cancelTrial();release();handPinched=false;mode=next;for(const m of ['mouse','gesture'])$(m).classList.toggle('active',m===mode);$('status').textContent=mode==='mouse'?'Mouse ready':stream?'Camera running':'Camera needed';$('tracking').textContent=mode==='mouse'?'Mouse input':'Waiting for hand';$('cursor').hidden=mode==='mouse';if(mode==='mouse')ctx.clearRect(0,0,overlay.width,overlay.height);}
$('mouse').onclick=()=>setMode('mouse');$('gesture').onclick=()=>setMode('gesture');
for(const t of ['translate','rotate'])$(t).onclick=()=>{release();handPinched=false;tool=t;for(const id of ['translate','rotate'])$(id).classList.toggle('active',id===t);};
function coordinates(event){const r=stage.getBoundingClientRect();return {x:(event.clientX-r.left)/r.width,y:(event.clientY-r.top)/r.height};}
stage.addEventListener('pointerdown',e=>{if(mode!=='mouse'||e.button!==0)return;const p=coordinates(e);pointerId=e.pointerId;stage.setPointerCapture(e.pointerId);grab(p.x,p.y);});
stage.addEventListener('pointermove',e=>{if(mode!=='mouse')return;const p=coordinates(e);updateHover(p.x,p.y);move(p.x,p.y);updateLabels();});
for(const event of ['pointerup','pointercancel','lostpointercapture'])stage.addEventListener(event,()=>{release();pointerId=null;});
function depth(delta){if(!selected)return;selected.position.z=clamp(selected.position.z+delta,-2,3);if(held){startPosition.z=selected.position.z;startPoint.copy(projectPointer(startPointer.x,startPointer.y,startPosition.z));}}
stage.addEventListener('wheel',e=>{if(mode==='mouse'&&selected){e.preventDefault();depth(e.deltaY<0?.15:-.15);}},{passive:false});
window.addEventListener('keydown',e=>{if(e.target instanceof HTMLInputElement)return;if(e.key==='ArrowUp'||e.key==='ArrowDown'){e.preventDefault();depth(e.key==='ArrowUp'?.15:-.15);}if(e.key==='Escape'){release();cancelTrial();}});
window.addEventListener('blur',()=>{release();handPinched=false;});
$('background').onclick=()=>$('video').classList.toggle('visible');
function reset(){release();selected=null;hover=null;for(const mesh of objects){mesh.position.copy(mesh.userData.initial);mesh.rotation.set(.25,.35,0);}updateLabels();}
$('reset').onclick=()=>{cancelTrial();reset();};
async function startCamera(){if(starting||stream)return;starting=true;$('camera').disabled=true;message('Loading hand tracking and requesting webcam access…');let acquired=null;
try{if(!navigator.mediaDevices?.getUserMedia)throw new Error('Camera access requires localhost or HTTPS.');
if(!landmarker){const vision=await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304/wasm');const options={baseOptions:{modelAssetPath:'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',delegate:'GPU'},runningMode:'VIDEO',numHands:1,minHandDetectionConfidence:.6,minTrackingConfidence:.6};try{landmarker=await HandLandmarker.createFromOptions(vision,options);}catch{options.baseOptions.delegate='CPU';landmarker=await HandLandmarker.createFromOptions(vision,options);}}
acquired=await navigator.mediaDevices.getUserMedia({video:{width:640,height:480,facingMode:'user'},audio:false});video.srcObject=acquired;await video.play();stream=acquired;lastVideo=-1;previousHandTime=0;$('stop').hidden=false;$('camera').hidden=true;setMode('gesture');message('Show one hand. Point your index finger, pinch to grab, then move or turn your wrist.');
}catch(error){acquired?.getTracks().forEach(t=>t.stop());video.srcObject=null;message(`Could not start camera: ${error.message}. Mouse mode is available.`);setMode('mouse');}finally{starting=false;$('camera').disabled=false;}}
function stopCamera(){stream?.getTracks().forEach(t=>t.stop());stream=null;video.srcObject=null;ctx.clearRect(0,0,overlay.width,overlay.height);$('stop').hidden=true;$('camera').hidden=false;setMode('mouse');message('Camera stopped. Continue using your mouse.');}
$('camera').onclick=startCamera;$('stop').onclick=stopCamera;
function track(now){if(!stream||mode!=='gesture'||video.readyState<2||lastVideo===video.currentTime)return;lastVideo=video.currentTime;
try{const start=performance.now();const result=landmarker.detectForVideo(video,now);lastInference=performance.now()-start;if(trial)inferenceSamples.push(lastInference);$('latency').textContent=`${lastInference.toFixed(1)} ms`;ctx.clearRect(0,0,overlay.width,overlay.height);const lm=result.landmarks[0];
if(!lm){if(now-lastHand>160){release();handPinched=false;previousHandTime=0;$('cursor').hidden=true;$('tracking').textContent='No hand detected';}return;}lastHand=now;$('tracking').textContent='Hand detected';
ctx.strokeStyle='#d6f792';ctx.lineWidth=1.5;for(const {start,end} of HandLandmarker.HAND_CONNECTIONS){ctx.beginPath();ctx.moveTo((1-lm[start].x)*overlay.width,lm[start].y*overlay.height);ctx.lineTo((1-lm[end].x)*overlay.width,lm[end].y*overlay.height);ctx.stroke();}
const pinched=pinchState(pinchRatio(lm),handPinched);const raw={x:1-lm[8].x,y:lm[8].y};const dt=previousHandTime?now-previousHandTime:16.667;const retention=Number($('smoothing').value);pointer=previousHandTime?{x:smooth(pointer.x,raw.x,retention,dt),y:smooth(pointer.y,raw.y,retention,dt)}:raw;previousHandTime=now;
const angle=Math.atan2(lm[9].y-lm[0].y,-(lm[9].x-lm[0].x));updateHover(pointer.x,pointer.y);if(pinched&&!handPinched)grab(pointer.x,pointer.y,angle);if(pinched)move(pointer.x,pointer.y,angle);if(!pinched&&handPinched)release();handPinched=pinched;
const cursor=$('cursor');cursor.hidden=false;cursor.style.left=`${pointer.x*100}%`;cursor.style.top=`${pointer.y*100}%`;cursor.classList.toggle('grab',held);updateLabels();
}catch(error){stopCamera();message(`Tracking stopped: ${error.message}. Try enabling the camera again.`);}}
const targets=[{p:[1.5,1,0],r:[.25,.35,.7]},{p:[-1,1.2,0],r:[.25,.35,-.7]},{p:[1.8,-.8,0],r:[.25,.35,1.1]}];
$('trial').onclick=()=>{if(mode==='gesture'&&!stream){message('Enable the camera before starting a gesture trial.');return;}reset();const spec=targets[trials.length%targets.length];target.position.fromArray(spec.p);target.rotation.set(...spec.r);target.visible=true;inferenceSamples=[];trial={start:performance.now(),mode,participant:$('participant').value.trim()||'anonymous',target:trials.length%targets.length};$('trial').disabled=true;$('finish').disabled=false;$('task').textContent='Move the cube to the wireframe target. Switch to Rotate to match its orientation, then press Finish trial. Sphere and torus are distractors.';};
$('finish').onclick=()=>{if(!trial)return;release();const positionError=cube.position.distanceTo(target.position);const rotationError=THREE.MathUtils.radToDeg(cube.quaternion.angleTo(target.quaternion));trials.push({participant:trial.participant,timestamp:new Date().toISOString(),mode:trial.mode,target_id:trial.target,completion_seconds:((performance.now()-trial.start)/1000).toFixed(3),position_error_scene_units:positionError.toFixed(4),rotation_error_degrees:rotationError.toFixed(2),mean_inference_ms:inferenceSamples.length?(inferenceSamples.reduce((a,b)=>a+b,0)/inferenceSamples.length).toFixed(2):'',inference_samples:inferenceSamples.length,smoothing:Number($('smoothing').value)});trial=null;target.visible=false;$('trial').disabled=false;$('finish').disabled=true;$('trials').textContent=`${trials.length} trials recorded`;$('task').textContent=`Recorded · position error ${positionError.toFixed(3)} units · rotation error ${rotationError.toFixed(1)}°. Repeat with the other input mode. Export results before closing this tab.`;};
$('export').onclick=()=>{if(!trials.length){message('Complete a trial before exporting results.');return;}const url=URL.createObjectURL(new Blob([toCSV(trials)],{type:'text/csv;charset=utf-8;'}));const a=document.createElement('a');a.href=url;a.download='handxr-trials.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
function frame(now){requestAnimationFrame(frame);track(now);for(const mesh of objects)mesh.material.emissive.setHex(mesh===selected?0x283b10:mesh===hover?0x152819:0x000000);renderer.render(scene,camera);frameCount++;if(now-fpsStart>700){$('fps').textContent=`${Math.round(frameCount*1000/(now-fpsStart))} fps`;frameCount=0;fpsStart=now;}}
requestAnimationFrame(frame);window.addEventListener('pagehide',()=>{stream?.getTracks().forEach(t=>t.stop());landmarker?.close();});

