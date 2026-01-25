// ============================================
// Organization Chart Application - Version 2
// Premium Edition with Enhanced Interactions
// ============================================

// State Management
const state = {
  zoom: 1,
  minZoom: 0.25,
  maxZoom: 1.5,
  zoomStep: 0.1,
  isPanning: false,
  startX: 0,
  startY: 0,
  scrollLeft: 0,
  scrollTop: 0,
  expandedNodes: new Set(),
  animationIndex: 0,
  currentView: 'department', // department view only
  listExpandedNodes: new Set()
};

// DOM Element Cache
const elements = {
  orgChart: null,
  orgChartWrapper: null,
  searchInput: null,
  searchResults: null,
  modal: null,
  zoomDisplay: null,
  miniMap: null,
  miniMapViewport: null
};

// ============================================
// Initialization
// ============================================

function init() {
  // Cache DOM elements
  elements.orgChart = document.getElementById('org-chart');
  elements.orgChartWrapper = document.getElementById('org-chart-wrapper');
  elements.searchInput = document.getElementById('search-input');
  elements.searchResults = document.getElementById('search-results');
  elements.modal = document.getElementById('employee-modal');
  elements.zoomDisplay = document.getElementById('zoom-level');
  elements.miniMap = document.getElementById('mini-map');
  elements.miniMapViewport = document.getElementById('mini-map-viewport');

  // Render the org chart (use currentOrgData which may be loaded from localStorage)
  renderOrgChart(currentOrgData || orgData);

  // Initialize features
  initPanning();
  initEventListeners();
  updateMiniMap();

  // Log success
  console.log('%c Organization Chart v2 Initialized ', 'background: #d4af37; color: #0a0a0b; font-weight: bold; padding: 4px 8px; border-radius: 4px;');
  console.log(`Total employees: ${allEmployees.length}`);
}

// ============================================
// Rendering Functions
// ============================================

function getInitials(name) {
  if (!name || name === 'TBC') return '?';
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
}

function getAvatarGradient(name) {
  const gradients = [
    ['#667eea', '#764ba2'],  // Purple
    ['#f093fb', '#f5576c'],  // Pink
    ['#4facfe', '#00f2fe'],  // Cyan
    ['#43e97b', '#38f9d7'],  // Green
    ['#fa709a', '#fee140'],  // Coral
    ['#a18cd1', '#fbc2eb'],  // Lavender
    ['#ff9a9e', '#fecfef'],  // Rose
    ['#d4af37', '#f4d03f'],  // Gold
    ['#a1c4fd', '#c2e9fb'],  // Sky
    ['#667eea', '#38f9d7'],  // Teal-Purple
    ['#e6b8a2', '#f4a7b9'],  // Peach
    ['#9b59b6', '#3498db'],  // Purple-Blue
  ];

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  return gradients[Math.abs(hash) % gradients.length];
}

function createNodeCard(node, animationDelay = 0) {
  const card = document.createElement('div');
  card.className = 'org-node-card';
  card.dataset.id = node.id;
  card.style.animationDelay = `${animationDelay * 40}ms`;

  // Set department color
  const deptColor = departmentColors[node.department] || '#d4af37';
  card.style.setProperty('--dept-color', deptColor);

  // Mark if has children
  if (node.children && node.children.length > 0) {
    card.classList.add('has-children');
  }

  // Create avatar
  const avatar = document.createElement('div');
  avatar.className = 'card-avatar';
  const [color1, color2] = getAvatarGradient(node.name);
  avatar.style.background = `linear-gradient(135deg, ${color1} 0%, ${color2} 100%)`;

  // Try to load avatar image, fall back to initials
  if (node.avatar) {
    const img = document.createElement('img');
    img.src = node.avatar;
    img.alt = node.name;
    img.onerror = () => {
      img.remove();
      avatar.textContent = getInitials(node.name);
    };
    avatar.appendChild(img);
  } else {
    avatar.textContent = getInitials(node.name);
  }

  // Create name
  const name = document.createElement('div');
  name.className = 'card-name';
  name.textContent = node.name;

  // Create title
  const title = document.createElement('div');
  title.className = 'card-title';
  title.textContent = node.title;

  card.appendChild(avatar);
  card.appendChild(name);
  card.appendChild(title);

  // Add team badge if applicable
  if (node.isTeam) {
    const badge = document.createElement('div');
    badge.className = 'card-team-badge';
    badge.innerHTML = `<span>${node.teamSize}</span> team members`;
    card.appendChild(badge);
  }

  // Click handler for modal
  card.addEventListener('click', (e) => {
    if (!e.target.classList.contains('toggle-children')) {
      showEmployeeModal(node);
    }
  });

  // Add subtle hover sound effect (optional, disabled by default)
  // card.addEventListener('mouseenter', () => playHoverSound());

  return card;
}

function createOrgNode(node, animationIndex = { value: 0 }) {
  const nodeEl = document.createElement('div');
  nodeEl.className = 'org-node';
  nodeEl.dataset.department = node.department;

  // Create the card
  const card = createNodeCard(node, animationIndex.value++);
  nodeEl.appendChild(card);

  // Handle children
  if (node.children && node.children.length > 0) {
    // Toggle button
    const toggle = document.createElement('button');
    toggle.className = 'toggle-children expanded';
    toggle.setAttribute('aria-label', 'Toggle subordinates');
    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleChildren(nodeEl, node.id);
    });
    card.appendChild(toggle);

    // Children container
    const childrenContainer = document.createElement('div');
    childrenContainer.className = 'org-children';
    childrenContainer.id = `children-${node.id}`;

    // Recursively create child nodes
    node.children.forEach(child => {
      childrenContainer.appendChild(createOrgNode(child, animationIndex));
    });

    nodeEl.appendChild(childrenContainer);
    state.expandedNodes.add(node.id);

    // Update connector line after render
    requestAnimationFrame(() => {
      setTimeout(() => updateConnectorLine(childrenContainer), 50);
    });
  }

  return nodeEl;
}

function updateConnectorLine(container) {
  const children = container.querySelectorAll(':scope > .org-node');
  if (children.length > 1) {
    const first = children[0].querySelector('.org-node-card');
    const last = children[children.length - 1].querySelector('.org-node-card');

    if (first && last) {
      const firstRect = first.getBoundingClientRect();
      const lastRect = last.getBoundingClientRect();
      const width = lastRect.left + lastRect.width / 2 - (firstRect.left + firstRect.width / 2);
      container.style.setProperty('--line-width', `${Math.abs(width)}px`);
    }
  }
}

function renderOrgChart(data) {
  renderDepartmentView(data);
}

function renderTreeView(data) {
  elements.orgChart.innerHTML = '';
  elements.orgChart.className = 'org-chart view-tree';
  state.animationIndex = 0;
  const tree = createOrgNode(data);
  elements.orgChart.appendChild(tree);

  // Update all connector lines after animations complete
  setTimeout(() => {
    document.querySelectorAll('.org-children').forEach(updateConnectorLine);
  }, 500);
}

// ============================================
// LIST VIEW RENDERER
// ============================================

function renderListView(data) {
  elements.orgChart.innerHTML = '';
  elements.orgChart.className = 'org-chart view-list';
  state.listExpandedNodes = new Set();

  const container = document.createElement('div');
  container.className = 'list-view-container';

  // Recursively create list items
  const createListItems = (node, depth = 0, animIndex = { value: 0 }) => {
    const itemWrapper = document.createElement('div');
    itemWrapper.className = 'list-item-wrapper';

    const item = document.createElement('div');
    item.className = 'list-item';
    item.dataset.id = node.id;
    item.style.animationDelay = `${animIndex.value++ * 30}ms`;

    // Add indentation
    if (depth > 0) {
      const indent = document.createElement('div');
      indent.className = 'list-indent';
      for (let i = 0; i < depth; i++) {
        const line = document.createElement('div');
        line.className = 'list-indent-line';
        indent.appendChild(line);
      }
      item.appendChild(indent);
    }

    // Avatar
    const avatar = document.createElement('div');
    avatar.className = 'list-avatar';
    const [color1, color2] = getAvatarGradient(node.name);
    avatar.style.background = `linear-gradient(135deg, ${color1} 0%, ${color2} 100%)`;
    if (node.avatar) {
      const img = document.createElement('img');
      img.src = node.avatar;
      img.alt = node.name;
      img.onerror = () => {
        img.remove();
        avatar.textContent = getInitials(node.name);
      };
      avatar.appendChild(img);
    } else {
      avatar.textContent = getInitials(node.name);
    }
    item.appendChild(avatar);

    // Info
    const info = document.createElement('div');
    info.className = 'list-info';
    info.innerHTML = `
      <div class="list-name">${node.name}</div>
      <div class="list-title">${node.title}</div>
    `;
    item.appendChild(info);

    // Department badge
    const badge = document.createElement('div');
    badge.className = 'list-dept-badge';
    badge.style.background = `${departmentColors[node.department] || '#d4af37'}20`;
    badge.style.borderColor = departmentColors[node.department] || '#d4af37';
    badge.style.color = departmentColors[node.department] || '#d4af37';
    badge.textContent = node.department;
    item.appendChild(badge);

    // Toggle button if has children
    if (node.children && node.children.length > 0) {
      const toggle = document.createElement('button');
      toggle.className = 'list-toggle expanded';
      toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleListChildren(node.id);
      });
      item.appendChild(toggle);
      state.listExpandedNodes.add(node.id);
    }

    // Click handler
    item.addEventListener('click', () => showEmployeeModal(node));

    itemWrapper.appendChild(item);

    // Children container
    if (node.children && node.children.length > 0) {
      const childrenContainer = document.createElement('div');
      childrenContainer.className = 'list-children';
      childrenContainer.id = `list-children-${node.id}`;

      node.children.forEach(child => {
        childrenContainer.appendChild(createListItems(child, depth + 1, animIndex));
      });

      itemWrapper.appendChild(childrenContainer);
    }

    return itemWrapper;
  };

  container.appendChild(createListItems(data));
  elements.orgChart.appendChild(container);
}

function toggleListChildren(nodeId) {
  const container = document.getElementById(`list-children-${nodeId}`);
  const toggle = document.querySelector(`.list-item[data-id="${nodeId}"] .list-toggle`);

  if (!container || !toggle) return;

  const isExpanded = state.listExpandedNodes.has(nodeId);

  if (isExpanded) {
    container.classList.add('collapsed');
    toggle.classList.remove('expanded');
    toggle.classList.add('collapsed');
    state.listExpandedNodes.delete(nodeId);
  } else {
    container.classList.remove('collapsed');
    toggle.classList.remove('collapsed');
    toggle.classList.add('expanded');
    state.listExpandedNodes.add(nodeId);
  }
}

function expandAllList() {
  document.querySelectorAll('.list-children.collapsed').forEach(container => {
    container.classList.remove('collapsed');
    const nodeId = container.id.replace('list-children-', '');
    const toggle = document.querySelector(`.list-item[data-id="${nodeId}"] .list-toggle`);
    if (toggle) {
      toggle.classList.remove('collapsed');
      toggle.classList.add('expanded');
    }
    state.listExpandedNodes.add(nodeId);
  });
}

function collapseAllList() {
  document.querySelectorAll('.list-children:not(.collapsed)').forEach(container => {
    container.classList.add('collapsed');
    const nodeId = container.id.replace('list-children-', '');
    const toggle = document.querySelector(`.list-item[data-id="${nodeId}"] .list-toggle`);
    if (toggle) {
      toggle.classList.remove('expanded');
      toggle.classList.add('collapsed');
    }
    state.listExpandedNodes.delete(nodeId);
  });
}

// ============================================
// DEPARTMENT VIEW RENDERER
// ============================================

function renderDepartmentView(data) {
  elements.orgChart.innerHTML = '';
  elements.orgChart.className = 'org-chart view-department';

  // Group employees by department
  const departments = {};
  const allManagerIds = new Set(); // Track who is shown as a manager

  // First pass: collect all people who should be shown as managers
  const collectManagers = (node) => {
    const dept = node.department;
    if (!departments[dept]) {
      departments[dept] = {
        name: dept,
        color: departmentColors[dept] || '#d4af37',
        managers: [],
        members: []
      };
    }

    const hasReports = node.children && node.children.length > 0;
    const forceManager = node.showAsManager === true;

    // Show as manager if has reports OR has showAsManager flag
    if (hasReports || forceManager) {
      departments[dept].managers.push({
        ...node,
        directReports: (node.children || []).filter(c => c.department === dept)
      });
      allManagerIds.add(node.id);
    }

    // Recursively process children
    if (node.children) {
      node.children.forEach(child => collectManagers(child));
    }
  };

  // Second pass: collect non-manager members
  const collectMembers = (node) => {
    const dept = node.department;

    // If not a manager, add as member
    if (!allManagerIds.has(node.id)) {
      if (!departments[dept]) {
        departments[dept] = {
          name: dept,
          color: departmentColors[dept] || '#d4af37',
          managers: [],
          members: []
        };
      }
      departments[dept].members.push(node);
    }

    // Recursively process children
    if (node.children) {
      node.children.forEach(child => collectMembers(child));
    }
  };

  collectManagers(data);
  collectMembers(data);

  const container = document.createElement('div');
  container.className = 'dept-view-container';

  // Create department cards
  let cardIndex = 0;
  Object.values(departments).forEach(dept => {
    const card = document.createElement('div');
    card.className = 'dept-card';
    card.style.animationDelay = `${cardIndex++ * 100}ms`;

    // Count total people in department
    const totalPeople = dept.managers.length + dept.members.length;

    // Header
    const header = document.createElement('div');
    header.className = 'dept-card-header';
    header.innerHTML = `
      <div class="dept-color-bar" style="background: ${dept.color}"></div>
      <div>
        <div class="dept-card-title">${dept.name}</div>
        <div class="dept-card-count">${totalPeople} people</div>
      </div>
    `;
    card.appendChild(header);

    // Body
    const body = document.createElement('div');
    body.className = 'dept-card-body';

    // Track shown members to determine who goes in "Other Team Members"
    const shownMemberIds = new Set();

    // Show managers (each with their direct reports)
    dept.managers.forEach(manager => {
      const managerEl = document.createElement('div');
      managerEl.className = 'dept-manager';

      const [color1, color2] = getAvatarGradient(manager.name);
      const avatarContent = manager.avatar
        ? `<img src="${manager.avatar}" alt="${manager.name}" onerror="this.remove(); this.parentElement.textContent='${getInitials(manager.name)}'">`
        : getInitials(manager.name);

      // Count all direct reports for the badge
      const reportCount = manager.directReports.length;

      managerEl.dataset.id = manager.id;
      const showBadge = reportCount > 0 && !manager.teamInOther;
      managerEl.innerHTML = `
        <div class="dept-manager-avatar" style="background: linear-gradient(135deg, ${color1} 0%, ${color2} 100%)">
          ${avatarContent}
        </div>
        <div class="dept-manager-info">
          <div class="dept-manager-name">${manager.name}</div>
          <div class="dept-manager-title">${manager.title}</div>
        </div>
        ${showBadge ? `<div class="dept-manager-badge">${reportCount} reports</div>` : ''}
      `;

      managerEl.addEventListener('click', () => showEmployeeModal(manager));
      body.appendChild(managerEl);

      // If teamInOther flag is set, don't show team members here (they go to "Other Team Members")
      const showTeamInline = !manager.teamInOther;

      // Show ALL direct reports (including those who are also managers) if showTeamInline
      if (manager.directReports.length > 0 && showTeamInline) {
        const teamSection = document.createElement('div');
        teamSection.innerHTML = `<div class="dept-team-label">Team Members</div>`;

        const teamGrid = document.createElement('div');
        teamGrid.className = 'dept-team-grid';

        manager.directReports.forEach(member => {
          shownMemberIds.add(member.id); // Track that we've shown this person

          const memberEl = document.createElement('div');
          memberEl.className = 'dept-team-member';
          memberEl.dataset.id = member.id;

          const [mc1, mc2] = getAvatarGradient(member.name);
          const memberAvatar = member.avatar
            ? `<img src="${member.avatar}" alt="${member.name}" onerror="this.remove(); this.parentElement.textContent='${getInitials(member.name)}'">`
            : getInitials(member.name);

          memberEl.innerHTML = `
            <div class="dept-member-avatar" style="background: linear-gradient(135deg, ${mc1} 0%, ${mc2} 100%)">
              ${memberAvatar}
            </div>
            <div class="dept-member-name">${member.name}</div>
          `;

          memberEl.addEventListener('click', () => showEmployeeModal(member));
          teamGrid.appendChild(memberEl);
        });

        teamSection.appendChild(teamGrid);
        body.appendChild(teamSection);
      }
    });

    // Show any members not yet shown (either standalone or from managers with sub-managers)
    const standaloneMembers = dept.members.filter(m => !shownMemberIds.has(m.id));

    if (standaloneMembers.length > 0) {
      const otherSection = document.createElement('div');
      otherSection.className = 'dept-subsection';
      otherSection.innerHTML = `<div class="dept-subsection-title">Other Team Members</div>`;

      const otherGrid = document.createElement('div');
      otherGrid.className = 'dept-team-grid';

      standaloneMembers.forEach(member => {
        const memberEl = document.createElement('div');
        memberEl.className = 'dept-team-member';
        memberEl.dataset.id = member.id;

        const [mc1, mc2] = getAvatarGradient(member.name);
        const memberAvatar = member.avatar
          ? `<img src="${member.avatar}" alt="${member.name}" onerror="this.remove(); this.parentElement.textContent='${getInitials(member.name)}'">`
          : getInitials(member.name);

        memberEl.innerHTML = `
          <div class="dept-member-avatar" style="background: linear-gradient(135deg, ${mc1} 0%, ${mc2} 100%)">
            ${memberAvatar}
          </div>
          <div class="dept-member-name">${member.name}</div>
        `;

        memberEl.addEventListener('click', () => showEmployeeModal(member));
        otherGrid.appendChild(memberEl);
      });

      otherSection.appendChild(otherGrid);
      body.appendChild(otherSection);
    }

    card.appendChild(body);
    container.appendChild(card);
  });

  elements.orgChart.appendChild(container);
}

// ============================================
// SWIMLANE VIEW RENDERER
// ============================================

function renderSwimlaneView(data) {
  elements.orgChart.innerHTML = '';
  elements.orgChart.className = 'org-chart view-swimlane';

  // Group by department and organize hierarchy within
  const lanes = {};
  const processForSwimlane = (node, level = 0) => {
    const dept = node.department;
    if (!lanes[dept]) {
      lanes[dept] = {
        name: dept,
        color: departmentColors[dept] || '#d4af37',
        groups: [] // Array of groups (manager + reports)
      };
    }

    // Create a group for this node and its direct reports
    const group = {
      leader: node,
      members: node.children ? [...node.children] : [],
      level
    };

    // Only add as a group if it has the leader or members in this dept
    if (node.department === dept) {
      lanes[dept].groups.push(group);
    }

    // Process children
    if (node.children) {
      node.children.forEach(child => processForSwimlane(child, level + 1));
    }
  };

  processForSwimlane(data);

  const container = document.createElement('div');
  container.className = 'swimlane-container';

  // Sort lanes by some logical order
  const laneOrder = [
    'Executive', 'APM / Creative Team', 'Marketing', 'AML & Compliance',
    'IT / Systems', 'E-commerce', 'Retail', 'Retail Support', 'Pre Sales',
    'Post Sales', 'Inventory', 'Client Services', 'Retail Analysis',
    'Operations', 'Manufacture & Quality Control', 'Mounting', 'Quality Control',
    'Framing Finishing', 'Chop & Pin', 'Packing', 'Logistics'
  ];

  const sortedLanes = Object.values(lanes).sort((a, b) => {
    const aIdx = laneOrder.indexOf(a.name);
    const bIdx = laneOrder.indexOf(b.name);
    return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
  });

  let rowIndex = 0;
  sortedLanes.forEach(lane => {
    const row = document.createElement('div');
    row.className = 'swimlane-row';
    row.style.animationDelay = `${rowIndex++ * 80}ms`;

    // Label section
    const label = document.createElement('div');
    label.className = 'swimlane-label';

    const totalPeople = lane.groups.reduce((sum, g) =>
      sum + 1 + g.members.filter(m => m.department === lane.name).length, 0);

    label.innerHTML = `
      <div class="swimlane-label-color" style="background: ${lane.color}"></div>
      <div class="swimlane-label-text">${lane.name}</div>
      <div class="swimlane-label-count">${totalPeople} people</div>
    `;
    row.appendChild(label);

    // Content section
    const content = document.createElement('div');
    content.className = 'swimlane-content';

    // Show each group
    lane.groups.forEach((group, gIdx) => {
      // Only show if leader is in this department
      if (group.leader.department !== lane.name) return;

      if (gIdx > 0) {
        const connector = document.createElement('div');
        connector.className = 'swimlane-group-connector';
        content.appendChild(connector);
      }

      const groupEl = document.createElement('div');
      groupEl.className = 'swimlane-group';

      // Leader card
      const leaderCard = createSwimlaneCard(group.leader, true);
      groupEl.appendChild(leaderCard);

      // Direct reports (in same department only)
      const deptMembers = group.members.filter(m => m.department === lane.name);
      deptMembers.forEach(member => {
        const arrow = document.createElement('div');
        arrow.className = 'swimlane-arrow';
        arrow.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>`;
        groupEl.appendChild(arrow);

        const memberCard = createSwimlaneCard(member, false);
        groupEl.appendChild(memberCard);
      });

      content.appendChild(groupEl);
    });

    row.appendChild(content);
    container.appendChild(row);
  });

  elements.orgChart.appendChild(container);
}

function createSwimlaneCard(node, isManager) {
  const card = document.createElement('div');
  card.className = `swimlane-card${isManager ? ' is-manager' : ''}`;
  card.dataset.id = node.id;

  const [color1, color2] = getAvatarGradient(node.name);
  const avatarContent = node.avatar
    ? `<img src="${node.avatar}" alt="${node.name}" onerror="this.remove(); this.parentElement.textContent='${getInitials(node.name)}'">`
    : getInitials(node.name);

  card.innerHTML = `
    <div class="swimlane-avatar" style="background: linear-gradient(135deg, ${color1} 0%, ${color2} 100%)">
      ${avatarContent}
    </div>
    <div class="swimlane-name">${node.name}</div>
    <div class="swimlane-title">${node.title}</div>
  `;

  card.addEventListener('click', () => showEmployeeModal(node));

  return card;
}

// ============================================
// VIEW SWITCHING
// ============================================

function switchView(viewName) {
  if (state.currentView === viewName) return;

  state.currentView = viewName;

  // Update active button
  document.querySelectorAll('.view-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === viewName);
  });

  // Re-render the chart
  renderOrgChart(currentOrgData || orgData);

  // Reset zoom for non-tree views
  if (viewName !== 'tree') {
    state.zoom = 1;
    elements.orgChart.style.transform = 'scale(1)';
    elements.zoomDisplay.textContent = '100%';
  }

  // Hide/show expand/collapse buttons based on view
  const expandBtn = document.getElementById('expand-all');
  const collapseBtn = document.getElementById('collapse-all');
  if (viewName === 'tree' || viewName === 'list') {
    expandBtn.style.display = '';
    collapseBtn.style.display = '';
  } else {
    expandBtn.style.display = 'none';
    collapseBtn.style.display = 'none';
  }

  updateMiniMap();
}

// ============================================
// Expand/Collapse Functions
// ============================================

function toggleChildren(nodeEl, nodeId) {
  const childrenContainer = document.getElementById(`children-${nodeId}`);
  const toggle = nodeEl.querySelector('.toggle-children');

  if (!childrenContainer || !toggle) return;

  const isExpanded = state.expandedNodes.has(nodeId);

  if (isExpanded) {
    // Collapse
    childrenContainer.style.opacity = '0';
    childrenContainer.style.transform = 'translateY(-10px)';

    setTimeout(() => {
      childrenContainer.classList.add('collapsed');
      childrenContainer.style.opacity = '';
      childrenContainer.style.transform = '';
    }, 200);

    toggle.classList.remove('expanded');
    toggle.classList.add('collapsed');
    state.expandedNodes.delete(nodeId);
  } else {
    // Expand
    childrenContainer.classList.remove('collapsed');
    childrenContainer.style.opacity = '0';
    childrenContainer.style.transform = 'translateY(-10px)';

    requestAnimationFrame(() => {
      childrenContainer.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
      childrenContainer.style.opacity = '1';
      childrenContainer.style.transform = 'translateY(0)';
    });

    setTimeout(() => {
      childrenContainer.style.transition = '';
      childrenContainer.style.opacity = '';
      childrenContainer.style.transform = '';
    }, 400);

    toggle.classList.remove('collapsed');
    toggle.classList.add('expanded');
    state.expandedNodes.add(nodeId);

    // Update connector line
    setTimeout(() => updateConnectorLine(childrenContainer), 50);
  }

  // Update mini map
  setTimeout(updateMiniMap, 300);
}

function expandAll() {
  const collapsedContainers = document.querySelectorAll('.org-children.collapsed');
  let delay = 0;

  collapsedContainers.forEach(container => {
    setTimeout(() => {
      container.classList.remove('collapsed');
      container.style.opacity = '0';
      container.style.transform = 'translateY(-10px)';

      requestAnimationFrame(() => {
        container.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        container.style.opacity = '1';
        container.style.transform = 'translateY(0)';
      });

      setTimeout(() => {
        container.style.transition = '';
        container.style.opacity = '';
        container.style.transform = '';
      }, 300);

      const nodeId = container.id.replace('children-', '');
      const toggle = document.querySelector(`[data-id="${nodeId}"] .toggle-children`);
      if (toggle) {
        toggle.classList.remove('collapsed');
        toggle.classList.add('expanded');
      }
      state.expandedNodes.add(nodeId);
    }, delay);
    delay += 30;
  });

  // Update connector lines after all animations
  setTimeout(() => {
    document.querySelectorAll('.org-children').forEach(updateConnectorLine);
    updateMiniMap();
  }, delay + 300);
}

function collapseAll() {
  const expandedContainers = document.querySelectorAll('.org-children:not(.collapsed)');
  let delay = 0;

  // Collapse in reverse order (deepest first)
  const containersArray = Array.from(expandedContainers).reverse();

  containersArray.forEach(container => {
    setTimeout(() => {
      container.style.opacity = '0';
      container.style.transform = 'translateY(-10px)';
      container.style.transition = 'opacity 0.2s ease, transform 0.2s ease';

      setTimeout(() => {
        container.classList.add('collapsed');
        container.style.transition = '';
        container.style.opacity = '';
        container.style.transform = '';
      }, 200);

      const nodeId = container.id.replace('children-', '');
      const toggle = document.querySelector(`[data-id="${nodeId}"] .toggle-children`);
      if (toggle) {
        toggle.classList.remove('expanded');
        toggle.classList.add('collapsed');
      }
      state.expandedNodes.delete(nodeId);
    }, delay);
    delay += 20;
  });

  setTimeout(updateMiniMap, delay + 200);
}

// ============================================
// Search Functions
// ============================================

function searchEmployees(query) {
  if (!query || query.length < 2) {
    elements.searchResults.classList.remove('active');
    return [];
  }

  const lowerQuery = query.toLowerCase();
  return allEmployees.filter(emp =>
    emp.name.toLowerCase().includes(lowerQuery) ||
    emp.title.toLowerCase().includes(lowerQuery)
  ).slice(0, 10);
}

function renderSearchResults(results) {
  elements.searchResults.innerHTML = '';

  if (results.length === 0) {
    elements.searchResults.classList.remove('active');
    return;
  }

  results.forEach((emp, index) => {
    const item = document.createElement('div');
    item.className = 'search-result-item';
    item.style.animationDelay = `${index * 30}ms`;
    item.innerHTML = `
      <div class="search-result-name">${highlightMatch(emp.name, elements.searchInput.value)}</div>
      <div class="search-result-title">${highlightMatch(emp.title, elements.searchInput.value)}</div>
    `;
    item.addEventListener('click', () => {
      highlightAndScrollToNode(emp.id);
      elements.searchResults.classList.remove('active');
      elements.searchInput.value = '';
      elements.searchInput.blur();
    });
    elements.searchResults.appendChild(item);
  });

  elements.searchResults.classList.add('active');
}

function highlightMatch(text, query) {
  if (!query) return text;
  const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
  return text.replace(regex, '<mark style="background: rgba(212, 175, 55, 0.3); color: inherit; padding: 0 2px; border-radius: 2px;">$1</mark>');
}

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function highlightAndScrollToNode(nodeId) {
  // First expand path to node (only works in tree and list views)
  if (state.currentView === 'tree') {
    expandPathToNode(nodeId);
  } else if (state.currentView === 'list') {
    expandListPathToNode(nodeId);
  }

  setTimeout(() => {
    const card = document.querySelector(`[data-id="${nodeId}"]`);
    if (card) {
      // Remove previous highlights from any element
      document.querySelectorAll('.highlighted').forEach(el => {
        el.classList.remove('highlighted');
      });

      // Add highlight
      card.classList.add('highlighted');

      // Smooth scroll to center
      card.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'center'
      });

      // Remove highlight after delay
      setTimeout(() => {
        card.classList.remove('highlighted');
      }, 4000);
    }
  }, 400);
}

function expandListPathToNode(nodeId) {
  // Find path to node and expand all parent containers
  const findPath = (node, targetId, path = []) => {
    if (node.id === targetId) return path;
    if (node.children) {
      for (const child of node.children) {
        const result = findPath(child, targetId, [...path, node.id]);
        if (result) return result;
      }
    }
    return null;
  };

  const path = findPath(currentOrgData || orgData, nodeId) || [];

  path.forEach(id => {
    const container = document.getElementById(`list-children-${id}`);
    const toggle = document.querySelector(`.list-item[data-id="${id}"] .list-toggle`);

    if (container && container.classList.contains('collapsed')) {
      container.classList.remove('collapsed');
      if (toggle) {
        toggle.classList.remove('collapsed');
        toggle.classList.add('expanded');
      }
      state.listExpandedNodes.add(id);
    }
  });
}

function expandPathToNode(nodeId) {
  const findPath = (node, targetId, path = []) => {
    if (node.id === targetId) return path;
    if (node.children) {
      for (const child of node.children) {
        const result = findPath(child, targetId, [...path, node.id]);
        if (result) return result;
      }
    }
    return null;
  };

  const path = findPath(orgData, nodeId) || [];

  path.forEach((id, index) => {
    setTimeout(() => {
      const container = document.getElementById(`children-${id}`);
      const toggle = document.querySelector(`[data-id="${id}"] .toggle-children`);

      if (container && container.classList.contains('collapsed')) {
        container.classList.remove('collapsed');
        if (toggle) {
          toggle.classList.remove('collapsed');
          toggle.classList.add('expanded');
        }
        state.expandedNodes.add(id);
        updateConnectorLine(container);
      }
    }, index * 50);
  });
}

// ============================================
// Modal Functions
// ============================================

function showEmployeeModal(employee) {
  const modalAvatar = document.getElementById('modal-avatar');
  const modalName = document.getElementById('modal-name');
  const modalTitle = document.getElementById('modal-title');
  const modalDepartment = document.getElementById('modal-department');
  const modalEmail = document.getElementById('modal-email');
  const modalPhone = document.getElementById('modal-phone');

  // Set avatar
  const [color1, color2] = getAvatarGradient(employee.name);
  modalAvatar.style.background = `linear-gradient(135deg, ${color1} 0%, ${color2} 100%)`;

  // Try to show image, fall back to initials
  if (employee.avatar) {
    modalAvatar.innerHTML = `<img src="${employee.avatar}" alt="${employee.name}" onerror="this.remove(); this.parentElement.textContent='${getInitials(employee.name)}'">`;
  } else {
    modalAvatar.innerHTML = getInitials(employee.name);
  }

  // Set info
  modalName.textContent = employee.name;
  modalTitle.textContent = employee.title;
  modalDepartment.textContent = employee.department;

  // Set contact links
  modalEmail.href = `mailto:${employee.email}`;
  modalEmail.querySelector('.contact-text').textContent = employee.email;

  modalPhone.href = `tel:${employee.phone.replace(/\s/g, '')}`;
  modalPhone.querySelector('.contact-text').textContent = employee.phone;

  // Show modal
  elements.modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function hideModal() {
  elements.modal.classList.remove('active');
  document.body.style.overflow = '';
}

// ============================================
// Zoom & Pan Functions
// ============================================

function setZoom(level) {
  state.zoom = Math.max(state.minZoom, Math.min(state.maxZoom, level));
  elements.orgChart.style.transform = `scale(${state.zoom})`;
  elements.zoomDisplay.textContent = `${Math.round(state.zoom * 100)}%`;

  // Show/hide mini map based on zoom level
  if (state.zoom < 0.8) {
    elements.miniMap.classList.add('active');
  } else {
    elements.miniMap.classList.remove('active');
  }

  updateMiniMap();
}

function zoomIn() {
  setZoom(state.zoom + state.zoomStep);
}

function zoomOut() {
  setZoom(state.zoom - state.zoomStep);
}

function resetZoom() {
  setZoom(1);
  elements.orgChartWrapper.scrollTo({
    top: 0,
    left: elements.orgChartWrapper.scrollWidth / 2 - elements.orgChartWrapper.clientWidth / 2,
    behavior: 'smooth'
  });
}

function initPanning() {
  const wrapper = elements.orgChartWrapper;

  wrapper.addEventListener('mousedown', (e) => {
    if (e.target.closest('.org-node-card') || e.target.closest('.toggle-children')) return;

    state.isPanning = true;
    wrapper.style.cursor = 'grabbing';
    state.startX = e.pageX - wrapper.offsetLeft;
    state.startY = e.pageY - wrapper.offsetTop;
    state.scrollLeft = wrapper.scrollLeft;
    state.scrollTop = wrapper.scrollTop;
  });

  wrapper.addEventListener('mouseleave', () => {
    state.isPanning = false;
    wrapper.style.cursor = 'grab';
  });

  wrapper.addEventListener('mouseup', () => {
    state.isPanning = false;
    wrapper.style.cursor = 'grab';
  });

  wrapper.addEventListener('mousemove', (e) => {
    if (!state.isPanning) return;
    e.preventDefault();

    const x = e.pageX - wrapper.offsetLeft;
    const y = e.pageY - wrapper.offsetTop;
    const walkX = (x - state.startX) * 1.2;
    const walkY = (y - state.startY) * 1.2;

    wrapper.scrollLeft = state.scrollLeft - walkX;
    wrapper.scrollTop = state.scrollTop - walkY;

    updateMiniMap();
  });

  // Mouse wheel zoom
  wrapper.addEventListener('wheel', (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -state.zoomStep : state.zoomStep;
      setZoom(state.zoom + delta);
    }
  }, { passive: false });
}

// ============================================
// Mini Map Functions
// ============================================

function updateMiniMap() {
  if (!elements.miniMap.classList.contains('active')) return;

  const chartRect = elements.orgChart.getBoundingClientRect();
  const wrapperRect = elements.orgChartWrapper.getBoundingClientRect();

  const mapWidth = 180;
  const mapHeight = 100;

  const scaleX = mapWidth / (chartRect.width || 1);
  const scaleY = mapHeight / (chartRect.height || 1);
  const scale = Math.min(scaleX, scaleY);

  const viewportWidth = wrapperRect.width * scale;
  const viewportHeight = wrapperRect.height * scale;
  const viewportLeft = elements.orgChartWrapper.scrollLeft * scale;
  const viewportTop = elements.orgChartWrapper.scrollTop * scale;

  const viewport = elements.miniMapViewport;
  viewport.style.setProperty('--viewport-width', `${viewportWidth}px`);
  viewport.style.setProperty('--viewport-height', `${viewportHeight}px`);
  viewport.style.setProperty('--viewport-left', `${viewportLeft}px`);
  viewport.style.setProperty('--viewport-top', `${viewportTop}px`);

  // Update the viewport indicator (using ::after pseudo-element via CSS)
  viewport.querySelector('::after')?.remove();
  const style = document.createElement('style');
  style.textContent = `
    #mini-map-viewport::after {
      width: ${viewportWidth}px;
      height: ${viewportHeight}px;
      left: ${viewportLeft}px;
      top: ${viewportTop}px;
    }
  `;
  viewport.appendChild(style);
}

// ============================================
// Department Filter Functions
// ============================================

function filterByDepartment(department) {
  const allNodes = document.querySelectorAll('.org-node');

  if (department === 'all') {
    // Reset all cards to full visibility
    document.querySelectorAll('.org-node-card').forEach(card => {
      card.style.transition = 'opacity 0.3s ease, filter 0.3s ease';
      card.style.opacity = '1';
      card.style.filter = 'none';
    });
    // Scroll to top/center when showing all
    elements.orgChartWrapper.scrollTo({
      top: 0,
      left: elements.orgChartWrapper.scrollWidth / 2 - elements.orgChartWrapper.clientWidth / 2,
      behavior: 'smooth'
    });
    return;
  }

  const deptMap = {
    'Executive': ['Executive'],
    'APM / Creative Team': ['APM / Creative Team'],
    'Marketing': ['Marketing'],
    'AML & Compliance': ['AML & Compliance'],
    'IT / Systems': ['IT / Systems'],
    'E-commerce': ['E-commerce'],
    'Retail': ['Retail', 'Retail Support', 'Pre Sales', 'Post Sales', 'Inventory', 'Client Services', 'Retail Analysis'],
    'Operations': ['Operations', 'Manufacture & Quality Control', 'Mounting', 'Quality Control', 'Framing Finishing', 'Chop & Pin', 'Packing', 'Logistics']
  };

  const targetDepts = deptMap[department] || [department];

  let firstMatchingCard = null;

  allNodes.forEach(node => {
    const nodeDept = node.dataset.department;
    const isMatch = targetDepts.includes(nodeDept);

    // Apply styles to the CARD, not the node (since nodes are nested)
    const card = node.querySelector(':scope > .org-node-card');
    if (card) {
      card.style.transition = 'opacity 0.3s ease, filter 0.3s ease';
      card.style.opacity = isMatch ? '1' : '0.25';
      card.style.filter = isMatch ? 'none' : 'grayscale(70%)';

      // Find the first matching card to scroll to
      if (isMatch && !firstMatchingCard) {
        firstMatchingCard = card;
      }
    }
  });

  // Scroll to the first matching department card
  if (firstMatchingCard) {
    // First, expand the path to make sure the node is visible
    const nodeId = firstMatchingCard.dataset.id;
    if (nodeId) {
      expandPathToNode(nodeId);
    }

    setTimeout(() => {
      firstMatchingCard.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    }, 150);
  }
}

// ============================================
// Event Listeners
// ============================================

function initEventListeners() {
  // Search input
  let searchDebounce;
  elements.searchInput.addEventListener('input', (e) => {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => {
      const results = searchEmployees(e.target.value);
      renderSearchResults(results);
    }, 100);
  });

  elements.searchInput.addEventListener('focus', () => {
    if (elements.searchInput.value.length >= 2) {
      elements.searchResults.classList.add('active');
    }
  });

  // Close search results when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-container')) {
      elements.searchResults.classList.remove('active');
    }
  });

  // Department filter buttons
  document.querySelectorAll('.dept-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.dept-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      filterByDepartment(btn.dataset.department);
    });
  });

  // Modal events
  elements.modal.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-backdrop') || e.target.closest('.modal-close')) {
      hideModal();
    }
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Escape closes modal and search
    if (e.key === 'Escape') {
      hideModal();
      elements.searchResults.classList.remove('active');
      elements.searchInput.blur();
    }

    // Don't trigger shortcuts when typing in search
    if (e.target === elements.searchInput) return;

    // Focus search
    if (e.key === '/') {
      e.preventDefault();
      elements.searchInput.focus();
    }
  });

  // Scroll listener for mini map
  elements.orgChartWrapper.addEventListener('scroll', () => {
    requestAnimationFrame(updateMiniMap);
  });

  // Window resize handler
  let resizeDebounce;
  window.addEventListener('resize', () => {
    clearTimeout(resizeDebounce);
    resizeDebounce = setTimeout(() => {
      document.querySelectorAll('.org-children').forEach(updateConnectorLine);
      updateMiniMap();
    }, 100);
  });
}

// ============================================
// Admin Panel Functions
// ============================================

const adminState = {
  selectedEmployee: null,
  selectedManager: null,
  currentManager: null
};

const adminElements = {
  modal: null,
  employeeSearch: null,
  employeeResults: null,
  employeeDropdown: null,
  managerSearch: null,
  managerResults: null,
  selectedEmployeeEl: null,
  selectedManagerEl: null,
  currentManagerSection: null,
  newManagerSection: null,
  currentManagerEl: null,
  warningEl: null,
  saveBtn: null,
  // Employee details edit form
  detailsSection: null,
  editName: null,
  editTitle: null,
  editEmail: null,
  editPhone: null,
  editDepartment: null,
  editAvatar: null
};

function initAdminElements() {
  adminElements.modal = document.getElementById('admin-modal');
  adminElements.employeeSearch = document.getElementById('admin-employee-search');
  adminElements.employeeResults = document.getElementById('admin-employee-results');
  adminElements.employeeDropdown = document.getElementById('admin-employee-dropdown');
  adminElements.managerSearch = document.getElementById('admin-manager-search');
  adminElements.managerResults = document.getElementById('admin-manager-results');
  adminElements.selectedEmployeeEl = document.getElementById('selected-employee');
  adminElements.selectedManagerEl = document.getElementById('selected-manager');
  adminElements.currentManagerSection = document.getElementById('current-manager-section');
  adminElements.newManagerSection = document.getElementById('new-manager-section');
  adminElements.currentManagerEl = document.getElementById('current-manager');
  adminElements.warningEl = document.getElementById('admin-warning');
  adminElements.saveBtn = document.getElementById('admin-save');
  // Employee details edit form
  adminElements.detailsSection = document.getElementById('employee-details-section');
  adminElements.editName = document.getElementById('edit-name');
  adminElements.editTitle = document.getElementById('edit-title');
  adminElements.editEmail = document.getElementById('edit-email');
  adminElements.editPhone = document.getElementById('edit-phone');
  adminElements.editDepartment = document.getElementById('edit-department');
  adminElements.editAvatar = document.getElementById('edit-avatar');
}

function showAdminPanel() {
  resetAdminState();
  populateEmployeeDropdown();
  adminElements.modal.classList.add('active');
  document.body.style.overflow = 'hidden';
  setTimeout(() => adminElements.employeeSearch.focus(), 100);
}

function populateEmployeeDropdown() {
  // Clear existing options except the first one
  adminElements.employeeDropdown.innerHTML = '<option value="">Browse A-Z...</option>';

  // Sort employees alphabetically by name
  const sortedEmployees = [...allEmployees].sort((a, b) =>
    a.name.localeCompare(b.name, 'en', { sensitivity: 'base' })
  );

  // Add each employee as an option
  sortedEmployees.forEach(emp => {
    const option = document.createElement('option');
    option.value = emp.id;
    option.textContent = `${emp.name} — ${emp.title}`;
    adminElements.employeeDropdown.appendChild(option);
  });
}

function hideAdminPanel() {
  adminElements.modal.classList.remove('active');
  document.body.style.overflow = '';
  resetAdminState();
}

function resetAdminState() {
  adminState.selectedEmployee = null;
  adminState.selectedManager = null;
  adminState.currentManager = null;

  adminElements.employeeSearch.value = '';
  adminElements.employeeDropdown.value = '';
  adminElements.managerSearch.value = '';
  adminElements.employeeResults.classList.remove('active');
  adminElements.managerResults.classList.remove('active');
  adminElements.selectedEmployeeEl.classList.add('hidden');
  adminElements.selectedManagerEl.classList.add('hidden');
  adminElements.currentManagerSection.classList.add('hidden');
  adminElements.newManagerSection.classList.add('hidden');
  adminElements.warningEl.classList.add('hidden');
  adminElements.saveBtn.disabled = true;

  // Reset edit form
  adminElements.detailsSection.classList.add('hidden');
  adminElements.editName.value = '';
  adminElements.editTitle.value = '';
  adminElements.editEmail.value = '';
  adminElements.editPhone.value = '';
  adminElements.editDepartment.value = 'Executive';
  adminElements.editAvatar.value = '';
}

function searchAdminEmployees(query, excludeIds = []) {
  if (!query || query.length < 1) return [];

  const lowerQuery = query.toLowerCase();
  return allEmployees.filter(emp =>
    !excludeIds.includes(emp.id) &&
    (emp.name.toLowerCase().includes(lowerQuery) ||
     emp.title.toLowerCase().includes(lowerQuery))
  ).slice(0, 8);
}

function renderAdminDropdown(results, container, onSelect, excludeCEO = false) {
  container.innerHTML = '';

  const filteredResults = excludeCEO
    ? results.filter(emp => emp.id !== 'ceo')
    : results;

  if (filteredResults.length === 0) {
    container.classList.remove('active');
    return;
  }

  filteredResults.forEach(emp => {
    const item = document.createElement('div');
    item.className = 'admin-dropdown-item';

    const [color1, color2] = getAvatarGradient(emp.name);
    const isCEO = emp.id === 'ceo';
    const avatarContent = emp.avatar
      ? `<img src="${emp.avatar}" alt="${emp.name}" onerror="this.remove(); this.parentElement.textContent='${getInitials(emp.name)}'">`
      : getInitials(emp.name);

    item.innerHTML = `
      <div class="item-avatar" style="background: linear-gradient(135deg, ${color1} 0%, ${color2} 100%)">
        ${avatarContent}
      </div>
      <div class="item-info">
        <div class="item-name">${emp.name}${isCEO ? '<span class="ceo-indicator">CEO</span>' : ''}</div>
        <div class="item-title">${emp.title}</div>
      </div>
    `;

    item.addEventListener('click', () => onSelect(emp));
    container.appendChild(item);
  });

  container.classList.add('active');
}

function findEmployeeManager(employeeId) {
  // Find who the employee currently reports to
  const findParent = (node, targetId, parent = null) => {
    if (node.id === targetId) {
      return parent;
    }
    if (node.children) {
      for (const child of node.children) {
        const result = findParent(child, targetId, node);
        if (result !== undefined) return result;
      }
    }
    return undefined;
  };

  return findParent(currentOrgData, employeeId);
}

function selectEmployee(employee) {
  adminState.selectedEmployee = employee;

  // Update UI - selected card display
  const [color1, color2] = getAvatarGradient(employee.name);
  const selectedAvatar = document.getElementById('selected-avatar');
  selectedAvatar.style.background = `linear-gradient(135deg, ${color1} 0%, ${color2} 100%)`;
  if (employee.avatar) {
    selectedAvatar.innerHTML = `<img src="${employee.avatar}" alt="${employee.name}" onerror="this.remove(); this.parentElement.textContent='${getInitials(employee.name)}'">`;
  } else {
    selectedAvatar.textContent = getInitials(employee.name);
  }
  document.getElementById('selected-name').textContent = employee.name;
  document.getElementById('selected-title').textContent = employee.title;

  adminElements.selectedEmployeeEl.classList.remove('hidden');
  adminElements.employeeSearch.value = '';
  adminElements.employeeResults.classList.remove('active');

  // Populate edit form with employee details
  adminElements.editName.value = employee.name || '';
  adminElements.editTitle.value = employee.title || '';
  adminElements.editEmail.value = employee.email || '';
  adminElements.editPhone.value = employee.phone || '';
  adminElements.editDepartment.value = employee.department || 'Executive';
  // Extract just filename from avatar path if it exists
  if (employee.avatar) {
    const avatarPath = employee.avatar;
    const filename = avatarPath.split('/').pop();
    adminElements.editAvatar.value = filename || '';
  } else {
    adminElements.editAvatar.value = '';
  }
  adminElements.detailsSection.classList.remove('hidden');

  // Show current manager (CEO has no manager)
  const manager = findEmployeeManager(employee.id);
  adminState.currentManager = manager;

  if (employee.id === 'ceo') {
    // CEO cannot be reassigned - hide manager sections
    adminElements.currentManagerSection.classList.add('hidden');
    adminElements.newManagerSection.classList.add('hidden');
  } else {
    if (manager) {
      const [mColor1, mColor2] = getAvatarGradient(manager.name);
      const managerAvatar = document.getElementById('current-manager-avatar');
      managerAvatar.style.background = `linear-gradient(135deg, ${mColor1} 0%, ${mColor2} 100%)`;
      if (manager.avatar) {
        managerAvatar.innerHTML = `<img src="${manager.avatar}" alt="${manager.name}" onerror="this.remove(); this.parentElement.textContent='${getInitials(manager.name)}'">`;
      } else {
        managerAvatar.textContent = getInitials(manager.name);
      }
      document.getElementById('current-manager-name').textContent = manager.name;
      document.getElementById('current-manager-title').textContent = manager.title;
      adminElements.currentManagerEl.classList.remove('no-manager');
    } else {
      document.getElementById('current-manager-name').textContent = 'No current manager';
      document.getElementById('current-manager-title').textContent = '';
      document.getElementById('current-manager-avatar').style.background = 'var(--bg-tertiary)';
      document.getElementById('current-manager-avatar').textContent = '?';
      adminElements.currentManagerEl.classList.add('no-manager');
    }

    adminElements.currentManagerSection.classList.remove('hidden');
    adminElements.newManagerSection.classList.remove('hidden');
  }

  adminElements.warningEl.classList.add('hidden');

  // Check for changes to enable save button
  checkForChanges();
}

function selectManager(manager) {
  // Can't assign someone to themselves
  if (manager.id === adminState.selectedEmployee?.id) {
    showAdminWarning('An employee cannot report to themselves.');
    return;
  }

  // Check for circular reference (can't assign to someone who reports to the selected employee)
  if (isDescendant(currentOrgData, adminState.selectedEmployee.id, manager.id)) {
    showAdminWarning(`${manager.name} currently reports to ${adminState.selectedEmployee.name} (directly or indirectly). This would create a circular reference.`);
    return;
  }

  adminState.selectedManager = manager;

  // Update UI
  const [color1, color2] = getAvatarGradient(manager.name);
  const newManagerAvatar = document.getElementById('new-manager-avatar');
  newManagerAvatar.style.background = `linear-gradient(135deg, ${color1} 0%, ${color2} 100%)`;
  if (manager.avatar) {
    newManagerAvatar.innerHTML = `<img src="${manager.avatar}" alt="${manager.name}" onerror="this.remove(); this.parentElement.textContent='${getInitials(manager.name)}'">`;
  } else {
    newManagerAvatar.textContent = getInitials(manager.name);
  }
  document.getElementById('new-manager-name').textContent = manager.name;
  document.getElementById('new-manager-title').textContent = manager.title;

  adminElements.selectedManagerEl.classList.remove('hidden');
  adminElements.managerSearch.value = '';
  adminElements.managerResults.classList.remove('active');
  adminElements.warningEl.classList.add('hidden');

  // Check if manager is same as current
  if (adminState.currentManager?.id === manager.id) {
    showAdminWarning('This is already the current manager. Select a different manager to change reporting.');
  }

  // Check all changes to enable/disable save
  checkForChanges();
}

function isDescendant(tree, parentId, childId) {
  // Check if childId is a descendant of parentId
  const findNode = (node, targetId) => {
    if (node.id === targetId) return node;
    if (node.children) {
      for (const child of node.children) {
        const result = findNode(child, targetId);
        if (result) return result;
      }
    }
    return null;
  };

  const parentNode = findNode(tree, parentId);
  if (!parentNode) return false;

  const checkDescendant = (node, targetId) => {
    if (node.id === targetId) return true;
    if (node.children) {
      for (const child of node.children) {
        if (checkDescendant(child, targetId)) return true;
      }
    }
    return false;
  };

  return checkDescendant(parentNode, childId);
}

function showAdminWarning(message) {
  document.getElementById('admin-warning-text').textContent = message;
  adminElements.warningEl.classList.remove('hidden');
}

function checkForChanges() {
  if (!adminState.selectedEmployee) {
    adminElements.saveBtn.disabled = true;
    return;
  }

  const emp = adminState.selectedEmployee;

  // Check if any details have changed
  const nameChanged = adminElements.editName.value !== (emp.name || '');
  const titleChanged = adminElements.editTitle.value !== (emp.title || '');
  const emailChanged = adminElements.editEmail.value !== (emp.email || '');
  const phoneChanged = adminElements.editPhone.value !== (emp.phone || '');
  const deptChanged = adminElements.editDepartment.value !== (emp.department || '');

  // Check avatar change
  const currentAvatarFilename = emp.avatar ? emp.avatar.split('/').pop() : '';
  const avatarChanged = adminElements.editAvatar.value !== currentAvatarFilename;

  // Check manager change
  const managerChanged = adminState.selectedManager &&
    adminState.currentManager?.id !== adminState.selectedManager.id;

  const hasChanges = nameChanged || titleChanged || emailChanged || phoneChanged ||
    deptChanged || avatarChanged || managerChanged;

  adminElements.saveBtn.disabled = !hasChanges;
}

function saveChanges() {
  if (!adminState.selectedEmployee) return;

  const employeeId = adminState.selectedEmployee.id;

  // Deep clone the current org data
  let newOrgData = JSON.parse(JSON.stringify(currentOrgData));

  // Find and update the employee node in the tree
  const findAndUpdateEmployee = (node) => {
    if (node.id === employeeId) {
      // Update employee details
      node.name = adminElements.editName.value;
      node.title = adminElements.editTitle.value;
      node.email = adminElements.editEmail.value;
      node.phone = adminElements.editPhone.value;
      node.department = adminElements.editDepartment.value;

      // Update avatar path
      const avatarFilename = adminElements.editAvatar.value.trim();
      if (avatarFilename) {
        node.avatar = `images/avatars/${avatarFilename}`;
      } else {
        node.avatar = null;
      }

      return node;
    }
    if (node.children) {
      for (const child of node.children) {
        const result = findAndUpdateEmployee(child);
        if (result) return result;
      }
    }
    return null;
  };

  const updatedEmployee = findAndUpdateEmployee(newOrgData);

  if (!updatedEmployee) {
    showAdminWarning('Error: Could not find employee in org chart.');
    return;
  }

  // Handle manager change if a new manager was selected
  if (adminState.selectedManager && adminState.currentManager?.id !== adminState.selectedManager.id) {
    const newManagerId = adminState.selectedManager.id;

    // Remove employee from current location
    const removeEmployee = (node) => {
      if (node.children) {
        const index = node.children.findIndex(c => c.id === employeeId);
        if (index !== -1) {
          return node.children.splice(index, 1)[0];
        }
        for (const child of node.children) {
          const removed = removeEmployee(child);
          if (removed) return removed;
        }
      }
      return null;
    };

    const employeeNode = removeEmployee(newOrgData);

    if (employeeNode) {
      // Add employee to new manager
      const addToManager = (node) => {
        if (node.id === newManagerId) {
          if (!node.children) node.children = [];
          node.children.push(employeeNode);
          return true;
        }
        if (node.children) {
          for (const child of node.children) {
            if (addToManager(child)) return true;
          }
        }
        return false;
      };

      if (!addToManager(newOrgData)) {
        showAdminWarning('Error: Could not find new manager in org chart.');
        return;
      }

      console.log(`%c Manager updated: ${adminElements.editName.value} now reports to ${adminState.selectedManager.name}`, 'color: #d4af37');
    }
  }

  // Update the global data
  currentOrgData = newOrgData;

  // Regenerate allEmployees array
  regenerateAllEmployees();

  // Save to localStorage
  saveOrgDataToStorage();

  // Re-render the chart
  renderOrgChart(currentOrgData);

  // Close admin panel
  hideAdminPanel();

  // Show success feedback (scroll to the updated employee)
  setTimeout(() => {
    highlightAndScrollToNode(employeeId);
  }, 500);

  console.log(`%c Employee updated: ${adminElements.editName.value}`, 'color: #d4af37');
}

function regenerateAllEmployees() {
  allEmployees.length = 0;
  const flatten = (node, parent = null) => {
    const flatNode = { ...node, parent: parent, children: undefined };
    allEmployees.push(flatNode);
    if (node.children) {
      node.children.forEach(child => flatten(child, node));
    }
  };
  flatten(currentOrgData);
}

// LocalStorage functions
function saveOrgDataToStorage() {
  try {
    localStorage.setItem('orgChartData', JSON.stringify(currentOrgData));
    console.log('Org chart saved to localStorage');
  } catch (e) {
    console.error('Failed to save to localStorage:', e);
  }
}

function loadOrgDataFromStorage() {
  try {
    const saved = localStorage.getItem('orgChartData');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Failed to load from localStorage:', e);
  }
  return null;
}

function exportDataFile() {
  // Generate the data.js file content
  const dataContent = `// Organizational Chart Data
// Generated on ${new Date().toLocaleString()}
// Replace your existing data.js file with this content

const orgData = ${JSON.stringify(currentOrgData, null, 2)};

// Department color mapping
const departmentColors = ${JSON.stringify(departmentColors, null, 2)};

// Helper function to flatten org data for search
function flattenOrgData(node, result = [], parent = null) {
  const flatNode = { ...node, parent: parent, children: undefined };
  result.push(flatNode);
  if (node.children) {
    node.children.forEach(child => flattenOrgData(child, result, node));
  }
  return result;
}

// Export for use
const allEmployees = flattenOrgData(orgData);
`;

  // Create blob and download
  const blob = new Blob([dataContent], { type: 'application/javascript' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = 'data.js';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  console.log('%c data.js exported successfully! ', 'background: #22c55e; color: white; padding: 2px 6px; border-radius: 4px;');
}

function resetToDefault() {
  if (!confirm('Are you sure you want to reset to the original org chart data? All your changes will be lost.')) {
    return;
  }

  // Clear localStorage
  localStorage.removeItem('orgChartData');

  // Reset to original data
  currentOrgData = JSON.parse(JSON.stringify(orgData));

  // Regenerate employees array
  regenerateAllEmployees();

  // Re-render chart
  renderOrgChart(currentOrgData);

  // Reset admin state
  resetAdminState();

  console.log('%c Reset to original data ', 'background: #ef4444; color: white; padding: 2px 6px; border-radius: 4px;');
}

function initAdminEventListeners() {
  // Open admin panel
  document.getElementById('admin-btn').addEventListener('click', showAdminPanel);

  // Close admin panel
  adminElements.modal.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-backdrop') || e.target.closest('.modal-close')) {
      hideAdminPanel();
    }
  });

  document.getElementById('admin-cancel').addEventListener('click', hideAdminPanel);

  // Employee search
  let employeeSearchDebounce;
  adminElements.employeeSearch.addEventListener('input', (e) => {
    clearTimeout(employeeSearchDebounce);
    employeeSearchDebounce = setTimeout(() => {
      const results = searchAdminEmployees(e.target.value);
      renderAdminDropdown(results, adminElements.employeeResults, selectEmployee, true); // exclude CEO
    }, 100);
  });

  adminElements.employeeSearch.addEventListener('focus', () => {
    if (adminElements.employeeSearch.value.length >= 1) {
      const results = searchAdminEmployees(adminElements.employeeSearch.value);
      renderAdminDropdown(results, adminElements.employeeResults, selectEmployee, true);
    }
  });

  // Employee dropdown (A-Z)
  adminElements.employeeDropdown.addEventListener('change', (e) => {
    const employeeId = e.target.value;
    if (employeeId) {
      const employee = allEmployees.find(emp => emp.id === employeeId);
      if (employee) {
        selectEmployee(employee);
        // Clear search when using dropdown
        adminElements.employeeSearch.value = '';
        adminElements.employeeResults.classList.remove('active');
      }
    }
  });

  // Manager search
  let managerSearchDebounce;
  adminElements.managerSearch.addEventListener('input', (e) => {
    clearTimeout(managerSearchDebounce);
    managerSearchDebounce = setTimeout(() => {
      const excludeIds = adminState.selectedEmployee ? [adminState.selectedEmployee.id] : [];
      const results = searchAdminEmployees(e.target.value, excludeIds);
      renderAdminDropdown(results, adminElements.managerResults, selectManager);
    }, 100);
  });

  adminElements.managerSearch.addEventListener('focus', () => {
    if (adminElements.managerSearch.value.length >= 1) {
      const excludeIds = adminState.selectedEmployee ? [adminState.selectedEmployee.id] : [];
      const results = searchAdminEmployees(adminElements.managerSearch.value, excludeIds);
      renderAdminDropdown(results, adminElements.managerResults, selectManager);
    }
  });

  // Clear selections
  document.getElementById('clear-employee').addEventListener('click', () => {
    adminState.selectedEmployee = null;
    adminState.selectedManager = null;
    adminState.currentManager = null;
    adminElements.selectedEmployeeEl.classList.add('hidden');
    adminElements.selectedManagerEl.classList.add('hidden');
    adminElements.currentManagerSection.classList.add('hidden');
    adminElements.newManagerSection.classList.add('hidden');
    adminElements.detailsSection.classList.add('hidden');
    adminElements.warningEl.classList.add('hidden');
    adminElements.saveBtn.disabled = true;
    adminElements.employeeDropdown.value = '';
    adminElements.employeeSearch.focus();
  });

  document.getElementById('clear-manager').addEventListener('click', () => {
    adminState.selectedManager = null;
    adminElements.selectedManagerEl.classList.add('hidden');
    adminElements.saveBtn.disabled = true;
    adminElements.managerSearch.value = '';
    adminElements.managerSearch.focus();
  });

  // Save button
  adminElements.saveBtn.addEventListener('click', saveChanges);

  // Edit form change listeners
  const editFields = [
    adminElements.editName,
    adminElements.editTitle,
    adminElements.editEmail,
    adminElements.editPhone,
    adminElements.editDepartment,
    adminElements.editAvatar
  ];

  editFields.forEach(field => {
    field.addEventListener('input', checkForChanges);
    field.addEventListener('change', checkForChanges);
  });

  // Export button
  document.getElementById('admin-export').addEventListener('click', exportDataFile);

  // Reset button
  document.getElementById('admin-reset').addEventListener('click', resetToDefault);

  // Close dropdowns when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.admin-search-container')) {
      adminElements.employeeResults.classList.remove('active');
      adminElements.managerResults.classList.remove('active');
    }
  });
}

// Global variable to hold current org data (can be modified)
let currentOrgData;

// ============================================
// Initialize on DOM Ready
// ============================================

function fullInit() {
  // Load saved data or use default
  const savedData = loadOrgDataFromStorage();
  currentOrgData = savedData || JSON.parse(JSON.stringify(orgData));

  // If we loaded saved data, regenerate allEmployees
  if (savedData) {
    regenerateAllEmployees();
    console.log('%c Loaded org chart from localStorage ', 'background: #22c55e; color: white; padding: 2px 6px; border-radius: 4px;');
  }

  // Initialize main app
  init();

  // Initialize admin panel
  initAdminElements();
  initAdminEventListeners();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', fullInit);
} else {
  fullInit();
}
