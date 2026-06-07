function groupByRankAndDivision(users) {
  return users.reduce((map, user) => {
    const key = `${user.division}||${user.rank}`;
    if (!map[key]) {
      map[key] = [];
    }
    map[key].push(user);
    return map;
  }, {});
}


function createPersonLink(person) {
  const link = document.createElement('a');
  link.href = `profile.html?user=${encodeURIComponent(person.token)}`;
  const displayName = `${person.firstName || ''} ${person.lastName || ''}`.trim() || 'Unknown';
  link.innerHTML = `<span>${displayName}</span><span class="role-chip">${person.discord || 'No Discord'}</span>`;
  return link;
}


function createRankBlock(rank, persons) {
  if (!persons.length) {
    return null;
  }
  const block = document.createElement('div');
  block.className = 'rank-block';
  block.dataset.rank = rank;
  block.innerHTML = `<h3>${rank}</h3><div class="person-list"></div>`;
  const list = block.querySelector('.person-list');
  persons.forEach((person) => list.appendChild(createPersonLink(person)));
  return block;
}


function renderOrbat() {
  const container = document.getElementById('live-orbat');
  const state = marleyanFleet.loadFleetState();
  const activeMembers = state.users.filter((user) => user.status === 'Active' || user.status === 'On Leave');
  const grouped = groupByRankAndDivision(activeMembers);
  container.innerHTML = '';


  const topBlock = document.createElement('div');
  topBlock.className = 'command-hq';
  topBlock.innerHTML = `
    <h3>Command HQ</h3>
    <p></p>
  `;
  const hqRanks = state.ranks.filter((rank) => rank.category === 'HIGH-COMMAND');
  hqRanks.forEach((rank) => {
    const persons = state.users.filter((user) => user.rank === rank.key);
    const block = createRankBlock(rank.key, persons);
    if (block) topBlock.appendChild(block);
  });


  const branchRow = document.createElement('div');
  branchRow.className = 'branch-row';
  const divisionRanks = state.ranks.filter((rank) => rank.category !== 'HIGH-COMMAND');


  state.divisions.forEach((division) => {
    const column = document.createElement('div');
    column.className = 'branch-column';
    const title = document.createElement('div');
    title.innerHTML = `<h3>${division}</h3><p class="subtext"></p>`;
    column.appendChild(title);


    divisionRanks.forEach((rank) => {
      const key = `${division}||${rank.key}`;
      const persons = grouped[key] || [];
      const block = createRankBlock(rank.key, persons);
      if (block) column.appendChild(block);
    });


    if (column.querySelector('.rank-block')) {
      branchRow.appendChild(column);
    }
  });


  container.appendChild(topBlock);


  if (branchRow.children.length > 0) {
    container.appendChild(branchRow);
  } else {
    const emptyNotice = document.createElement('div');
    emptyNotice.className = 'empty-orbat';
    emptyNotice.innerHTML = `<p>The Fleet ORBAT is currently empty. Use Administration to add fleet personnel and populate the live command structure.</p>`;
    container.appendChild(emptyNotice);
  }
}


window.addEventListener('DOMContentLoaded', renderOrbat);





