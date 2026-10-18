'use strict';
// Mobile inspection changes only which full original image is visible, never its pixels.
document.body.classList.add('candidate-active');
for(const button of document.querySelectorAll('[data-image]'))button.addEventListener('click',()=>{
 const chosen=button.dataset.image;
 document.body.classList.toggle('reference-active',chosen==='reference');document.body.classList.toggle('candidate-active',chosen==='candidate');
 for(const peer of document.querySelectorAll('[data-image]'))peer.setAttribute('aria-pressed',String(peer===button));
});
