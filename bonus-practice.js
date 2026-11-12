(() => {
  'use strict';
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const pick = count => Math.floor(Math.random() * count);
  const image = name => {
    const icon = new Image();
    icon.src = 'assets/icons/' + name + '.webp?v=realm-art-2';
    icon.alt = '';
    return icon;
  };

  function enableSpin(panel, play) {
    const button = panel.querySelector('button');
    const status = panel.querySelector('[role="status"]');
    button.addEventListener('click', async () => {
      if (button.disabled) return;
      button.disabled = true;
      const stake = panel.querySelector('select');
      if (stake) stake.disabled = true;
      status.textContent = 'Spinning…';
      try {
        status.textContent = await play();
      } finally {
        button.disabled = false;
        if (stake) stake.disabled = false;
      }
    });
    panel.querySelector('.spin-stage').addEventListener('click', () => button.click());
    panel.hidden = false;
  }

  const wheel = document.querySelector('.wheel-practice');
  const face = wheel.querySelector('.wheel-face');
  const prizes = [
    ['coins',50], ['coins',100], ['hint',1], ['shuffle',1], ['hammer',1], ['bomb',1],
    ['coins',150], ['coins',250], ['lightning',1], ['rainbow',1], ['time',1], ['hammer',2]
  ];
  prizes.forEach(([name, amount], i) => {
    const spoke = document.createElement('div');
    spoke.className = 'wheel-spoke';
    spoke.style.setProperty('--spoke-angle', (i * 30) + 'deg');
    const quantity = document.createElement('span');
    quantity.className = 'wheel-amount';
    quantity.textContent = name === 'coins' ? String(amount) : '×' + amount;
    spoke.append(quantity, image(name));
    face.append(spoke);
  });
  let angle = 0;
  enableSpin(wheel, async () => {
    const index = pick(prizes.length);
    const end = (360 - index * 30) % 360;
    const next = angle + 1080 + (end - angle + 360) % 360;
    const rotate = degrees => 'rotate(' + degrees + 'deg)';
    if (!reducedMotion.matches) {
      await face.animate([{transform: rotate(angle)}, {transform: rotate(next)}],
        {duration: 1550, easing: 'cubic-bezier(.16,.7,.17,1)'}).finished;
    }
    angle = end;
    face.style.transform = rotate(angle);
    face.style.setProperty('--rest-angle', angle + 'deg');
    const [name, amount] = prizes[index];
    const label = name === 'time' ? 'time / move booster' : name;
    return 'Practice prize: ' + amount + ' ' + label + (amount > 1 && name !== 'coins' ? 's' : '') + '.';
  });

  const slots = document.querySelector('.slots-practice');
  const reels = slots.querySelector('.practice-reels');
  // A subset of ordinary game symbols with their line payouts per 500 coins staked.
  const symbols = {hammer:[84,420,1260,3780], hint:[42,210,840,2940],
    lightning:[105,525,1890,5880], coins:[252,1260,4200,12600], compass:[210,1050,3780,9450]};
  const names = Object.keys(symbols);
  const lines = [[0,0,0,0,0],[1,1,1,1,1],[2,2,2,2,2],[0,1,2,1,0],[2,1,0,1,2]];
  const cells = Array.from({length: 15}, (_, i) => {
    const icon = image(names[(i + Math.floor(i / 5)) % names.length]);
    reels.append(icon);
    return icon;
  });
  enableSpin(slots, async () => {
    const grid = cells.map(() => names[pick(names.length)]);
    const stake = Number(slots.querySelector('select').value);
    cells.forEach(cell => cell.classList.remove('paying'));
    await Promise.all(cells.map(async (cell, i) => {
      if (!reducedMotion.matches) {
        const duration = 130 + i % 5 * 55;
        await cell.animate([{transform:'translateY(-22%)',opacity:.2},{transform:'none',opacity:1}],
          {duration, iterations:3}).finished;
      }
      cell.src = 'assets/icons/' + grid[i] + '.webp?v=realm-art-2';
      cell.alt = grid[i];
    }));
    let total = 0, wins = 0;
    for (const line of lines) {
      const positions = line.map((row, col) => row * 5 + col);
      let best = 0, matches = [];
      for (const edge of [positions, [...positions].reverse()]) {
        const name = grid[edge[0]];
        let count = 1;
        while (count < 5 && grid[edge[count]] === name) count++;
        if (count < 2) continue;
        const coins = Math.floor(stake * symbols[name][count - 2] / 500);
        if (coins > best) { best = coins; matches = edge.slice(0, count); }
      }
      if (best) { wins++; total += best; matches.forEach(i => cells[i].classList.add('paying')); }
    }
    return wins ? 'Practice win: ' + total + ' coins across ' + wins + (wins === 1 ? ' payline.' : ' paylines.') : 'No matching payline this spin. Try again.';
  });
})();
