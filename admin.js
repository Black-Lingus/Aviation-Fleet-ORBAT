import { marleyanFleet } from './data.js';
let activeDragToken = null;
let activeIntelDragTarget = null;


// Promotion progression cost matrix configuration
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
  'Grenadier',
  'Recon',
  'Anti-Material',
  'Heavy Gunner',
  'Mortarman',
  'Mortarman Spotter',
  'Medic'
];

const AIRCRAFT_CERTS = ['Airship Operation', 'Triplane Operation'];

function populateRankSelect(select, selectedRank = '') {
  const state = marleyanFleet.loadFleetState();
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

function getEncodedDivisionValue(division, rankKey = '') {
  if (!division) return 'FLEET_COMMAND';
  const state = marleyanFleet.loadFleetState();
  const rank = state.ranks.find((r) => r.key === rankKey);
  if (rank && (rank.category === 'OFFICER' || rank.category === 'HIGH-COMMAND')) {
    return `HQ::${division}`;
  }
  return `PERS::${division}`;
}

function populateDivisionSelect(select, selectedValue = '', rankKey = '') {
  const state = marleyanFleet.loadFleetState();
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
    encodedSelection = getEncodedDivisionValue(selectedValue, rankKey);
  }

  if (encodedSelection) {
    select.value = encodedSelection;
  }
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

function buildRankOptions() {
  const rankSelect = document.getElementById('new-rank');
  populateRankSelect(rankSelect);

  const divisionSelect = document.getElementById('new-division');
  populateDivisionSelect(divisionSelect);
}


function buildAdminTree() {
  const container = document.getElementById('admin-tree');
  container.innerHTML = '';
  const state = marleyanFleet.loadFleetState();


  // Filter: Separate active from retired
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
  commandSection.innerHTML = `
    <h3>Fleet Headquarters</h3>
    <p class="subtext">Fleet command structure.</p>
  `;
  state.ranks
    .filter((rank) => rank.category === 'HIGH-COMMAND')
    .forEach((rank) => {
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
    state.ranks
      .filter((rank) => rank.category === 'OFFICER')
      .forEach((rank) => {
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
    state.ranks
      .filter((rank) => rank.category === 'NCO' || rank.category === 'ENLISTED')
      .forEach((rank) => {
        const list = grouped[`${division}||${rank.key}`] || [];
        if (list.length > 0) {
          const block = createAdminRankBlock(rank.key, division, list);
          personnelColumn.appendChild(block);
        }
      });
    personnelRow.appendChild(personnelColumn);
  });
  container.appendChild(personnelRow);


  // Footer: Archived and casualty list
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


function onDrop(event) {
  event.preventDefault();
  const zone = event.currentTarget;
  zone.classList.remove('drag-over');
  const token = event.dataTransfer.getData('text/plain');
  if (!token) return;


  const state = marleyanFleet.loadFleetState();
  const user = state.users.find((u) => u.token === token);
  if (!user) return;


  // If dropped into archive zones, update status without changing rank/division
  if (zone.dataset.rank === 'Retired') {
    user.status = 'Retired';
  } else if (zone.dataset.rank === 'KIA') {
    user.status = 'KIA';
  } else {
    user.status = 'Active';
    user.division = zone.dataset.division;
    user.rank = zone.dataset.rank;
  }
 
  marleyanFleet.saveFleetState(state);
  buildAdminTree();
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


function onUnlockClick() {
  const input = document.getElementById('master-key');
  const value = input.value.trim();
  const state = marleyanFleet.loadFleetState();
  if (value === state.masterKey) {
    document.getElementById('login-panel').classList.add('hidden');
    document.getElementById('admin-panel').classList.remove('hidden');
    buildRankOptions();
    buildAdminTree();
    buildIntelligenceBoard();
  } else {
    input.classList.add('error');
    window.setTimeout(() => {
      window.location.href = 'index.html';
    }, 900);
  }
}


function onAccountSubmit(event) {
  event.preventDefault();
  const state = marleyanFleet.loadFleetState();
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
  marleyanFleet.saveFleetState(state);
  event.target.reset();
  buildAdminTree();
}


function onWipeAllRecords() {
  if (!confirm('CRITICAL ACTION WARNING: Are you absolutely sure you want to permanently delete EVERY user record from the system database? This operations framework path cannot be undone.')) {
    return;
  }
  const state = marleyanFleet.loadFleetState();
  state.users = [];
  marleyanFleet.saveFleetState(state);
  buildAdminTree();
  alert('Database cleared successfully. All personnel entries have been purged.');
}


let editingUserToken = null;
let originalPerformance = 0;
let originalStrikes = 0;


function openEditPanel(user) {
  editingUserToken = user.token;
  const state = marleyanFleet.loadFleetState();

  const editRankSelect = document.getElementById('edit-rank');
  populateRankSelect(editRankSelect, user.rank);

  const editDivisionSelect = document.getElementById('edit-division');
  const encodedDivision = getEncodedDivisionValue(user.division, user.rank);
  populateDivisionSelect(editDivisionSelect, encodedDivision, user.rank);

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
          alert(`Personnel successfully advanced to ${prog.next}. Remaining point balance balance retained.`);
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


function onEditFormSubmit(event) {
  event.preventDefault();
  if (!editingUserToken) return;


  const state = marleyanFleet.loadFleetState();
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
  document.querySelectorAll('#edit-roles-group input[type="checkbox"]:checked').forEach((cb) => {
    certifications.push(cb.value);
  });
  document.querySelectorAll('#edit-aircraft-group input[type="checkbox"]:checked').forEach((cb) => {
    certifications.push(cb.value);
  });
  user.certifications = certifications;


  marleyanFleet.saveFleetState(state);
  closeEditPanel();
  buildAdminTree();
}


function onDeletePersonnel() {
  if (!editingUserToken) return;
  if (!confirm('Are you sure you want to delete this personnel record? This cannot be undone.')) return;


  const state = marleyanFleet.loadFleetState();
  state.users = state.users.filter((u) => u.token !== editingUserToken);
  marleyanFleet.saveFleetState(state);
  closeEditPanel();
  buildAdminTree();
}


/* ==========================================================================
   AVIATION INFORMATION DYNAMIC SYSTEM
   ========================================================================== */


function parseMarkdownStyles(rawText) {
  if (!rawText) return "";
  let structured = rawText
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");


  structured = structured.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  structured = structured.replace(/\*(.*?)\*/g, '<em>$1</em>');
  structured = structured.replace(/\[image:\s*(.*?)\]/gi, '<div class="intel-media-frame"><img src="$1" alt="Strategic Information Payload"></div>');


  return structured;
}


function buildIntelligenceBoard() {
  const grid = document.getElementById('intel-board-grid');
  if (!grid) return;
  grid.innerHTML = '';


  const state = marleyanFleet.loadFleetState();
  if (!state.customIntelNodes) {
    state.customIntelNodes = [
      { id: "init-node-1", type: "cluster", heading: "Operational Directives", content: "**Secure** system instructions here. Use formatting buttons or copy-paste images.", width: "500", height: "220" }
    ];
    marleyanFleet.saveFleetState(state);
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


function formatSelection(textarea, wrapBefore, wrapAfter) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const val = textarea.value;
 
  const textBefore = val.substring(0, start);
  const textSelected = val.substring(start, end);
  const textAfter = val.substring(end);
 
  textarea.value = textBefore + wrapBefore + textSelected + wrapAfter + textAfter;
  textarea.focus();
  textarea.setSelectionRange(start + wrapBefore.length, start + wrapBefore.length + textSelected.length);
 
  textarea.dispatchEvent(new Event('input'));
}


function createIntelNodeElement(id, heading, content, width, height) {
  const card = document.createElement('div');
  card.className = 'intel-node intel-cluster-node cluster-node';
  card.draggable = true;
  card.dataset.id = id;
  card.dataset.type = "cluster";

  if (width !== undefined && width !== null) {
    card.style.width = typeof width === 'string' ? width : `${width}px`;
  }
  if (height !== undefined && height !== null) {
    card.style.height = typeof height === 'string' ? height : `${height}px`;
  }

  card.innerHTML = `
    <div class="intel-node-header">
      <input type="text" class="node-heading-input" value="${heading}">
      <div class="intel-node-actions node-toolbar">
        <button type="button" class="tool-bold-btn">B</button>
        <button type="button" class="tool-ital-btn">I</button>
        <button type="button" class="tool-img-btn">IMG</button>
        <button type="button" class="node-clone-btn">CLONE</button>
        <button type="button" class="node-delete-btn">DELETE</button>
      </div>
    </div>
    <div class="node-body">
      <textarea class="node-content-input">${content}</textarea>
      <div class="node-live-preview">
        ${parseMarkdownStyles(content)}
      </div>
    </div>
  `;


  const headingInput = card.querySelector('.node-heading-input');
  const contentInput = card.querySelector('.node-content-input');
  const livePreview = card.querySelector('.node-live-preview');
  const deleteBtn = card.querySelector('.node-delete-btn');
  const cloneBtn = card.querySelector('.node-clone-btn');
 
  const boldBtn = card.querySelector('.tool-bold-btn');
  const italBtn = card.querySelector('.tool-ital-btn');
  const imgBtn = card.querySelector('.tool-img-btn');


  boldBtn.addEventListener('click', () => formatSelection(contentInput, '**', '**'));
  italBtn.addEventListener('click', () => formatSelection(contentInput, '*', '*'));
  imgBtn.addEventListener('click', () => {
    (async () => {
      const url = prompt("Enter asset link path:");
      if (!url) return;
      const resized = await fetchAndResizeImage(url, 1200, 900);
      formatSelection(contentInput, `[image: ${resized}]`, '');
    })();
  });


  contentInput.addEventListener('paste', (e) => {
    const items = (e.clipboardData || e.originalEvent.clipboardData).items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') === 0) {
        const file = items[i].getAsFile();
        const reader = new FileReader();
        reader.onload = async function(event) {
          const dataUrl = event.target.result;
          const resized = await fetchAndResizeImage(dataUrl, 1200, 900);
          formatSelection(contentInput, `[image: ${resized}]`, '');
        };
        reader.readAsDataURL(file);
        e.preventDefault();
      }
    }
  });


  contentInput.addEventListener('input', () => {
    livePreview.innerHTML = parseMarkdownStyles(contentInput.value);
  });


  headingInput.addEventListener('change', () => saveIntelDataState());
  contentInput.addEventListener('change', () => saveIntelDataState());


  // ResizeObserver removed to prevent manual resizing persistence


  cloneBtn.addEventListener('click', () => {
    duplicateExistingCluster(headingInput.value, contentInput.value, card.offsetWidth, card.offsetHeight);
  });


  deleteBtn.addEventListener('click', () => {
    if (confirm(`Are you sure you want to delete the secure cluster "${headingInput.value || 'Untitled'}"?`)) {
      if (card._intelResizeObserver) card._intelResizeObserver.disconnect();
      card.remove();
      saveIntelDataState();
    }
  });


  return card;
}


// Attempts to load an image (dataURL or remote URL), resize it to fit within maxW/maxH,
// and returns a dataURL. If fetching or canvas export fails (CORS), resolves to original src.
async function fetchAndResizeImage(src, maxW = 1200, maxH = 900) {
  return new Promise(async (resolve) => {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      const loadImage = (url) => new Promise((res, rej) => {
        img.onload = () => res();
        img.onerror = () => rej(new Error('Image load error'));
        img.src = url;
      });

      // If src is not a data URL, try to fetch it as a blob first (may fail due to CORS)
      if (!src.startsWith('data:')) {
        try {
          const fetched = await fetch(src, { mode: 'cors' });
          if (!fetched.ok) throw new Error('fetch-failed');
          const blob = await fetched.blob();
          const objectUrl = URL.createObjectURL(blob);
          await loadImage(objectUrl);
          URL.revokeObjectURL(objectUrl);
        } catch (err) {
          // If fetching fails, attempt to load the remote URL directly (may taint canvas)
          try {
            await loadImage(src);
          } catch (err2) {
            return resolve(src);
          }
        }
      } else {
        // data URL
        await loadImage(src);
      }

      // compute scaled dimensions
      const ratio = Math.min(maxW / img.width, maxH / img.height, 1);
      const w = Math.round(img.width * ratio);
      const h = Math.round(img.height * ratio);

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);

      try {
        const out = canvas.toDataURL('image/jpeg', 0.85);
        resolve(out);
      } catch (err) {
        // toDataURL failed (likely CORS); fallback to original src
        resolve(src);
      }
    } catch (err) {
      return resolve(src);
    }
  });
}


function createIntelTextAreaElement(id, heading, content, width, height) {
  const box = document.createElement('div');
  box.className = 'intel-node intel-cluster-node text-box-node';
  box.draggable = true;
  box.dataset.id = id;
  box.dataset.type = "textarea";

  const cssWidth = width.toString().includes('%') || width.toString().includes('px') ? width : `${width}px`;
  const cssHeight = height.toString().includes('%') || height.toString().includes('px') ? height : `${height}px`;

  box.style.width = cssWidth;
  box.style.height = cssHeight;

  box.innerHTML = `
    <div class="intel-node-header">
      <input type="text" class="box-heading-input" value="${heading}">
      <div class="intel-node-actions">
        <button type="button" class="box-delete-btn">DELETE</button>
      </div>
    </div>
    <textarea class="box-content-input">${content}</textarea>
  `;


  const titleInput = box.querySelector('.box-heading-input');
  const textInput = box.querySelector('.box-content-input');
  const deleteBtn = box.querySelector('.box-delete-btn');


  titleInput.addEventListener('change', () => saveIntelDataState());
  textInput.addEventListener('change', () => saveIntelDataState());


  // ResizeObserver removed to prevent manual resizing persistence


  deleteBtn.addEventListener('click', () => {
    if (confirm(`Are you sure you want to remove this text box module: "${titleInput.value || 'Untitled'}"?`)) {
      if (box._intelResizeObserver) box._intelResizeObserver.disconnect();
      box.remove();
      saveIntelDataState();
    }
  });


  return box;
}


function createIntelTitleElement(id, heading, width, height) {
  const bar = document.createElement('div');
  bar.className = 'intel-node intel-cluster-node title-node';
  bar.draggable = true;
  bar.dataset.id = id;
  bar.dataset.type = "title";

  const cssWidth = width.toString().includes('%') || width.toString().includes('px') ? width : `${width}px`;
  const cssHeight = height.toString().includes('%') || height.toString().includes('px') ? height : `${height}px`;

  if (width !== undefined && width !== null) {
    bar.style.width = cssWidth;
  }
  if (height !== undefined && height !== null) {
    bar.style.height = cssHeight;
  }

  bar.innerHTML = `
    <div class="intel-node-header">
      <input type="text" class="bar-title-input" value="${heading}" placeholder="ENTER STANDALONE TITLE HEADING...">
      <div class="intel-node-actions">
        <button type="button" class="bar-delete-btn">DELETE</button>
      </div>
    </div>
  `;


  const titleInput = bar.querySelector('.bar-title-input');
  const deleteBtn = bar.querySelector('.bar-delete-btn');


  titleInput.addEventListener('change', () => saveIntelDataState());


  // ResizeObserver removed to prevent manual resizing persistence


  deleteBtn.addEventListener('click', () => {
    if (confirm(`Are you sure you want to remove this title heading: "${titleInput.value || 'Untitled'}"?`)) {
      if (bar._intelResizeObserver) bar._intelResizeObserver.disconnect();
      bar.remove();
      saveIntelDataState();
    }
  });


  return bar;
}


function createNewCluster() {
  const grid = document.getElementById('intel-board-grid');
  if (!grid) return;
  const newId = "node_" + Date.now();
  const block = createIntelNodeElement(newId, "NEW SECURE CLUSTER", "Edit **bold text**, *italics*, or add image.", "500", "220");
  grid.appendChild(block);
  saveIntelDataState();
  initializeIntelDragAndDrop();
}


function duplicateExistingCluster(heading, content, currentWidth, currentHeight) {
  const grid = document.getElementById('intel-board-grid');
  if (!grid) return;
  const duplicateId = "node_dup_" + Date.now();
  const block = createIntelNodeElement(duplicateId, `${heading} (COPY)`, content, currentWidth, currentHeight);
  grid.appendChild(block);
  saveIntelDataState();
  initializeIntelDragAndDrop();
}


function createNewTextAreaBox() {
  const grid = document.getElementById('intel-board-grid');
  if (!grid) return;
  const newId = "text_" + Date.now();
  const block = createIntelTextAreaElement(newId, "INFORMATION LOG FIELD", "Enter clear strategic reporting values inside this workspace module.", "100%", "160");
  grid.appendChild(block);
  saveIntelDataState();
  initializeIntelDragAndDrop();
}


function createNewTitleBar() {
  const grid = document.getElementById('intel-board-grid');
  if (!grid) return;
  const newId = "title_" + Date.now();
  const block = createIntelTitleElement(newId, "SECTION CATEGORY CLASSIFICATION", "100%", "55");
  grid.appendChild(block);
  saveIntelDataState();
  initializeIntelDragAndDrop();
}


function saveIntelDataState() {
  const grid = document.getElementById('intel-board-grid');
  if (!grid) return;


  const cards = grid.querySelectorAll('.intel-cluster-node');
  const updatedNodes = [];


  cards.forEach(card => {
    const id = card.dataset.id;
    const type = card.dataset.type;
   
    if (type === "title") {
      const heading = card.querySelector('.bar-title-input').value;
      updatedNodes.push({ id, type, heading, width: "100%", height: card.offsetHeight });
    } else if (type === "textarea") {
      const heading = card.querySelector('.box-heading-input').value;
      const content = card.querySelector('.box-content-input').value;
      updatedNodes.push({ id, type, heading, content, width: "100%", height: card.offsetHeight });
    } else {
      const heading = card.querySelector('.node-heading-input').value;
      const content = card.querySelector('.node-content-input').value;
      updatedNodes.push({ id, type, heading, content, width: card.offsetWidth, height: card.offsetHeight });
    }
  });


  const state = marleyanFleet.loadFleetState();
  state.customIntelNodes = updatedNodes;
  marleyanFleet.saveFleetState(state);
}


function initializeIntelDragAndDrop() {
  const cards = document.querySelectorAll('#intel-board-grid .intel-cluster-node');
  const grid = document.getElementById('intel-board-grid');


  cards.forEach(card => {
    card.addEventListener('dragstart', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'BUTTON') {
        e.preventDefault();
        return;
      }
      activeIntelDragTarget = card;
      card.style.opacity = "0.4";
    });


    card.addEventListener('dragend', () => {
      if (activeIntelDragTarget) {
        activeIntelDragTarget.style.opacity = "1";
        activeIntelDragTarget = null;
        saveIntelDataState();
      }
    });

    // Observe size changes for admin grid nodes so admin resizing persists
    if (window.ResizeObserver) {
      if (card._intelResizeObserver) card._intelResizeObserver.disconnect();
      let resizeTimer;
      const obs = new ResizeObserver(() => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => saveIntelDataState(), 400);
      });
      obs.observe(card);
      card._intelResizeObserver = obs;
    }
  });


  grid.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (!activeIntelDragTarget) return;


    const afterElement = getIntelDragAfterElement(grid, e.clientX, e.clientY);
    if (afterElement == null) {
      grid.appendChild(activeIntelDragTarget);
    } else {
      grid.insertBefore(activeIntelDragTarget, afterElement);
    }
  });
}


function getIntelDragAfterElement(gridContainer, x, y) {
  const referenceCards = [...gridContainer.querySelectorAll('.intel-cluster-node:not(.dragging)')];


  return referenceCards.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) {
      return { offset: offset, element: child };
    } else {
      return closest;
    }
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}


window.addEventListener('DOMContentLoaded', () => {
  const state = marleyanFleet.loadFleetState();
  const editRankSelect = document.getElementById('edit-rank');
  const editDivisionSelect = document.getElementById('edit-division');

  if (editRankSelect && editDivisionSelect) {
    populateRankSelect(editRankSelect);
    populateDivisionSelect(editDivisionSelect);
  }

  const performanceInput = document.getElementById('edit-performance');
  const strikesInput = document.getElementById('edit-strikes');
  if (performanceInput) performanceInput.addEventListener('input', updateEditChangeIndicators);
  if (strikesInput) strikesInput.addEventListener('input', updateEditChangeIndicators);

  const newRankSelect = document.getElementById('new-rank');
  const newDivisionSelect = document.getElementById('new-division');
  if (newRankSelect && newDivisionSelect) {
    populateRankSelect(newRankSelect);
    populateDivisionSelect(newDivisionSelect);
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
  if (wipeRecordsBtn) {
    wipeRecordsBtn.addEventListener('click', onWipeAllRecords);
  }


  const addIntelBtn = document.getElementById('add-intel-cluster-btn');
  if (addIntelBtn) {
    addIntelBtn.addEventListener('click', createNewCluster);
  }


  const addTitleBtn = document.getElementById('add-intel-title-btn');
  if (addTitleBtn) {
    addTitleBtn.addEventListener('click', createNewTitleBar);
  }


  document.body.addEventListener('dragover', onBodyDragOver);
});



