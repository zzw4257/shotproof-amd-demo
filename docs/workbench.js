'use strict';
window.addEventListener('DOMContentLoaded',async()=>{
 await window.demoReady;
 const select=document.getElementById('case'),strip=document.getElementById('case-strip');
 const titles={addition:'Addition study',occlusion:'Occlusion study',lighting:'Lighting study'};
 for(const role of Object.keys(titles)){
  const b=document.createElement('button');b.type='button';b.className='case-thumb';b.dataset.role=role;
  const img=document.createElement('img');img.src='data:image/svg+xml;base64,'+DEMO_ASSETS.payloads[role];img.alt='';
  const label=document.createElement('span');label.textContent=titles[role];b.append(img,label);
  b.addEventListener('click',()=>{select.value=role;select.dispatchEvent(new Event('change',{bubbles:true}));});strip.append(b);
 }
 function sync(){document.getElementById('case-label').textContent=titles[select.value];for(const b of strip.children)b.setAttribute('aria-pressed',String(b.dataset.role===select.value));}
 select.addEventListener('change',sync);sync();
});
