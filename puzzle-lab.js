(() => {
  'use strict';
  const lab = document.querySelector('#puzzle-practice');
  const lessons = JSON.parse(document.querySelector('#practice-data').textContent);
  const mode = lab.querySelector('select');
  const board = lab.querySelector('.practice-board');
  const feedback = lab.querySelector('[role="status"]');
  const gems = ['Blue flower', 'Red flower', 'Green flower', 'Yellow flower', 'Purple flower'];
  const voice = lab.querySelector('audio');
  const speechButtons = [...lab.querySelectorAll('[data-cue]')];
  let cue = null;
  function updateSpeech() {
    for (const button of speechButtons) {
      const active = cue === button.dataset.cue && !voice.paused;
      button.textContent = active ? 'Stop voice' : button.dataset.cue === 'tip' ? 'Hear a move tip' : 'Hear the rule';
      button.setAttribute('aria-pressed', String(active));
    }
  }
  for (const button of speechButtons) button.addEventListener('click', () => {
    const stop = cue === button.dataset.cue && !voice.paused;
    voice.pause();
    if (stop) { updateSpeech(); return; }
    cue = button.dataset.cue;
    voice.src = 'assets/puzzle-voice/' + key() + (cue === 'tip' ? '-tip' : '') + '.mp3';
    voice.play().catch(error => {
      if (error.name !== 'AbortError') feedback.textContent = 'The recording could not play. The puzzle rules are written beside the board.';
      updateSpeech();
    });
  });
  for (const event of ['playing','pause','ended']) voice.addEventListener(event,updateSpeech);
  // Three rows of four. Swap and shift exercises start without completed lines.
  const layouts = {
    swap: '020330211342', diagonal_swap: '003210431240', star_hop: '030132302412',
    row_shift: '023430230412', column_shift: '030210322413',
    tap_groups: '023132230214', diagonal_groups: '023112032134',
    cross_gather: '220122232431', bloom_groups: '220302342410'
  };
  const orthogonal = [[0,1],[1,0],[0,-1],[-1,0]];
  const diagonal = [[1,1],[1,-1],[-1,1],[-1,-1]];
  let tiles, selected, result, hinted;
  const key = () => mode.value;
  const isGroup = () => key().includes('gather') || key().includes('groups');
  const minimum = () => key() === 'bloom_groups' ? 3 : 2;
  function neighbour(i, dx, dy) {
    const x = i % 4 + dx, y = Math.floor(i / 4) + dy;
    return x >= 0 && x < 4 && y >= 0 && y < 3 ? y * 4 + x : -1;
  }
  function legal(a,b) {
    const x = Math.abs(a%4-b%4), y = Math.abs(Math.floor(a/4)-Math.floor(b/4));
    switch(key()) {
      case 'row_shift': return x===1 && y===0;
      case 'column_shift': return x===0 && y===1;
      case 'star_hop': return x*y===2;
      case 'diagonal_swap': return Math.max(x,y)===1;
      default: return x+y===1;
    }
  }
  function group(start) {
    const found = new Set([start]);
    if (key()==='cross_gather') {
      for (const [dx,dy] of orthogonal) {
        let i=neighbour(start,dx,dy);
        while(i>=0 && tiles[i]===tiles[start]) { found.add(i); i=neighbour(i,dx,dy); }
      }
    } else {
      const directions = key()==='diagonal_groups' ? orthogonal.concat(diagonal) : orthogonal;
      const queue=[start];
      for (const i of queue) for (const [dx,dy] of directions) {
        const j=neighbour(i,dx,dy);
        if(j>=0 && !found.has(j) && tiles[j]===tiles[start]) { found.add(j); queue.push(j); }
      }
    }
    return [...found];
  }
  function move(a,b) {
    const next=tiles.slice();
    const origins=tiles.map((_,i)=>i);
    if(key()==='row_shift' || key()==='column_shift') {
      const horizontal=key()==='row_shift', length=horizontal?4:3;
      const first=horizontal?a-a%4:a%4, stride=horizontal?1:4, step=Math.sign(b-a);
      for(let n=0;n<length;n++) {
        const to=first+((n+step+length)%length)*stride;
        origins[to]=first+n*stride;
        next[to]=tiles[origins[to]];
      }
    } else { next[a]=tiles[b]; next[b]=tiles[a]; origins[a]=b; origins[b]=a; }
    const hits=new Set();
    for(let i=0;i<12;i++) for(const [dx,dy] of [[1,0],[0,1]]) {
      const j=neighbour(i,dx,dy), k=neighbour(i,2*dx,2*dy);
      if(k>=0 && next[i]===next[j] && next[i]===next[k]) [i,j,k].forEach(n=>hits.add(n));
    }
    return {next,origins,hits:[...hits]};
  }
  function animateMove(origins) {
    if (!origins || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const cells=[...board.children];
    for (const [to,from] of origins.entries()) {
      if (from===to) continue;
      const sprite=cells[to].firstElementChild;
      if (!sprite.animate) continue;
      const dx=cells[from].offsetLeft-cells[to].offsetLeft;
      const dy=cells[from].offsetTop-cells[to].offsetTop;
      const frames=[{transform:`translate(${dx}px,${dy}px)`}];
      if (key()==='star_hop') {
        const longSide=Math.abs(dx)>Math.abs(dy);
        frames.push({transform:`translate(${longSide?0:dx}px,${longSide?dy:0}px) scale(1.12)`,offset:.62});
      }
      frames.push({transform:'translate(0,0)'});
      sprite.animate(frames,{duration:420,easing:'ease-in-out'});
    }
  }
  function draw() {
    [...board.children].forEach((button,i)=>{
      button.dataset.gem=tiles[i];
      button.classList.toggle('chosen',selected===i);
      button.classList.toggle('target',selected!==null && key()==='star_hop' && legal(selected,i));
      button.classList.toggle('hit',result.includes(i));button.classList.toggle('hinted',hinted.includes(i));
      button.setAttribute('aria-pressed',String(selected===i));
      button.setAttribute('aria-label',gems[tiles[i]]+', row '+(Math.floor(i/4)+1)+', column '+(i%4+1)+(button.classList.contains('target')?', hop destination':'')+(result.includes(i)?', matched':''));
    });
  }
  function reset() {
    const lesson=lessons.find(l=>l.mode===key());
    voice.pause();cue=null;updateSpeech();voice.src='assets/puzzle-voice/'+key()+'.mp3';voice.setAttribute('aria-label','Listen to '+lesson.title+' instructions');
    lab.querySelector('.practice-rule').textContent=lesson.controls;
    lab.querySelector('.practice-details').textContent=lesson.details;
    tiles=Array.from(layouts[key()]||layouts.swap,Number);
    for(const cell of board.children) cell.firstElementChild.getAnimations?.().forEach(animation=>animation.cancel());
    selected=null;result=[];hinted=[];feedback.textContent=isGroup()?'Pick a connected group to clear.':'Pick your first gem.';
    draw();
  }
  function pick(i) {
    if(result.length) return;
    let origins;
    hinted=[];
    if(isGroup()) {
      const hits=group(i);
      if(hits.length>=minimum()) result=hits;
      else feedback.textContent='That group has '+hits.length+'. Look for at least '+minimum()+' that connect under this rule.';
    } else if(selected===null || selected===i) {
      selected=selected===i?null:i;
      feedback.textContent=selected===null?'Pick your first gem.':key()==='star_hop'?'Choose a gold-ringed destination.':'Pick the second gem to make your move.';
    } else if(!legal(selected,i)) {
      feedback.textContent=key()==='star_hop'?'Try one of the gold rings.':key()==='row_shift'?'Pick the next gem in this row.':key()==='column_shift'?'Pick the next gem in this column.':'Pick a neighbouring gem.';
    } else {
      const attempt=move(selected,i);
      if(attempt.hits.length) {tiles=attempt.next;result=attempt.hits;origins=attempt.origins;}
      else feedback.textContent='That move made no line of three. The gems return to their starting places. Try another move.';
      selected=null;
    }
    if(result.length) {
      feedback.textContent=result.length+' gems would clear. '+(key()==='cross_gather'?'Only straight arms from the tapped gem count.':key()==='rising_tides'?'Gems refill from below, lifting anything beneath the cleared tiles.':isGroup()?'The marked gems all connect to your tap.':'The marked gems line up in a row or column.');
    }
    draw();
    animateMove(origins);
  }
  function hint() {
    if(result.length) return;
    for(let a=0;a<12;a++){
      if(isGroup() && group(a).length>=minimum()){hinted=[a];break;}
      if(!isGroup()) {
        const b=tiles.findIndex((_,i)=>legal(a,i)&&move(a,i).hits.length);
        if(b>=0){hinted=[a,b];break;}
      }
    }
    selected=null;
    const position=i=>'row '+(Math.floor(i/4)+1)+', column '+(i%4+1);
    feedback.textContent='Try '+hinted.map(position).join(', then ')+'.';draw();
  }
  for(let i=0;i<12;i++){
    const button=document.createElement('button');button.type='button';
    const sprite=document.createElement('span');sprite.className='practice-gem';sprite.setAttribute('aria-hidden','true');button.append(sprite);
    button.addEventListener('click',()=>pick(i));board.append(button);
  }
  mode.addEventListener('change',reset);lab.querySelector('.practice-hint').addEventListener('click',hint);
  lab.querySelector('.practice-reset').addEventListener('click',reset);reset();lab.hidden=false;
})();

// Starting a new cue silences any other narrator on the page.
document.addEventListener('play', event => {
  if (!(event.target instanceof HTMLAudioElement)) return;
  document.querySelectorAll('audio').forEach(player => {
    if (player !== event.target && !player.paused) player.pause();
  });
}, true);
