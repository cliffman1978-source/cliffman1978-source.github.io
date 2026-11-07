(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const all = selector => [...document.querySelectorAll(selector)];
  const sections = all('main > section');
  const lessons = all('.lesson');
  const filters = all('.filter');
  const search = $('#guide-search');
  const panels = all('[data-bonus-panel]');
  const homeViews = new Set(['home','explore']);
  const pageSize = 6;
  let category = 'All topics', page = 0;
  const normalized = value => value.toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’‘]/g,"'");
  const searchText = new Map(lessons.map(lesson => [lesson,normalized(lesson.textContent)]));
  function updateGuide() {
    const words = normalized(search.value).trim().split(/\s+/).filter(Boolean);
    const matches = lessons.filter(lesson => (category === 'All topics' || lesson.dataset.category === category) && words.every(word => searchText.get(lesson).includes(word)));
    const pages = Math.ceil(matches.length / pageSize);
    page = Math.max(0,Math.min(page,pages-1));
    const visible = new Set(matches.slice(page*pageSize,(page+1)*pageSize));
    for (const lesson of lessons) {
      lesson.hidden = !visible.has(lesson);
      if (lesson.hidden) lesson.open = false;
    }
    filters.forEach(button => button.setAttribute('aria-pressed',String(button.dataset.category === category)));
    $('#no-results').hidden = matches.length !== 0;
    $('.guide-pages').hidden = pages <= 1;
    $('#prev-topics').disabled = page === 0;
    $('#next-topics').disabled = page+1 >= pages;
    $('#page-info').textContent = 'Page '+(page+1)+' of '+pages;
    $('#result-count').textContent = matches.length ? 'Showing '+(page*pageSize+1)+'–'+Math.min((page+1)*pageSize,matches.length)+' of '+matches.length+' topics' : 'No matching topics';
  }
  function chooseCategory(value) { category=value;page=0;search.value='';updateGuide(); }
  filters.forEach(button => button.addEventListener('click',()=>chooseCategory(button.dataset.category)));
  search.addEventListener('input',()=>{page=0;updateGuide();});
  $('#clear-search').addEventListener('click',()=>{chooseCategory('All topics');search.focus();});
  for(const [selector,step] of [['#prev-topics',-1],['#next-topics',1]]) {
    $(selector).addEventListener('click',()=>{page+=step;updateGuide();const first=lessons.find(l=>!l.hidden);first?.querySelector('summary').focus();});
  }
  function route() {
    let id;
    try { id=decodeURIComponent(location.hash.slice(1)); } catch { id='home'; }
    const target=document.getElementById(id);
    const section=target?.closest('main > section');
    const view=section?.id || 'home';
    const atHome=homeViews.has(view);
    for(const item of sections) item.hidden=atHome ? !homeViews.has(item.id) : item!==section;
    $('.trail-strip').hidden=!atHome;
    $('.back-hub').hidden=atHome;
    for(const button of all('.header nav a')) {
      if(button.hash==='#'+view) button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');
    }
    if(view==='guide' && id==='shops') chooseCategory('Shops & rewards');
    if(view==='guide' && id==='worlds') chooseCategory('Worlds & quests');
    if(target?.classList.contains('lesson')) {
      category='All topics';search.value='';page=Math.floor(lessons.indexOf(target)/pageSize);
      updateGuide();target.open=true;
    }
    if(view==='bonus') {
      const current=panels.includes(target)?target:panels[0];
      for(const panel of panels) panel.hidden=panel!==current;
      for(const link of all('.bonus-choice')) {
        if(link.hash==='#'+current.id)link.setAttribute('aria-current','true');else link.removeAttribute('aria-current');
      }
    }
    for(const player of all('audio')) if(!player.paused && player.closest('[hidden]')) player.pause();
    requestAnimationFrame(()=>{
      if(target?.classList.contains('lesson') || id==='explore') target.scrollIntoView({block:'start'});
      else if(!panels.includes(target)) window.scrollTo({top:0,behavior:'instant'});
    });
  }
  document.addEventListener('click',event=>{
    const link=event.target.closest('a[href^="#"]');if(!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)return;
    if(link.dataset.pick)chooseCategory(link.dataset.pick);
    if(link.hash===location.hash){event.preventDefault();route();}
  });
  window.addEventListener('hashchange',route);
  $('.guide-tools').hidden=false;
  updateGuide();route();

  const faces=['rowan','lyra','mara'];
  const pairs=$('.pairs-sample'), cards=pairs.querySelector('.pair-cards');
  let deck, first=null, matched, turns, timeout;
  function shuffle(items) {
    for(let i=items.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[items[i],items[j]]=[items[j],items[i]];}
    return items;
  }
  function drawCards(second=null) {
    [...cards.children].forEach((button,i)=>{
      const face=deck[i], shown=i===first || i===second || matched.has(i);
      button.classList.toggle('revealed',shown);
      button.querySelector('img').hidden=!shown;
      button.querySelector('span').hidden=shown;
      button.setAttribute('aria-label','Card '+(i+1)+(shown?', '+face:', face down')+(matched.has(i)?', matched':''));
      button.disabled=matched.has(i);
    });
  }
  function startPairs() {
    clearTimeout(timeout);timeout=null;deck=shuffle([...faces,...faces]);first=null;matched=new Set();turns=0;
    cards.replaceChildren(...deck.map((face,i)=>{
      const b=document.createElement('button');b.type='button';
      const img=document.createElement('img');img.src='assets/'+face+'.webp';img.alt='';
      const back=document.createElement('span');back.textContent='✦';b.append(img,back);
      b.addEventListener('click',()=>{
        if(timeout!==null || first===i || matched.has(i))return;
        if(first===null){first=i;drawCards();pairs.querySelector('[role=status]').textContent='Choose a second card.';return;}
        turns++;
        if(deck[first]===face){
          matched.add(first);matched.add(i);first=null;drawCards();
          pairs.querySelector('[role=status]').textContent=matched.size===6?'All three pairs in '+turns+' turns!':'A matching pair! Choose again.';
        }else{
          drawCards(i);pairs.querySelector('[role=status]').textContent='Two different friends. Remember their places.';
          timeout=setTimeout(()=>{first=null;timeout=null;drawCards();},900);
        }
      });return b;
    }));
    pairs.querySelector('[role=status]').textContent='Choose two cards.';drawCards();
  }
  pairs.querySelector('.pair-reset').addEventListener('click',startPairs);startPairs();pairs.hidden=false;
  const discovery=$('.discovery-sample'), rows=discovery.querySelector('.discovery-rows');
  function startDiscovery() {
    const icons=shuffle(['lantern','compass','hammer','rainbow','gift','book','coins']);
    const changed=Math.floor(Math.random()*4);
    let won=false;rows.replaceChildren();
    for(let row=0;row<2;row++){
      const group=document.createElement('div');group.setAttribute('role','group');group.setAttribute('aria-label',row?'Second picture':'First picture');
      for(let i=0;i<4;i++){
        const icon=icons[row===1 && i===changed?4:i];
        const b=document.createElement('button');b.type='button';b.setAttribute('aria-label',(row?'Second':'First')+' row, item '+(i+1)+', '+icon);
        const img=document.createElement('img');img.src='assets/icons/'+icon+'.webp';img.alt='';b.append(img);group.append(b);
        b.addEventListener('click',()=>{
          if(won)return;won=i===changed;
          discovery.querySelector('[role=status]').textContent=won?'Found it! The '+icons[i]+' changed to '+icons[4]+'.':'Those items match. Compare the other columns.';
          if(won)for(const line of rows.children)line.children[i].classList.add('found');
        });
      }rows.append(group);
    }
    discovery.querySelector('[role=status]').textContent='Compare the two rows. Tap the item that changed.';
  }
  discovery.querySelector('.discovery-reset').addEventListener('click',startDiscovery);startDiscovery();discovery.hidden=false;
})();
