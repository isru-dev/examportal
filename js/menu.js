 let menu=document.querySelector('.fa-bars');
let sidepro=document.querySelector('.side-prof');
let hero=document.querySelector('.hero-section');
let close=document.querySelector('.fa-xmark');
console.log(close);

close.addEventListener('click',()=>{
  sidepro.style.display='none';
  
});
menu.addEventListener('click',()=>{
 sidepro.classList.toggle("visible");
   console.log();

});
