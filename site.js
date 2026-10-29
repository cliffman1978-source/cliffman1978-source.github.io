(()=>{
'use strict';
const lessons=[...document.querySelectorAll('.lesson')];
const filters=[...document.querySelectorAll('.filter')];
const search=document.querySelector('#guide-search');
const normalize=s=>s.toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’‘]/g,"'");
let selected='All topics';
function update(){
 const words=normalize(search.value).trim().split(/\s+/).filter(Boolean);
 let count=0;
 for(const lesson of lessons){
  const matches=(selected==='All topics'||lesson.dataset.category===selected)&&words.every(word=>normalize(lesson.textContent).includes(word));
  lesson.hidden=!matches;if(matches)count++;
 }
 for(const button of filters)button.setAttribute('aria-pressed',String(button.dataset.category===selected));
 document.querySelector('#result-count').textContent=`${count} of ${lessons.length} guide topics${selected==='All topics'?'':' · '+selected}`;
 document.querySelector('#no-results').hidden=count!==0;
}
filters.forEach(button=>button.addEventListener('click',()=>{selected=button.dataset.category;update();}));
search.addEventListener('input',update);
document.querySelector('#clear-search').addEventListener('click',()=>{search.value='';selected='All topics';update();search.focus();});
document.querySelectorAll('[data-pick]').forEach(link=>link.addEventListener('click',()=>{search.value='';selected=link.dataset.pick;update();}));
function openHash(){
 let id;try{id=decodeURIComponent(location.hash.slice(1));}catch{return;}
 const target=document.getElementById(id);
 if(target?.classList.contains('lesson')){
  selected='All topics';search.value='';update();target.open=true;
  requestAnimationFrame(()=>target.scrollIntoView({block:'start'}));
 }
}
document.querySelectorAll('a[href^="#"]').forEach(link=>link.addEventListener('click',()=>{
 const target=document.getElementById(link.getAttribute('href').slice(1));
 if(target?.classList.contains('lesson')){selected='All topics';search.value='';update();target.open=true;}
}));
window.addEventListener('hashchange',openHash);
document.querySelector('.guide-tools').hidden=false;update();openHash();
})();
