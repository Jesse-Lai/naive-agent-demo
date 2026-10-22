// Preview controls by Visual Atlas; shader algorithms from Paper Shaders 0.0.82, Apache-2.0.
import {ShaderMount} from '../vendor/paper/shader-mount.js';
import {neuroNoiseFragmentShader} from '../vendor/paper/shaders/neuro-noise.js';
import {grainGradientFragmentShader} from '../vendor/paper/shaders/grain-gradient.js';
import {getShaderNoiseTexture} from '../vendor/paper/get-shader-noise-texture.js';
const params=new URLSearchParams(location.search),sphere=params.get('effect')==='sphere',still=params.has('still');
document.body.classList.toggle('still',still);
document.querySelector('#source').href='https://shaders.paper.design/'+(sphere?'grain-gradient':'neuro-noise');
const colors={blue:[[.32,.65,1,1],[.12,.24,.65,1],[.74,.94,1,1]],violet:[[.64,.27,1,1],[.23,.11,.5,1],[1,.67,.9,1]],warm:[[1,.56,.23,1],[.55,.14,.15,1],[1,.9,.64,1]]};
const sizing={u_originX:.5,u_originY:.5,u_worldWidth:0,u_worldHeight:0,u_fit:1,u_scale:sphere?1.15:1,u_rotation:0,u_offsetX:0,u_offsetY:0};
const palette=(key)=>sphere?{u_colors:colors[key],u_colorsCount:3}:{u_colorFront:colors[key][2],u_colorMid:colors[key][0]};
let mount,paused=false;
try{
 const noise=getShaderNoiseTexture();if(sphere&&noise&&!noise.complete)await noise.decode();
 const uniforms={...sizing,...palette('blue'),u_colorBack:[.025,.035,.065,1],...(sphere?{u_softness:.7,u_intensity:.3,u_noise:.13,u_shape:7,u_noiseTexture:noise}:{u_brightness:.17,u_contrast:.34})};
 mount=new ShaderMount(document.querySelector('#surface'),sphere?grainGradientFragmentShader:neuroNoiseFragmentShader,uniforms,undefined,still?0:.4,6000,1,960*640);
 document.querySelector('#pause').addEventListener('click',event=>{paused=!paused;mount.setSpeed(paused?0:Number(document.querySelector('#speed').value));event.target.textContent=paused?'播放':'暂停';event.target.setAttribute('aria-label',paused?'播放动画':'暂停动画');});
 document.querySelector('#speed').addEventListener('input',event=>{if(!paused)mount.setSpeed(Number(event.target.value));});
 document.querySelector('#palette').addEventListener('change',event=>mount.setUniforms(palette(event.target.value)));
 if(!still)document.querySelector('#surface').addEventListener('pointermove',event=>{const box=event.currentTarget.getBoundingClientRect();mount.setUniforms({u_offsetX:(event.clientX/box.width-.5)*.2,u_offsetY:(.5-event.clientY/box.height)*.2});});
 window.addEventListener('pagehide',()=>mount.dispose(),{once:true});
}catch(error){document.querySelector('#error').textContent='当前浏览器未能启动 WebGL 预览。可通过 Paper 原作查看此效果。';console.error(error);}
