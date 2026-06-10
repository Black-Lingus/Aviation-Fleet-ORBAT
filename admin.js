import { marleyanFleet } from './data.js';

let activeDragToken = null;
let activeIntelDragTarget = null;

const PROMOTION_COSTS = {
  "Airman Basic": { next: "Airman", cost: 2 },
  "Airman": { next: "Airman First Class", cost: 5 },
  "Airman First Class": { next: "Senior Airman", cost: 10 },
  "Senior Airman": { next: "Sergeant", cost: 15 },
  "Sergeant": { next: "Chief Master Sergeant", cost: 20 }
};

const RANK_CATEGORY_LABELS = {
  ENLISTED: "𝐄𝐧𝐥𝐢𝐬𝐭𝐞𝐝",
  NCO: "𝐍𝐂𝐎",
  OFFICER: "𝐎𝐅𝐅𝐈𝐂𝐄𝐑",
  "HIGH-COMMAND": "𝐇𝐈𝐆𝐇-𝐂𝐎𝐌𝐌𝐀𝐍𝐃"
};

const SPECIALIZED_ROLES = [
  'Grenadier', 'Recon', 'Anti-Material', 'Heavy Gunner',
  'Mortarman', 'Mortarman Spotter', 'Medic'
];

const AIRCRAFT_CERTS = ['Airship Operation', 'Triplane Operation'];

async function populateRankSelect(select, selectedRank = '') {
  const state = await marleyanFleet.loadFleetState();
  select.innerHTML = '<option value="">---</option>';
  const categories = ['ENLISTED', 'NCO', 'OFFICER', 'HIGH-COMMAND'];
  categories.forEach((category) => {
    const ranks = state.ranks.filter((rank) => rank.category === category);
    if (ranks.length === 0) return;
    const optgroup = document.createElement('optgroup');
    optgroup.label = RANK_CATEGORY_LABELS[category] || category;
    ranks.forEach((rank) => {
      const option = document.createElement('option');
      option.value = rank.key;
      option.textContent = rank.key;
      if (rank.key === selectedRank) option.selected = true;
      optgroup.appendChild(option);
    });
    select.appendChild(optgroup);
  });
}

async function getEncodedDivisionValue(division, rankKey = '') {
  if (!division) return 'FLEET_COMMAND';
  const state = await marleyanFleet.loadFleetState();
  const rank = state.ranks.find((r) => r.key === rankKey);
  if (rank && (rank.category === 'OFFICER' || rank.category === 'HIGH-COMMAND')) {
    return `HQ::${division}`;
  }
  return `PERS::${division}`;
}

async function populateDivisionSelect(select, selectedValue = '', rankKey = '') {
  const state = await marleyanFleet.loadFleetState();
  select.innerHTML = '<option value="">---</option>';
  const fleetOpt = document.createElement('option');
  fleetOpt.value = 'FLEET_COMMAND';
  fleetOpt.textContent = 'Fleet Command';
  select.appendChild(fleetOpt);
  state.divisions.forEach((division) => {
    const hq = document.createElement('option');
    hq.value = `HQ::${division}`;
    hq.textContent = `${division} — Headquarters`;
    select.appendChild(hq);
    const pers = document.createElement('option');
    pers.value = `PERS::${division}`;
    pers.textContent = `${division} — Personnel`;
    select.appendChild(pers);
  });
  let encodedSelection = selectedValue;
  if (selectedValue && !selectedValue.includes('::') && selectedValue !== 'FLEET_COMMAND' && rankKey) {
    encodedSelection = await getEncodedDivisionValue(selectedValue, rankKey);
  }
  if (encodedSelection) select.value = encodedSelection;
}

function decodeDivisionValue(value) {
  if (value === 'FLEET_COMMAND') return '';
  if (value.startsWith('HQ::') || value.startsWith('PERS::')) return value.split('::')[1];
  return value;
}

function updateEditChangeIndicators() {
  const performanceValue = parseInt(document.getElementById('edit-performance').value, 10) || 0;
  const strikesValue = parseInt(document.getElementById('edit-strikes').value, 10) || 0;
  const performanceDelta = performanceValue - originalPerformance;
  const strikesDelta = strikesValue - originalStrikes;
  const performanceIndicator = document.getElementById('performance-delta');
  const strikesIndicator = document.getElementById('strikes-delta');
  performanceIndicator.textContent = performanceDelta === 0 ? '' : `PDP ${performanceDelta > 0 ? '+' : ''}${performanceDelta}`;
  strikesIndicator.textContent = strikesDelta === 0 ? '' : `Strikes ${strikesDelta > 0 ? '+' : ''}${strikesDelta}`;
}

async function buildRankOptions() {
  const rankSelect = document.getElementById('new-rank');
  await populateRankSelect(rankSelect);
  const divisionSelect = document.getElementById('new-division');
  await populateDivisionSelect(divisionSelect);
}

async function buildAdminTree() {
  const container = document.getElementById('admin-tree');
  container.innerHTML = '';
  const state = await marleyanFleet.loadFleetState();

  const activeUsers = state.users.filter(u => u.status === 'Active' || u.status === 'On Leave');
  const retiredUsers = state.users.filter(u => u.status === 'Retired');
  const kiaUsers = state.users.filter(u => u.status === 'KIA');

  const grouped = activeUsers.reduce((map, user) => {
    const key = `${user.division}||${user.rank}`;
    if (!map[key]) map[key] = [];
    map[key].push(user);
    return map;
  }, {});

  const commandSection = document.createElement('div');
  commandSection.className = 'command-hq';
  commandSection.innerHTML = `<h3>Fleet Headquarters</h3><p class="subtext">Fleet command structure.</p>`;
  state.ranks.filter((rank) => rank.category === 'HIGH-COMMAND').forEach((rank) => {
    const usersInRank = activeUsers.filter((u) => u.rank === rank.key && (u.division === '' || !u.division));
    if (usersInRank.length > 0) {
      const block = createAdminRankBlock(rank.key, '', usersInRank);
      commandSection.appendChild(block);
    }
  });
  container.appendChild(commandSection);

  const headquartersRow = document.createElement('div');
  headquartersRow.className = 'branch-row split-row';
  state.divisions.forEach((division) => {
    const headColumn = document.createElement('div');
    headColumn.className = 'branch-column';
    headColumn.innerHTML = `<h3>${division} Headquarters</h3>`;
    state.ranks.filter((rank) => rank.category === 'OFFICER').forEach((rank) => {
      const list = grouped[`${division}||${rank.key}`] || [];
      if (list.length > 0) {
        const block = createAdminRankBlock(rank.key, division, list);
        headColumn.appendChild(block);
      }
    });
    headquartersRow.appendChild(headColumn);
  });
  container.appendChild(headquartersRow);

  const personnelRow = document.createElement('div');
  personnelRow.className = 'branch-row split-row';
  state.divisions.forEach((division) => {
    const personnelColumn = document.createElement('div');
    personnelColumn.className = 'branch-column';
    personnelColumn.innerHTML = `<h3>${division} Personnel</h3>`;
    state.ranks.filter((rank) => rank.category === 'NCO' || rank.category === 'ENLISTED').forEach((rank) => {
      const list = grouped[`${division}||${rank.key}`] || [];
      if (list.length > 0) {
        const block = createAdminRankBlock(rank.key, division, list);
        personnelColumn.appendChild(block);
      }
    });
    personnelRow.appendChild(personnelColumn);
  });
  container.appendChild(personnelRow);

  if (retiredUsers.length > 0 || kiaUsers.length > 0) {
    const archiveSection = document.createElement('div');
    archiveSection.className = 'archive-section';
    archiveSection.style.marginTop = '36px';
    archiveSection.innerHTML = `<h3>Archived Records</h3><p class="subtext">Personnel removed from the live ORBAT are listed here for reference.</p>`;
    if (retiredUsers.length > 0) {
      const retiredList = createAdminRankBlock('Retired', 'Retired', retiredUsers);
      retiredList.querySelector('h3').textContent = 'Retired';
      archiveSection.appendChild(retiredList);
    }
    if (kiaUsers.length > 0) {
      const kiaList = createAdminRankBlock('KIA', 'KIA', kiaUsers);
      kiaList.querySelector('h3').textContent = 'KIA';
      archiveSection.appendChild(kiaList);
    }
    container.appendChild(archiveSection);
  }
}

function createAdminRankBlock(rank, division, persons) {
  const block = document.createElement('div');
  block.className = 'rank-block drop-zone';
  block.dataset.rank = rank;
  block.dataset.division = division;
  block.innerHTML = `<h3>${rank}</h3><div class="person-list"></div>`;
  block.addEventListener('dragover', onDragOver);
  block.addEventListener('dragleave', onDragLeave);
  block.addEventListener('drop', onDrop);
  const list = block.querySelector('.person-list');
  block.classList.toggle('empty', persons.length === 0);
  if (persons.length === 0) {
    const emptySlot = document.createElement('div');
    emptySlot.className = 'empty-slot';
    emptySlot.textContent = 'Open command slot';
    list.appendChild(emptySlot);
  } else {
    persons.forEach((person) => list.appendChild(createUserCard(person)));
  }
  return block;
}

function createUserCard(user) {
  const card = document.createElement('div');
  card.className = 'user-card';
  card.draggable = true;
  card.dataset.token = user.token;
  card.innerHTML = `
    <h4>${user.firstName} ${user.lastName}</h4>
    <p>${user.discord || 'No Discord'}</p>
    <div class="user-card-meta">${user.rank}</div>
  `;
  card.addEventListener('dragstart', onDragStart);
  card.addEventListener('dragend', onDragEnd);
  card.addEventListener('click', (e) => {
    if (e.target === card || e.target.tagName === 'H4' || e.target.tagName === 'P' || e.target.classList.contains('promotion-badge')) {
      openEditPanel(user);
    }
  });
  return card;
}

function onDragStart(event) {
  activeDragToken = event.currentTarget.dataset.token;
  event.currentTarget.classList.add('dragging');
  event.dataTransfer.setData('text/plain', activeDragToken);
}

function onDragEnd(event) {
  event.currentTarget.classList.remove('dragging');
}

function onDragOver(event) {
  event.preventDefault();
  event.currentTarget.classList.add('drag-over');
}

function onDragLeave(event) {
  event.currentTarget.classList.remove('drag-over');
}

async function onDrop(event) {
  event.preventDefault();
  const zone = event.currentTarget;
  zone.classList.remove('drag-over');
  const token = event.dataTransfer.getData('text/plain');
  if (!token) return;
  const state = await marleyanFleet.loadFleetState();
  const user = state.users.find((u) => u.token === token);
  if (!user) return;
  if (zone.dataset.rank === 'Retired') {
    user.status = 'Retired';
  } else if (zone.dataset.rank === 'KIA') {
    user.status = 'KIA';
  } else {
    user.status = 'Active';
    user.division = zone.dataset.division;
    user.rank = zone.dataset.rank;
  }
  await marleyanFleet.saveFleetState(state);
  await buildAdminTree();
}

function onBodyDragOver(event) {
  const scrollZone = document.getElementById('admin-tree');
  if (!scrollZone) return;
  const rect = scrollZone.getBoundingClientRect();
  const edgeDistance = 80;
  const scrollStep = 24;
  if (event.clientY < rect.top + edgeDistance) {
    window.scrollBy({ top: -scrollStep, left: 0 });
  } else if (event.clientY > rect.bottom - edgeDistance) {
    window.scrollBy({ top: scrollStep, left: 0 });
  }
}

async function onUnlockClick() {
  const input = document.getElementById('master-key');
  const value = input.value.trim();
  const state = await marleyanFleet.loadFleetState();
  if (value === state.masterKey) {
    document.getElementById('login-panel').classList.add('hidden');
    document.getElementById('admin-panel').classList.remove('hidden');
    await buildRankOptions();
    await buildAdminTree();
    await buildIntelligenceBoard();
  } else {
    input.classList.add('error');
    window.setTimeout(() => {
      window.location.href = 'index.html';
    }, 900);
  }
}

async function onAccountSubmit(event) {
  event.preventDefault();
  const state = await marleyanFleet.loadFleetState();
  const token = marleyanFleet.createUserToken();
  const robloxVal = document.getElementById('new-roblox').value.trim();
  const discordVal = document.getElementById('new-discord').value.trim();
  const newUser = {
    token,
    rank: document.getElementById('new-rank').value,
    division: (function() {
      const sel = document.getElementById('new-division').value;
      if (sel === 'FLEET_COMMAND') return '';
      if (sel.startsWith('HQ::') || sel.startsWith('PERS::')) return sel.split('::')[1];
      return sel;
    })(),
    firstName: document.getElementById('new-first').value.trim() || 'New',
    lastName: document.getElementById('new-last').value.trim() || 'Recruit',
    roblox: robloxVal || `ROBLOX_${token}`,
    discord: discordVal || `DISCORD_${token}`,
    role: '',
    status: 'Active',
    performance: 0,
    strikes: 0,
    notes: '',
    certifications: [],
  };
  state.users.push(newUser);
  await marleyanFleet.saveFleetState(state);
  event.target.reset();
  await buildAdminTree();
}

async function onWipeAllRecords() {
  if (!confirm('CRITICAL ACTION WARNING: Are you absolutely sure you want to permanently delete EVERY user record from the system database? This operations framework path cannot be undone.')) return;
  const state = await marleyanFleet.loadFleetState();
  state.users = [];
  await marleyanFleet.saveFleetState(state);
  await buildAdminTree();
  alert('Database cleared successfully. All personnel entries have been purged.');
}

let editingUserToken = null;
let originalPerformance = 0;
let originalStrikes = 0;

async function openEditPanel(user) {
  editingUserToken = user.token;

  const editRankSelect = document.getElementById('edit-rank');
  await populateRankSelect(editRankSelect, user.rank);

  const editDivisionSelect = document.getElementById('edit-division');
  const encodedDivision = await getEncodedDivisionValue(user.division, user.rank);
  await populateDivisionSelect(editDivisionSelect, encodedDivision, user.rank);

  document.getElementById('edit-first').value = user.firstName;
  document.getElementById('edit-last').value = user.lastName;
  document.getElementById('edit-roblox').value = user.roblox || '';
  document.getElementById('edit-discord').value = user.discord || '';
  document.getElementById('edit-callsign').value = user.role;
  document.getElementById('edit-status').value = user.status;
  document.getElementById('edit-notes').value = user.notes || '';
  document.getElementById('edit-performance').value = user.performance;
  document.getElementById('edit-strikes').value = user.strikes;

  originalPerformance = user.performance;
  originalStrikes = user.strikes;
  updateEditChangeIndicators();

  const actionWrapper = document.getElementById('promotion-action-wrapper');
  if (actionWrapper) {
    actionWrapper.innerHTML = '';
    const prog = PROMOTION_COSTS[user.rank];
    if (prog) {
      if (prog.cost === 0) {
        actionWrapper.innerHTML = `<p class="promo-help-text">${prog.next} is awarded automatically from ${user.rank} when cleared for advancement.</p>`;
      } else if (user.performance >= prog.cost) {
        const promoBtn = document.createElement('button');
        promoBtn.type = 'button';
        promoBtn.className = 'promotion-button';
        promoBtn.textContent = `Execute Promotion to ${prog.next} (Deduce ${prog.cost} PDP)`;
        promoBtn.addEventListener('click', () => {
          user.performance -= prog.cost;
          user.rank = prog.next;
          document.getElementById('edit-performance').value = user.performance;
          document.getElementById('edit-rank').value = user.rank;
          alert(`Personnel successfully advanced to ${prog.next}. Remaining point balance retained.`);
          openEditPanel(user);
        });
        actionWrapper.appendChild(promoBtn);
      } else {
        actionWrapper.innerHTML = `<p class="promo-help-text">Requires ${prog.cost} PDP to advance to ${prog.next} (Short ${prog.cost - user.performance} PDP)</p>`;
      }
    } else {
      actionWrapper.innerHTML = `<p class="promo-help-text">Top-tier command matrix position reached.</p>`;
    }
  }

  const rolesGroup = document.getElementById('edit-roles-group');
  rolesGroup.innerHTML = '';
  SPECIALIZED_ROLES.forEach((role) => {
    const label = document.createElement('label');
    label.className = 'checkbox-label';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = role;
    checkbox.checked = user.certifications.includes(role);
    label.appendChild(checkbox);
    label.appendChild(document.createTextNode(role));
    rolesGroup.appendChild(label);
  });

  const aircraftGroup = document.getElementById('edit-aircraft-group');
  aircraftGroup.innerHTML = '';
  AIRCRAFT_CERTS.forEach((cert) => {
    const label = document.createElement('label');
    label.className = 'checkbox-label';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = cert;
    checkbox.checked = user.certifications.includes(cert);
    label.appendChild(checkbox);
    label.appendChild(document.createTextNode(cert));
    aircraftGroup.appendChild(label);
  });

  document.getElementById('edit-panel').classList.remove('hidden');
}

function closeEditPanel() {
  document.getElementById('edit-panel').classList.add('hidden');
  editingUserToken = null;
}

async function onEditFormSubmit(event) {
  event.preventDefault();
  if (!editingUserToken) return;
  const state = await marleyanFleet.loadFleetState();
  const user = state.users.find((u) => u.token === editingUserToken);
  if (!user) return;

  user.rank = document.getElementById('edit-rank').value;
  user.firstName = document.getElementById('edit-first').value.trim();
  user.lastName = document.getElementById('edit-last').value.trim();
  user.roblox = document.getElementById('edit-roblox').value.trim();
  user.discord = document.getElementById('edit-discord').value.trim();
  user.role = document.getElementById('edit-callsign').value.trim();
  user.status = document.getElementById('edit-status').value;
  user.division = decodeDivisionValue(document.getElementById('edit-division').value);
  user.notes = document.getElementById('edit-notes').value.trim();
  user.performance = parseInt(document.getElementById('edit-performance').value) || 0;
  user.strikes = parseInt(document.getElementById('edit-strikes').value) || 0;

  const certifications = [];
  document.querySelectorAll('#edit-roles-group input[type="checkbox"]:checked').forEach((cb) => certifications.push(cb.value));
  document.querySelectorAll('#edit-aircraft-group input[type="checkbox"]:checked').forEach((cb) => certifications.push(cb.value));
  user.certifications = certifications;

  await marleyanFleet.saveFleetState(state);
  closeEditPanel();
  await buildAdminTree();
}

async function onDeletePersonnel() {
  if (!editingUserToken) return;
  if (!confirm('Are you sure you want to delete this personnel record? This cannot be undone.')) return;
  const state = await marleyanFleet.loadFleetState();
  state.users = state.users.filter((u) => u.token !== editingUserToken);
  await marleyanFleet.saveFleetState(state);
  closeEditPanel();
  await buildAdminTree();
}

/* ==========================================================================
//  AVIATION INFORMATION DYNAMIC SYSTEM
// ========================================================================== */

function parseMarkdownStyles(rawText) {
  if (!rawText) return "";
  let structured = rawText.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  structured = structured.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  structured = structured.replace(/\*(.*?)\*/g, '<em>$1</em>');
  structured = structured.replace(/\[image:\s*(.*?)\]/gi, '<div class="intel-media-frame"><img src="$1" alt="Strategic Information Payload"></div>');
  return structured;
}

async function buildIntelligenceBoard() {
  const grid = document.getElementById('intel-board-grid');
  if (!grid) return;
  grid.innerHTML = '';
  const state = await marleyanFleet.loadFleetState();
  if (!state.customIntelNodes || state.customIntelNodes.length === 0) {
    state.customIntelNodes = [
      { id: "init-node-1", type: "cluster", heading: "Operational Directives", content: "**Secure** system instructions here. Use formatting buttons or copy-paste images.", width: "500", height: "220" }
    ];
    await marleyanFleet.saveFleetState(state);
  }
  state.customIntelNodes.forEach(node => {
    let block;
    if (node.type === "title") {
      block = createIntelTitleElement(node.id, node.heading, node.width || "100%", node.height || "55");
    } else if (node.type === "textarea") {
      block = createIntelTextAreaElement(node.id, node.heading, node.content, node.width || "100%", node.height || "160");
    } else {
      block = createIntelNodeElement(node.id, node.heading, node.content, node.width || "500", node.height || "220");
    }
    grid.appendChild(block);
  });
  initializeIntelDragAndDrop();
}

// ... Rest of your original functions (formatSelection, createIntelNodeElement, fetchAndResizeImage, createIntelTextAreaElement, createIntelTitleElement, createNewCluster, duplicateExistingCluster, createNewTextAreaBox, createNewTitleBar, saveIntelDataState, initializeIntelDragAndDrop, getIntelDragAfterElement)

window.addEventListener('DOMContentLoaded', async () => {
  const editRankSelect = document.getElementById('edit-rank');
  const editDivisionSelect = document.getElementById('edit-division');
  if (editRankSelect && editDivisionSelect) {
    await populateRankSelect(editRankSelect);
    await populateDivisionSelect(editDivisionSelect);
  }

  const performanceInput = document.getElementById('edit-performance');
  const strikesInput = document.getElementById('edit-strikes');
  if (performanceInput) performanceInput.addEventListener('input', updateEditChangeIndicators);
  if (strikesInput) strikesInput.addEventListener('input', updateEditChangeIndicators);

  const newRankSelect = document.getElementById('new-rank');
  const newDivisionSelect = document.getElementById('new-division');
  if (newRankSelect && newDivisionSelect) {
    await populateRankSelect(newRankSelect);
    await populateDivisionSelect(newDivisionSelect);
  }

  const unlockButton = document.getElementById('unlock-button');
  if (unlockButton) unlockButton.addEventListener('click', onUnlockClick);

  const accountForm = document.getElementById('create-account-form');
  if (accountForm) accountForm.addEventListener('submit', onAccountSubmit);

  const editForm = document.getElementById('edit-form');
  if (editForm) editForm.addEventListener('submit', onEditFormSubmit);

  const closeEditBtn = document.getElementById('close-edit');
  if (closeEditBtn) closeEditBtn.addEventListener('click', closeEditPanel);

  const cancelEditBtn = document.getElementById('cancel-edit');
  if (cancelEditBtn) cancelEditBtn.addEventListener('click', closeEditPanel);

  const deletePersonnelBtn = document.getElementById('delete-personnel');
  if (deletePersonnelBtn) deletePersonnelBtn.addEventListener('click', onDeletePersonnel);

  const editBackdrop = document.getElementById('edit-backdrop');
  if (editBackdrop) editBackdrop.addEventListener('click', closeEditPanel);

  const wipeRecordsBtn = document.getElementById('wipe-records-btn');
  if (wipeRecordsBtn) wipeRecordsBtn.addEventListener('click', onWipeAllRecords);

  const addIntelBtn = document.getElementById('add-intel-cluster-btn');
  if (addIntelBtn) addIntelBtn.addEventListener('click', createNewCluster);

  const addTitleBtn = document.getElementById('add-intel-title-btn');
  if (addTitleBtn) addTitleBtn.addEventListener('click', createNewTitleBar);

  document.body.addEventListener('dragover', onBodyDragOver);
});
