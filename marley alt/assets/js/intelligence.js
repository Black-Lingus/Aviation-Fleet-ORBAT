/* ==========================================================================
   AVIATION INFORMATION ENGINE
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


function renderIntelligence() {
  const state = marleyanFleet.loadFleetState();
  const summary = document.getElementById('summary-metrics');
  const alerts = document.getElementById('alerts-panel');
  const customCanvas = document.getElementById('public-intel-display-canvas');


  if (summary) summary.innerHTML = '';
  if (alerts) alerts.innerHTML = '';
  if (customCanvas) customCanvas.innerHTML = '';


  /* ------------------------------------------------------------------------
     PART A: HARD DATA ANALYTICS CORNER
     ------------------------------------------------------------------------ */
  if (summary && alerts) {
    const rankCounts = state.ranks.reduce((count, rank) => {
      count[rank.key] = state.users.filter((u) => u.rank === rank.key).length;
      return count;
    }, {});


    const totalUsers = state.users.length;
    const activeCount = state.users.filter((u) => u.status === 'Active').length;
    const leaveCount = state.users.filter((u) => u.status === 'On Leave').length;


    const metrics = [
      { title: 'Total Personnel', value: totalUsers },
      { title: 'Active Status', value: activeCount },
    ];


    metrics.forEach((metric) => {
      const card = document.createElement('div');
      card.className = 'metric-card';
      card.innerHTML = `<h3>${metric.title}</h3><p>${metric.value}</p>`;
      summary.appendChild(card);
    });


    const warningCard = document.createElement('div');
    warningCard.className = 'alert-card warning-card';
    warningCard.innerHTML = `
      <h3>Status Alert</h3>
      <p>${leaveCount} personnel currently on leave and ${state.users.filter((u) => u.status === 'KIA').length} confirmed KIA.</p>
    `;
    alerts.appendChild(warningCard);


    const breakdown = document.createElement('div');
    breakdown.className = 'alert-card breakdown-card';
    breakdown.innerHTML = `
      <h3>Rank Breakdown</h3>
      <ul>${state.ranks
        .filter((rank) => rankCounts[rank.key] > 0)
        .map((rank) => `<li>${rank.key}: ${rankCounts[rank.key]}</li>`)
        .join('')}</ul>
    `;
    alerts.appendChild(breakdown);
  }


  /* ------------------------------------------------------------------------
     PART B: CUSTOM DYNAMIC AVIATION INFORMATION SYNCHRONIZER
     ------------------------------------------------------------------------ */
  if (customCanvas) {
    if (!state.customIntelNodes || state.customIntelNodes.length === 0) {
      customCanvas.innerHTML = `<div class="empty-message">No Active Aviation Information and Doctrines available.</div>`;
      return;
    }


    state.customIntelNodes.forEach(node => {
      if (node.type === "title") {
        const titleBarEl = document.createElement('div');
        const heightVal = node.height ? `${node.height}px` : "45px";
        titleBarEl.className = 'intel-cluster-node title-node';
        titleBarEl.style.minHeight = heightVal;
        titleBarEl.innerHTML = `<h2 class="intel-title-heading">${node.heading || 'CLASSIFIED DIRECTIVE'}</h2>`;
        customCanvas.appendChild(titleBarEl);


      } else if (node.type === "textarea") {
        const textBlockEl = document.createElement('div');
        const heightVal = node.height ? `${node.height}px` : "auto";
        textBlockEl.className = 'intel-cluster-node text-box-node';
        textBlockEl.style.minHeight = heightVal;
        textBlockEl.innerHTML = `
          <h3 class="text-box-heading">${node.heading || 'FIELD NOTATION LOG'}</h3>
          <div class="text-box-content">${node.content || ''}</div>
        `;
        customCanvas.appendChild(textBlockEl);

      } else {
        const clusterEl = document.createElement('div');
        const widthVal = node.width ? `${node.width}px` : "calc(50% - 10px)";
        const heightVal = node.height ? `${node.height}px` : "auto";


        clusterEl.className = 'intel-cluster-node intel-card-node';
        clusterEl.style.width = widthVal;
        clusterEl.style.height = heightVal;
        clusterEl.innerHTML = `
          <h3 class="intel-card-heading">${node.heading || 'INFORMATION RECORD'}</h3>
          <div class="intel-card-content">
            ${parseMarkdownStyles(node.content)}
          </div>
        `;
        customCanvas.appendChild(clusterEl);
      }
    });
  }
}


window.addEventListener('DOMContentLoaded', renderIntelligence);



