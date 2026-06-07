function parseQueryString() {
  return new URLSearchParams(window.location.search);
}


function createDetailRow(label, value) {
  const row = document.createElement('div');
  row.className = 'data-row';
  row.innerHTML = `<span>${label}</span><span>${value}</span>`;
  return row;
}


function createPill(text, active = true) {
  const pill = document.createElement('div');
  pill.className = `pill-tag ${active ? 'checked' : ''}`;
  pill.innerHTML = `<span class="pill-icon"></span>${text}`;
  return pill;
}


function renderProfile() {
  const query = parseQueryString();
  const token = query.get('user');
  const root = document.getElementById('dossier-root');
  if (!root) return;
  if (!token) {
    root.innerHTML = '<div class="content-panel"><h2>Unable to load personnel record</h2><p>No user token provided.</p></div>';
    return;
  }
  const person = marleyanFleet.getUserByToken(token);
  if (!person) {
    root.innerHTML = '<div class="content-panel"><h2>Personnel record not found</h2><p>The requested dossier token is invalid or expired.</p></div>';
    return;
  }

  // Ensure defaults so rendering is safe
  person.certifications = person.certifications || [];
  person.performance = typeof person.performance === 'number' ? person.performance : 0;
  person.strikes = typeof person.strikes === 'number' ? person.strikes : 0;
  person.notes = person.notes || '';
  person.role = person.role || '';
  person.discord = person.discord || '';
  person.roblox = person.roblox || '';


  const cardA = document.createElement('section');
  cardA.className = 'profile-card';
  cardA.innerHTML = `
    <h3>Personnel Detail</h3>
    <div class="data-grid"></div>
  `;
  const gridA = cardA.querySelector('.data-grid');
  gridA.appendChild(createDetailRow('Rank', person.rank));
  gridA.appendChild(createDetailRow('First Name', person.firstName));
  gridA.appendChild(createDetailRow('Last Name', person.lastName));
  gridA.appendChild(createDetailRow('Callsign', person.role || 'None'));
  gridA.appendChild(createDetailRow('Discord', person.discord || 'None'));
  gridA.appendChild(createDetailRow('Roblox ID', person.roblox || 'None'));


  const cardB = document.createElement('section');
  cardB.className = 'profile-card';
  cardB.innerHTML = `
    <h3>Fleet Certification Card</h3>
    <div class="status-banner status-${person.status.replace(/\s/g, '-')}">
      <span class="status-dot"></span>
      <div>
        <strong>${person.rank} ${person.firstName} ${person.lastName}</strong>
        <p>${person.role ? person.role : 'No Callsign'}${person.role && person.discord ? ' · ' : ''}${person.discord}</p>
      </div>
      <span>Status: ${person.status}</span>
    </div>
  `;


  const cardC = document.createElement('section');
  cardC.className = 'profile-card';
  cardC.innerHTML = `
    <h3>Point Tracker Ledger</h3>
    <div class="data-grid"></div>
  `;
  const gridC = cardC.querySelector('.data-grid');
  gridC.appendChild(createDetailRow('Performance Points (PDP)', `${person.performance}`));
  gridC.appendChild(createDetailRow('Strikes', `${person.strikes}`));
  gridC.appendChild(createDetailRow('Notes', person.notes || 'No current notes'));


  const cardD = document.createElement('section');
  cardD.className = 'profile-card';
  cardD.innerHTML = `
    <h3>Qualifications Ledger</h3>
    <div class="profile-qualifications-grid"></div>
  `;


  const specializedRoles = ['Grenadier', 'Recon', 'Anti-Material', 'Heavy Gunner', 'Mortarman', 'Mortarman Spotter', 'Medic'];
  const aircraftCerts = ['Airship Operation', 'Triplane Operation'];

  const ledgerWrapper = cardD.querySelector('div');

  const roleItems = specializedRoles.filter((role) => person.certifications.includes(role));
  if (roleItems.length > 0) {
    const block = document.createElement('div');
    block.className = 'profile-section-block';
    block.innerHTML = `
      <h4 class="profile-section-heading">Assigned Specialized Role</h4>
      <div class="pill-list"></div>
    `;
    const pillList = block.querySelector('.pill-list');
    roleItems.forEach((role) => pillList.appendChild(createPill(role, true)));
    ledgerWrapper.appendChild(block);
  }

  const aircraftItems = aircraftCerts.filter((cert) => person.certifications.includes(cert));
  if (aircraftItems.length > 0) {
    const block = document.createElement('div');
    block.className = 'profile-section-block';
    block.innerHTML = `
      <h4 class="profile-section-heading">Aircraft Certifications</h4>
      <div class="pill-list"></div>
    `;
    const pillList = block.querySelector('.pill-list');
    aircraftItems.forEach((cert) => pillList.appendChild(createPill(cert, true)));
    ledgerWrapper.appendChild(block);
  }

  const otherCerts = person.certifications.filter((cert) => !specializedRoles.includes(cert) && !aircraftCerts.includes(cert));
  if (otherCerts.length > 0) {
    const block = document.createElement('div');
    block.className = 'profile-section-block';
    block.innerHTML = `
      <h4 class="profile-section-heading">Additional Certifications</h4>
      <div class="pill-list"></div>
    `;
    const pillList = block.querySelector('.pill-list');
    otherCerts.forEach((cert) => pillList.appendChild(createPill(cert, true)));
    ledgerWrapper.appendChild(block);
  }

  if (person.certifications.length > 0) {
    root.append(cardA, cardB, cardC, cardD);
  } else {
    root.append(cardA, cardB, cardC);
  }
}


window.addEventListener('DOMContentLoaded', renderProfile);





