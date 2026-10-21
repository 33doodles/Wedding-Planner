// VowCraft Modular Wedding Planner - Frontend Application
(function () {
  const STORAGE_KEY = 'vowcraft_wedding_state_v1';
  let appState = null;
  let activeTab = 'overview';
  let activeModuleCategory = 'All';
  let expandedModules = new Set(['venue', 'catering', 'photography']);
  let saveTimeout = null;

  // Format currency
  const fmtCurrency = (val) => {
    const num = Number(val) || 0;
    return '$' + num.toLocaleString('en-US', { maximumFractionDigits: 0 });
  };

  // Escape HTML
  const esc = (str) => {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  };

  // Toast helper
  function showToast(message) {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
      toast.remove();
    }, 2800);
  }

  // Update sync indicator
  function setSyncIndicator(state) {
    const dot = document.querySelector('#syncStatusIndicator .status-dot');
    const mobDot = document.getElementById('mobileSyncDot');
    const text = document.getElementById('syncStatusText');
    if (!dot || !text) return;

    if (state === 'saving') {
      dot.className = 'status-dot saving';
      mobDot.className = 'status-dot saving';
      text.textContent = 'Saving changes...';
    } else if (state === 'online') {
      dot.className = 'status-dot online';
      mobDot.className = 'status-dot online';
      text.textContent = 'Synced & saved';
    } else {
      dot.className = 'status-dot';
      mobDot.className = 'status-dot';
      text.textContent = 'Saved locally (offline)';
    }
  }

  // Load state from server or fallback to localStorage
  async function initApp() {
    try {
      const res = await fetch('/api/state');
      if (!res.ok) throw new Error('Server unreachable');
      appState = await res.json();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
      setSyncIndicator('online');
    } catch (err) {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        appState = JSON.parse(cached);
      }
      setSyncIndicator('offline');
    }
    bindGlobalEvents();
    renderAll();
  }

  // Persist state to localStorage + debounced PUT to server
  function persistState() {
    if (!appState) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
    setSyncIndicator('saving');

    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(async () => {
      try {
        const res = await fetch('/api/state', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(appState)
        });
        if (res.ok) {
          setSyncIndicator('online');
        } else {
          setSyncIndicator('offline');
        }
      } catch (e) {
        setSyncIndicator('offline');
      }
    }, 350);
  }

  // Switch active tab
  function switchTab(tabId, scrollToModuleId = null) {
    activeTab = tabId;
    document.querySelectorAll('.tab-panel').forEach((panel) => {
      panel.classList.toggle('active', panel.id === `tab-${tabId}`);
    });
    document.querySelectorAll('.nav-btn, .mob-nav-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.tab === tabId);
    });

    if (scrollToModuleId) {
      expandedModules.add(scrollToModuleId);
      activeModuleCategory = 'All';
      renderModulesTab();
      setTimeout(() => {
        const el = document.getElementById(`mod-card-${scrollToModuleId}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 60);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  // Calculate metrics across enabled modules & active checklist tasks
  function computeMetrics() {
    const totalModules = appState.modules.length;
    const enabledModules = appState.modules.filter((m) => m.enabled);

    let totalActiveTasks = 0;
    let completedActiveTasks = 0;
    let skippedTasks = 0;

    let totalAllocated = 0;
    let totalActual = 0;

    appState.modules.forEach((mod) => {
      if (mod.enabled) {
        totalAllocated += Number(mod.budgetAllocated) || 0;
        totalActual += Number(mod.actualCost) || 0;
      }
      mod.checklist.forEach((task) => {
        if (!mod.enabled || task.skipped) {
          skippedTasks++;
        } else {
          totalActiveTasks++;
          if (task.completed) completedActiveTasks++;
        }
      });
    });

    const checklistPercent = totalActiveTasks > 0
      ? Math.round((completedActiveTasks / totalActiveTasks) * 100)
      : 100;

    // Guest metrics
    let attendingHeadcount = 0;
    let pendingHeadcount = 0;
    let declinedHeadcount = 0;
    let totalInvitedHeadcount = 0;

    appState.guests.forEach((g) => {
      const size = Number(g.partySize) || 1;
      totalInvitedHeadcount += size;
      if (g.rsvpStatus === 'attending') attendingHeadcount += size;
      else if (g.rsvpStatus === 'declined') declinedHeadcount += size;
      else pendingHeadcount += size;
    });

    return {
      totalModules,
      enabledCount: enabledModules.length,
      disabledCount: totalModules - enabledModules.length,
      totalActiveTasks,
      completedActiveTasks,
      skippedTasks,
      checklistPercent,
      totalAllocated,
      totalActual,
      attendingHeadcount,
      pendingHeadcount,
      declinedHeadcount,
      totalInvitedHeadcount
    };
  }

  // Render Header, Sidebar, and KPIs
  function renderHeaderAndKpis() {
    const { meta } = appState;
    const m = computeMetrics();

    document.getElementById('sidebarCoupleNames').textContent = meta.coupleNames;
    document.getElementById('mobileCoupleTitle').textContent = meta.coupleNames;
    document.getElementById('heroCoupleHeading').textContent = `${meta.coupleNames}'s Wedding`;

    const dateFormatted = meta.weddingDate
      ? new Date(meta.weddingDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      : 'Date TBD';
    document.getElementById('sidebarWeddingDate').textContent = `${dateFormatted} • ${meta.locationCity || 'Location TBD'}`;

    // Countdown calculation
    if (meta.weddingDate) {
      const diffMs = new Date(meta.weddingDate + 'T12:00:00') - new Date();
      const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      const label = days > 0 ? `${days} days to go` : days === 0 ? 'Wedding Day!' : `${Math.abs(days)} days married`;
      document.getElementById('sidebarCountdown').textContent = `🗓️ ${label}`;
      document.getElementById('mobileCountdown').textContent = label;
    }

    // Nav pills
    document.getElementById('navActiveModulesCount').textContent = `${m.enabledCount}/${m.totalModules}`;
    document.getElementById('navChecklistProgress').textContent = `${m.checklistPercent}%`;
    document.getElementById('navGuestCount').textContent = `${m.attendingHeadcount}/${m.totalInvitedHeadcount}`;

    // KPI Cards
    document.getElementById('kpiChecklistPercent').textContent = `${m.checklistPercent}%`;
    document.getElementById('kpiChecklistBar').style.width = `${m.checklistPercent}%`;
    document.getElementById('kpiChecklistSub').textContent =
      `${m.completedActiveTasks} of ${m.totalActiveTasks} active tasks done (${m.skippedTasks} greyed out)`;

    const budgetCap = Number(meta.estimatedBudget) || 1;
    const budgetPct = Math.min(100, Math.round((m.totalActual / budgetCap) * 100));
    document.getElementById('kpiBudgetActual').textContent = fmtCurrency(m.totalActual);
    document.getElementById('kpiBudgetBar').style.width = `${budgetPct}%`;
    document.getElementById('kpiBudgetSub').textContent =
      `Allocated: ${fmtCurrency(m.totalAllocated)} • Target Cap: ${fmtCurrency(meta.estimatedBudget)}`;

    document.getElementById('kpiGuestAttending').textContent = `${m.attendingHeadcount} Guests`;
    document.getElementById('kpiGuestBreakdown').innerHTML = `
      <span class="badge success">${m.attendingHeadcount} Attending</span>
      <span class="badge warning">${m.pendingHeadcount} Pending</span>
      <span class="badge neutral">${m.declinedHeadcount} Declined</span>
    `;
    document.getElementById('kpiGuestSub').textContent =
      `Total invited: ${m.totalInvitedHeadcount} • Venue target: ${meta.targetGuestCount || 120}`;

    document.getElementById('kpiModulesRatio').textContent = `${m.enabledCount} / ${m.totalModules}`;
    document.getElementById('kpiModulesSub').textContent =
      `${m.disabledCount} module(s) greyed out as not needed`;

    document.getElementById('hideDisabledToggle').checked = !!meta.hideDisabledModules;
    document.getElementById('hideDisabledModulesTabToggle').checked = !!meta.hideDisabledModules;
  }

  // Render Overview Tab (Presets + Modular Grid)
  function renderOverviewTab() {
    const presetGrid = document.getElementById('presetSelectorGrid');
    const templates = Object.values(appState.templates || {});

    presetGrid.innerHTML = templates
      .map((tpl) => {
        const isActive = appState.meta.weddingType === tpl.id;
        return `
          <button type="button" class="preset-card ${isActive ? 'active' : ''}" data-preset="${esc(tpl.id)}">
            <div class="preset-title">
              <span>${esc(tpl.name)}</span>
              ${isActive ? '<span class="badge success">Active</span>' : ''}
            </div>
            <div class="preset-desc">${esc(tpl.description)}</div>
          </button>
        `;
      })
      .join('');

    presetGrid.querySelectorAll('.preset-card').forEach((btn) => {
      btn.addEventListener('click', () => {
        const presetId = btn.dataset.preset;
        const tpl = appState.templates[presetId];
        if (!tpl) return;
        appState.meta.weddingType = presetId;
        appState.modules.forEach((mod) => {
          mod.enabled = tpl.enabledModules.includes(mod.id);
        });
        persistState();
        renderAll();
        showToast(`Applied "${tpl.name}" preset — unused modules greyed out!`);
      });
    });

    // Overview Module Cards
    const overviewGrid = document.getElementById('overviewModuleGrid');
    const modulesToDisplay = appState.meta.hideDisabledModules
      ? appState.modules.filter((m) => m.enabled)
      : appState.modules;

    overviewGrid.innerHTML = modulesToDisplay
      .map((mod) => {
        const activeTasks = mod.checklist.filter((t) => !t.skipped);
        const doneTasks = activeTasks.filter((t) => t.completed).length;
        const primaryField = mod.fields[0] && mod.fields[0].value ? mod.fields[0].value : 'No vendor selected yet';

        return `
          <div class="mod-overview-card ${mod.enabled ? '' : 'disabled-module'}">
            <div>
              <div class="mod-card-top">
                <div class="mod-title-wrap">
                  <span class="mod-icon">${esc(mod.icon)}</span>
                  <div>
                    <div class="mod-cat-tag">${esc(mod.category)}</div>
                    <div class="mod-name">${esc(mod.name)}</div>
                  </div>
                </div>
                <label class="switch" title="Toggle whether your wedding includes this module">
                  <input type="checkbox" class="mod-enable-toggle" data-mod-id="${esc(mod.id)}" ${mod.enabled ? 'checked' : ''} />
                  <span class="slider"></span>
                </label>
              </div>
              <p class="text-muted" style="font-size:0.82rem; margin-top:0.55rem;">
                ${mod.enabled ? `<strong>Selected:</strong> ${esc(primaryField)}` : '<em>Greyed out — not needed for your wedding</em>'}
              </p>
            </div>

            <div>
              <div class="mod-card-stats">
                <span>Checklist: <strong>${doneTasks}/${activeTasks.length}</strong></span>
                <span>Cost: <strong>${fmtCurrency(mod.actualCost)}</strong></span>
              </div>
              <div class="mod-card-footer" style="margin-top:0.5rem;">
                <span class="badge ${mod.enabled ? (mod.contractSigned ? 'success' : 'warning') : 'neutral'}">
                  ${!mod.enabled ? 'Skipped / Disabled' : mod.contractSigned ? 'Booked & Signed' : 'In Progress'}
                </span>
                <button type="button" class="btn btn-secondary btn-sm open-mod-detail-btn" data-mod-id="${esc(mod.id)}">
                  ${mod.enabled ? 'Fill Details →' : 'View / Enable'}
                </button>
              </div>
            </div>
          </div>
        `;
      })
      .join('');

    overviewGrid.querySelectorAll('.mod-enable-toggle').forEach((chk) => {
      chk.addEventListener('change', (e) => {
        const modId = e.target.dataset.modId;
        const mod = appState.modules.find((m) => m.id === modId);
        if (mod) {
          mod.enabled = e.target.checked;
          appState.meta.weddingType = 'custom';
          persistState();
          renderAll();
          showToast(`${mod.name} ${mod.enabled ? 'enabled' : 'greyed out'}`);
        }
      });
    });

    overviewGrid.querySelectorAll('.open-mod-detail-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        switchTab('modules', btn.dataset.modId);
      });
    });
  }

  // Render Tab 2: Vendor & Preparation Worksheets
  function renderModulesTab() {
    const categories = ['All', ...new Set(appState.modules.map((m) => m.category))];
    const filterBar = document.getElementById('moduleFilterBar');

    filterBar.innerHTML = categories
      .map(
        (cat) => `
        <button type="button" class="filter-pill ${activeModuleCategory === cat ? 'active' : ''}" data-cat="${esc(cat)}">
          ${esc(cat)}
        </button>
      `
      )
      .join('');

    filterBar.querySelectorAll('.filter-pill').forEach((pill) => {
      pill.addEventListener('click', () => {
        activeModuleCategory = pill.dataset.cat;
        renderModulesTab();
      });
    });

    // Sort enabled modules first, disabled (greyed-out) modules at bottom
    let filtered = appState.modules.filter((m) => {
      if (appState.meta.hideDisabledModules && !m.enabled) return false;
      if (activeModuleCategory !== 'All' && m.category !== activeModuleCategory) return false;
      return true;
    });

    filtered.sort((a, b) => Number(b.enabled) - Number(a.enabled));

    const container = document.getElementById('modulesDetailList');
    container.innerHTML = filtered
      .map((mod) => {
        const isExpanded = expandedModules.has(mod.id);
        const activeTasks = mod.checklist.filter((t) => !t.skipped);
        const doneCount = activeTasks.filter((t) => t.completed).length;

        return `
          <article class="module-detail-card ${mod.enabled ? '' : 'disabled-module'}" id="mod-card-${esc(mod.id)}">
            <div class="mod-detail-header" data-toggle-expand="${esc(mod.id)}">
              <div class="mod-title-wrap">
                <span class="mod-icon">${esc(mod.icon)}</span>
                <div>
                  <span class="mod-cat-tag">${esc(mod.category)}</span>
                  <h3 class="mod-name" style="font-size:1.35rem;">${esc(mod.name)}</h3>
                </div>
              </div>

              <div style="display:flex; align-items:center; gap:0.85rem; flex-wrap:wrap;" onclick="event.stopPropagation();">
                <span class="badge ${mod.enabled ? 'success' : 'neutral'}">
                  ${mod.enabled ? `${doneCount}/${activeTasks.length} Tasks • ${fmtCurrency(mod.actualCost)}` : 'Greyed Out (Excluded)'}
                </span>
                <label class="switch">
                  <input type="checkbox" class="detail-mod-toggle" data-mod-id="${esc(mod.id)}" ${mod.enabled ? 'checked' : ''} />
                  <span class="slider"></span>
                  <span>${mod.enabled ? 'Included' : 'Skipped'}</span>
                </label>
                <button type="button" class="icon-btn expand-btn" data-toggle-btn="${esc(mod.id)}">
                  ${isExpanded ? '▲ Collapse' : '▼ Expand Worksheet'}
                </button>
              </div>
            </div>

            <div class="mod-detail-body ${isExpanded ? '' : 'collapsed'}">
              ${
                !mod.enabled
                  ? `<div class="disabled-banner">
                      <span>🚫 This module is currently greyed out. Its budget and tasks are excluded from your totals, but any notes below are preserved.</span>
                      <button type="button" class="btn btn-primary btn-sm quick-enable-btn" data-mod-id="${esc(mod.id)}">Re-Enable Module</button>
                    </div>`
                  : ''
              }

              <div class="mod-two-col">
                <!-- Left Column: Fillable Vendor & Logistics Worksheet -->
                <div>
                  <div class="worksheet-section-title">
                    <span>📋 Fillable Details & Vendor Info</span>
                    <button type="button" class="btn btn-secondary btn-sm add-custom-field-btn" data-mod-id="${esc(mod.id)}">+ Add Custom Field</button>
                  </div>

                  <div class="budget-inline-row">
                    <div>
                      <label style="font-size:0.75rem; font-weight:600;">Allocated Budget ($)</label>
                      <input type="number" class="input mod-budget-input" data-mod-id="${esc(mod.id)}" data-prop="budgetAllocated" value="${Number(mod.budgetAllocated) || 0}" />
                    </div>
                    <div>
                      <label style="font-size:0.75rem; font-weight:600;">Actual / Quoted Cost ($)</label>
                      <input type="number" class="input mod-budget-input" data-mod-id="${esc(mod.id)}" data-prop="actualCost" value="${Number(mod.actualCost) || 0}" />
                    </div>
                    <label class="toggle-inline">
                      <input type="checkbox" class="mod-flag-input" data-mod-id="${esc(mod.id)}" data-prop="contractSigned" ${mod.contractSigned ? 'checked' : ''} />
                      <span>Contract Signed</span>
                    </label>
                    <label class="toggle-inline">
                      <input type="checkbox" class="mod-flag-input" data-mod-id="${esc(mod.id)}" data-prop="depositPaid" ${mod.depositPaid ? 'checked' : ''} />
                      <span>Deposit Paid</span>
                    </label>
                  </div>

                  <div class="fields-grid">
                    ${mod.fields
                      .map((f, idx) => {
                        const isFull = f.type === 'textarea';
                        let inputHtml = '';
                        if (f.type === 'textarea') {
                          inputHtml = `<textarea class="input mod-field-input" data-mod-id="${esc(mod.id)}" data-field-idx="${idx}" placeholder="${esc(f.placeholder || '')}">${esc(f.value)}</textarea>`;
                        } else if (f.type === 'select') {
                          inputHtml = `<select class="input mod-field-input" data-mod-id="${esc(mod.id)}" data-field-idx="${idx}">
                            ${(f.options || [])
                              .map((opt) => `<option value="${esc(opt)}" ${f.value === opt ? 'selected' : ''}>${esc(opt)}</option>`)
                              .join('')}
                          </select>`;
                        } else {
                          inputHtml = `<input type="${esc(f.type || 'text')}" class="input mod-field-input" data-mod-id="${esc(mod.id)}" data-field-idx="${idx}" value="${esc(f.value)}" placeholder="${esc(f.placeholder || '')}" />`;
                        }
                        return `
                          <div class="field-item ${isFull ? 'full-width' : ''}">
                            <label>${esc(f.label)}</label>
                            ${inputHtml}
                          </div>
                        `;
                      })
                      .join('')}
                  </div>
                </div>

                <!-- Right Column: Module Preparation Checklist -->
                <div>
                  <div class="worksheet-section-title">
                    <span>☑️ ${esc(mod.name)} Checklist</span>
                    <span class="text-muted" style="font-size:0.8rem;">${doneCount}/${activeTasks.length} Done</span>
                  </div>

                  <div class="checklist-items-stack">
                    ${mod.checklist
                      .map(
                        (task) => `
                        <div class="task-row ${task.completed ? 'completed' : ''} ${task.skipped ? 'skipped' : ''}">
                          <div class="task-left">
                            <input type="checkbox" class="task-checkbox" data-mod-id="${esc(mod.id)}" data-task-id="${esc(task.id)}" ${task.completed ? 'checked' : ''} ${task.skipped ? 'disabled' : ''} />
                            <div style="flex:1;">
                              <div class="task-title">${esc(task.title)}</div>
                              <div class="task-meta">⏱ ${esc(task.timeline)} ${task.skipped ? '• <strong>Greyed Out (Skipped)</strong>' : ''}</div>
                              <input type="text" class="task-notes-input" data-mod-id="${esc(mod.id)}" data-task-id="${esc(task.id)}" value="${esc(task.notes || '')}" placeholder="Add note, vendor link, or reminder..." />
                            </div>
                          </div>
                          <div class="task-actions">
                            <button type="button" class="icon-btn skip-task-btn" title="Grey out / skip this task if not needed" data-mod-id="${esc(mod.id)}" data-task-id="${esc(task.id)}">
                              ${task.skipped ? 'Restore' : 'Skip / N/A'}
                            </button>
                            <button type="button" class="icon-btn delete-task-btn" title="Delete task" data-mod-id="${esc(mod.id)}" data-task-id="${esc(task.id)}">✕</button>
                          </div>
                        </div>
                      `
                      )
                      .join('')}
                  </div>

                  <form class="add-task-inline" data-mod-id="${esc(mod.id)}">
                    <input type="text" class="input new-task-title" placeholder="Add preparation task for ${esc(mod.name)}..." required />
                    <select class="input new-task-timeline" style="max-width:155px;">
                      <option value="12+ Months Out">12+ Months Out</option>
                      <option value="9–12 Months Out">9–12 Months Out</option>
                      <option value="6–9 Months Out">6–9 Months Out</option>
                      <option value="3–6 Months Out" selected>3–6 Months Out</option>
                      <option value="1–2 Months Out">1–2 Months Out</option>
                      <option value="2 Weeks Out">2 Weeks Out</option>
                      <option value="Wedding Week">Wedding Week</option>
                    </select>
                    <button type="submit" class="btn btn-primary btn-sm">+ Add</button>
                  </form>
                </div>
              </div>
            </div>
          </article>
        `;
      })
      .join('');

    bindModuleDetailEvents(container);
  }

  function bindModuleDetailEvents(container) {
    // Expand / Collapse header
    container.querySelectorAll('[data-toggle-expand]').forEach((hdr) => {
      hdr.addEventListener('click', () => {
        const id = hdr.dataset.toggleExpand;
        if (expandedModules.has(id)) expandedModules.delete(id);
        else expandedModules.add(id);
        renderModulesTab();
      });
    });

    container.querySelectorAll('[data-toggle-btn]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.toggleBtn;
        if (expandedModules.has(id)) expandedModules.delete(id);
        else expandedModules.add(id);
        renderModulesTab();
      });
    });

    // Enable / Disable switch
    container.querySelectorAll('.detail-mod-toggle').forEach((chk) => {
      chk.addEventListener('change', (e) => {
        const mod = appState.modules.find((m) => m.id === e.target.dataset.modId);
        if (mod) {
          mod.enabled = e.target.checked;
          if (mod.enabled) expandedModules.add(mod.id);
          persistState();
          renderAll();
        }
      });
    });

    container.querySelectorAll('.quick-enable-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const mod = appState.modules.find((m) => m.id === btn.dataset.modId);
        if (mod) {
          mod.enabled = true;
          persistState();
          renderAll();
        }
      });
    });

    // Budget & Flags
    container.querySelectorAll('.mod-budget-input').forEach((inp) => {
      inp.addEventListener('input', (e) => {
        const mod = appState.modules.find((m) => m.id === e.target.dataset.modId);
        if (mod) {
          mod[e.target.dataset.prop] = Number(e.target.value) || 0;
          persistState();
          renderHeaderAndKpis();
        }
      });
    });

    container.querySelectorAll('.mod-flag-input').forEach((chk) => {
      chk.addEventListener('change', (e) => {
        const mod = appState.modules.find((m) => m.id === e.target.dataset.modId);
        if (mod) {
          mod[e.target.dataset.prop] = e.target.checked;
          persistState();
          renderOverviewTab();
        }
      });
    });

    // Dynamic Vendor Worksheet Fields
    container.querySelectorAll('.mod-field-input').forEach((inp) => {
      inp.addEventListener('input', (e) => {
        const mod = appState.modules.find((m) => m.id === e.target.dataset.modId);
        const idx = Number(e.target.dataset.fieldIdx);
        if (mod && mod.fields[idx]) {
          mod.fields[idx].value = e.target.value;
          persistState();
          if (idx === 0) renderOverviewTab();
        }
      });
    });

    // Add custom field to a module
    container.querySelectorAll('.add-custom-field-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const label = prompt('Enter label for your new custom vendor field (e.g., "Instagram Handle", "Second Shooter Name", "Overtime Rate"):');
        if (!label || !label.trim()) return;
        const mod = appState.modules.find((m) => m.id === btn.dataset.modId);
        if (mod) {
          mod.fields.push({
            key: 'custom_' + Date.now(),
            label: label.trim(),
            type: 'text',
            value: '',
            placeholder: 'Enter details...'
          });
          persistState();
          renderModulesTab();
          showToast(`Added field "${label.trim()}"`);
        }
      });
    });

    // Checklist actions inside module
    bindTaskRowEvents(container);

    // Add new checklist task
    container.querySelectorAll('.add-task-inline').forEach((form) => {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const modId = form.dataset.modId;
        const titleInput = form.querySelector('.new-task-title');
        const timelineSelect = form.querySelector('.new-task-timeline');
        const mod = appState.modules.find((m) => m.id === modId);
        if (mod && titleInput.value.trim()) {
          mod.checklist.push({
            id: 't-' + Date.now(),
            title: titleInput.value.trim(),
            timeline: timelineSelect.value,
            completed: false,
            skipped: false,
            notes: ''
          });
          persistState();
          renderAll();
          showToast('Added task to checklist');
        }
      });
    });
  }

  function bindTaskRowEvents(scopeEl) {
    scopeEl.querySelectorAll('.task-checkbox').forEach((chk) => {
      chk.addEventListener('change', (e) => {
        const mod = appState.modules.find((m) => m.id === e.target.dataset.modId);
        const task = mod && mod.checklist.find((t) => t.id === e.target.dataset.taskId);
        if (task) {
          task.completed = e.target.checked;
          persistState();
          renderAll();
        }
      });
    });

    scopeEl.querySelectorAll('.task-notes-input').forEach((inp) => {
      inp.addEventListener('input', (e) => {
        const mod = appState.modules.find((m) => m.id === e.target.dataset.modId);
        const task = mod && mod.checklist.find((t) => t.id === e.target.dataset.taskId);
        if (task) {
          task.notes = e.target.value;
          persistState();
        }
      });
    });

    scopeEl.querySelectorAll('.skip-task-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const mod = appState.modules.find((m) => m.id === btn.dataset.modId);
        const task = mod && mod.checklist.find((t) => t.id === btn.dataset.taskId);
        if (task) {
          task.skipped = !task.skipped;
          if (task.skipped) task.completed = false;
          persistState();
          renderAll();
          showToast(task.skipped ? 'Task greyed out (marked N/A)' : 'Task restored');
        }
      });
    });

    scopeEl.querySelectorAll('.delete-task-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const mod = appState.modules.find((m) => m.id === btn.dataset.modId);
        if (mod) {
          mod.checklist = mod.checklist.filter((t) => t.id !== btn.dataset.taskId);
          persistState();
          renderAll();
        }
      });
    });
  }

  // Render Tab 3: Master Checklist
  function renderMasterChecklistTab() {
    const searchVal = (document.getElementById('checklistSearchInput').value || '').toLowerCase();
    const statusFilter = document.getElementById('checklistStatusFilter').value;
    const groupMode = document.getElementById('checklistGroupMode').value;

    const allTasks = [];
    appState.modules.forEach((mod) => {
      if (appState.meta.hideDisabledModules && !mod.enabled) return;
      mod.checklist.forEach((task) => {
        const effectivelySkipped = !mod.enabled || task.skipped;
        if (statusFilter === 'remaining' && (task.completed || effectivelySkipped)) return;
        if (statusFilter === 'completed' && (!task.completed || effectivelySkipped)) return;
        if (statusFilter === 'skipped' && !effectivelySkipped) return;

        if (
          searchVal &&
          !task.title.toLowerCase().includes(searchVal) &&
          !(task.notes || '').toLowerCase().includes(searchVal) &&
          !mod.name.toLowerCase().includes(searchVal)
        ) {
          return;
        }

        allTasks.push({
          ...task,
          modId: mod.id,
          modName: mod.name,
          modIcon: mod.icon,
          modEnabled: mod.enabled,
          effectivelySkipped
        });
      });
    });

    const groups = {};
    allTasks.forEach((item) => {
      const key = groupMode === 'timeline' ? item.timeline : `${item.modIcon} ${item.modName}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });

    const container = document.getElementById('masterChecklistContainer');
    const groupKeys = Object.keys(groups);

    if (groupKeys.length === 0) {
      container.innerHTML = `<div class="card text-muted" style="text-align:center; padding:2.5rem;">No checklist tasks match your current filters.</div>`;
      return;
    }

    container.innerHTML = groupKeys
      .map((gKey) => {
        const items = groups[gKey];
        return `
          <div class="card checklist-group-card">
            <div class="checklist-group-header">
              <h3>${esc(gKey)}</h3>
              <span class="badge neutral">${items.length} task(s)</span>
            </div>
            <div class="checklist-items-stack">
              ${items
                .map(
                  (t) => `
                  <div class="task-row ${t.completed ? 'completed' : ''} ${t.effectivelySkipped ? 'skipped' : ''}">
                    <div class="task-left">
                      <input type="checkbox" class="task-checkbox" data-mod-id="${esc(t.modId)}" data-task-id="${esc(t.id)}" ${t.completed ? 'checked' : ''} ${t.effectivelySkipped ? 'disabled' : ''} />
                      <div style="flex:1;">
                        <div class="task-title">${esc(t.title)}</div>
                        <div class="task-meta">
                          <span>${esc(t.modIcon)} ${esc(t.modName)}</span> • <span>⏱ ${esc(t.timeline)}</span>
                          ${!t.modEnabled ? ' • <strong>(Module Disabled / Greyed Out)</strong>' : t.skipped ? ' • <strong>(Task Skipped / N/A)</strong>' : ''}
                        </div>
                        <input type="text" class="task-notes-input" data-mod-id="${esc(t.modId)}" data-task-id="${esc(t.id)}" value="${esc(t.notes || '')}" placeholder="Add note..." />
                      </div>
                    </div>
                    <div class="task-actions">
                      <button type="button" class="icon-btn skip-task-btn" data-mod-id="${esc(t.modId)}" data-task-id="${esc(t.id)}">
                        ${t.skipped ? 'Restore' : 'Skip / N/A'}
                      </button>
                    </div>
                  </div>
                `
                )
                .join('')}
            </div>
          </div>
        `;
      })
      .join('');

    bindTaskRowEvents(container);
  }

  // Render Tab 4: Invite & Guest List
  function renderGuestsTab() {
    const m = computeMetrics();
    const householdsCount = appState.guests.length;
    const stdSentCount = appState.guests.filter((g) => g.saveTheDateSent).length;
    const inviteSentCount = appState.guests.filter((g) => g.inviteSent).length;
    const thankYouCount = appState.guests.filter((g) => g.thankYouSent).length;

    document.getElementById('guestStatsSummary').innerHTML = `
      <div class="guest-stat-box"><strong>${householdsCount}</strong><span>Households / Invites</span></div>
      <div class="guest-stat-box"><strong>${m.totalInvitedHeadcount}</strong><span>Total Invited Guests</span></div>
      <div class="guest-stat-box"><strong>${m.attendingHeadcount}</strong><span>Confirmed Attending</span></div>
      <div class="guest-stat-box"><strong>${m.pendingHeadcount}</strong><span>Awaiting RSVP</span></div>
      <div class="guest-stat-box"><strong>${stdSentCount}/${householdsCount}</strong><span>Save-the-Dates Sent</span></div>
      <div class="guest-stat-box"><strong>${inviteSentCount}/${householdsCount}</strong><span>Formal Invites Sent</span></div>
      <div class="guest-stat-box"><strong>${thankYouCount}/${householdsCount}</strong><span>Thank Yous Mailed</span></div>
    `;

    const search = (document.getElementById('guestSearchInput').value || '').toLowerCase();
    const rsvpFilter = document.getElementById('guestRsvpFilter').value;
    const groupFilter = document.getElementById('guestGroupFilter').value;

    const filtered = appState.guests.filter((g) => {
      if (rsvpFilter !== 'all' && g.rsvpStatus !== rsvpFilter) return false;
      if (groupFilter !== 'all' && g.group !== groupFilter) return false;
      if (
        search &&
        !g.name.toLowerCase().includes(search) &&
        !(g.dietary || '').toLowerCase().includes(search) &&
        !(g.tableNumber || '').toLowerCase().includes(search) &&
        !(g.email || '').toLowerCase().includes(search)
      ) {
        return false;
      }
      return true;
    });

    const container = document.getElementById('guestListContainer');
    if (filtered.length === 0) {
      container.innerHTML = `<div class="card text-muted" style="grid-column:1/-1; text-align:center; padding:2.5rem;">No guests match your filter criteria.</div>`;
      return;
    }

    container.innerHTML = filtered
      .map((g) => {
        const badgeClass =
          g.rsvpStatus === 'attending' ? 'success' : g.rsvpStatus === 'declined' ? 'neutral' : 'warning';
        const badgeLabel =
          g.rsvpStatus === 'attending' ? `Attending (${g.partySize})` : g.rsvpStatus === 'declined' ? 'Declined' : `Awaiting RSVP (${g.partySize})`;

        return `
          <div class="guest-card ${g.rsvpStatus === 'declined' ? 'declined' : ''}">
            <div class="guest-card-top">
              <div>
                <div class="guest-name">${esc(g.name)}</div>
                <div class="guest-sub">${esc(g.group)} • ${esc(g.side)}</div>
              </div>
              <span class="badge ${badgeClass}">${esc(badgeLabel)}</span>
            </div>

            <div class="guest-details-grid">
              <div><strong>🍽️ Meals:</strong> ${esc(g.mealChoice || 'TBD')}</div>
              <div><strong>🪑 Table:</strong> ${esc(g.tableNumber || 'Unassigned')}</div>
              <div><strong>⚠️ Dietary:</strong> ${esc(g.dietary || 'None')}</div>
              <div><strong>✉️ Contact:</strong> ${esc(g.email || '—')}</div>
            </div>

            ${g.address ? `<div style="font-size:0.78rem; color:var(--text-secondary);">📍 ${esc(g.address)}</div>` : ''}
            ${g.notes ? `<div style="font-size:0.78rem; color:var(--text-muted); font-style:italic;">“${esc(g.notes)}”</div>` : ''}

            <div class="guest-tracker-pills">
              <span class="tracker-chip ${g.saveTheDateSent ? 'done' : ''}" data-guest-id="${esc(g.id)}" data-toggle-prop="saveTheDateSent">
                ${g.saveTheDateSent ? '✓' : '○'} Save-the-Date
              </span>
              <span class="tracker-chip ${g.inviteSent ? 'done' : ''}" data-guest-id="${esc(g.id)}" data-toggle-prop="inviteSent">
                ${g.inviteSent ? '✓' : '○'} Invite Sent
              </span>
              <span class="tracker-chip ${g.thankYouSent ? 'done' : ''}" data-guest-id="${esc(g.id)}" data-toggle-prop="thankYouSent">
                ${g.thankYouSent ? '✓' : '○'} Thank You Card
              </span>
            </div>

            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:0.25rem; border-top:1px solid var(--border-subtle); padding-top:0.55rem;">
              <select class="input quick-rsvp-select" data-guest-id="${esc(g.id)}" style="padding:0.28rem 0.5rem; font-size:0.78rem; width:auto;">
                <option value="attending" ${g.rsvpStatus === 'attending' ? 'selected' : ''}>RSVP: Attending</option>
                <option value="pending" ${g.rsvpStatus === 'pending' ? 'selected' : ''}>RSVP: Pending</option>
                <option value="declined" ${g.rsvpStatus === 'declined' ? 'selected' : ''}>RSVP: Declined</option>
              </select>
              <div style="display:flex; gap:0.35rem;">
                <button type="button" class="icon-btn edit-guest-btn" data-guest-id="${esc(g.id)}">✎ Edit</button>
                <button type="button" class="icon-btn delete-guest-btn" data-guest-id="${esc(g.id)}">✕</button>
              </div>
            </div>
          </div>
        `;
      })
      .join('');

    // Bind quick tracker chips & RSVP dropdowns
    container.querySelectorAll('.tracker-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        const guest = appState.guests.find((x) => x.id === chip.dataset.guestId);
        const prop = chip.dataset.toggleProp;
        if (guest) {
          guest[prop] = !guest[prop];
          persistState();
          renderGuestsTab();
        }
      });
    });

    container.querySelectorAll('.quick-rsvp-select').forEach((sel) => {
      sel.addEventListener('change', (e) => {
        const guest = appState.guests.find((x) => x.id === e.target.dataset.guestId);
        if (guest) {
          guest.rsvpStatus = e.target.value;
          persistState();
          renderAll();
        }
      });
    });

    container.querySelectorAll('.edit-guest-btn').forEach((btn) => {
      btn.addEventListener('click', () => openGuestModal(btn.dataset.guestId));
    });

    container.querySelectorAll('.delete-guest-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (!confirm('Remove this guest household from your invite list?')) return;
        appState.guests = appState.guests.filter((x) => x.id !== btn.dataset.guestId);
        persistState();
        renderAll();
        showToast('Guest removed');
      });
    });
  }

  // Render Settings Form
  function renderSettingsTab() {
    const { meta } = appState;
    document.getElementById('metaCoupleNames').value = meta.coupleNames || '';
    document.getElementById('metaWeddingDate').value = meta.weddingDate || '';
    document.getElementById('metaLocationCity').value = meta.locationCity || '';
    document.getElementById('metaEstimatedBudget').value = meta.estimatedBudget || 0;
    document.getElementById('metaTargetGuestCount').value = meta.targetGuestCount || 100;
  }

  // Open Add/Edit Guest Modal
  function openGuestModal(guestId = null) {
    const modal = document.getElementById('guestModal');
    const title = document.getElementById('guestModalTitle');
    const guest = guestId ? appState.guests.find((g) => g.id === guestId) : null;

    title.textContent = guest ? 'Edit Guest / Household' : 'Add Guest / Household';
    document.getElementById('guestIdInput').value = guest ? guest.id : '';
    document.getElementById('guestNameInput').value = guest ? guest.name : '';
    document.getElementById('guestPartySizeInput').value = guest ? guest.partySize : 2;
    document.getElementById('guestRsvpInput').value = guest ? guest.rsvpStatus : 'pending';
    document.getElementById('guestSideInput').value = guest ? guest.side : 'Mutual';
    document.getElementById('guestGroupInput').value = guest ? guest.group : 'Friends';
    document.getElementById('guestMealInput').value = guest ? guest.mealChoice || '' : '';
    document.getElementById('guestTableInput').value = guest ? guest.tableNumber || '' : '';
    document.getElementById('guestDietaryInput').value = guest ? guest.dietary || '' : '';
    document.getElementById('guestEmailInput').value = guest ? guest.email || '' : '';
    document.getElementById('guestAddressInput').value = guest ? guest.address || '' : '';
    document.getElementById('guestStdInput').checked = guest ? !!guest.saveTheDateSent : false;
    document.getElementById('guestInviteInput').checked = guest ? !!guest.inviteSent : false;
    document.getElementById('guestThankYouInput').checked = guest ? !!guest.thankYouSent : false;
    document.getElementById('guestNotesInput').value = guest ? guest.notes || '' : '';

    modal.classList.remove('hidden');
  }

  function renderAll() {
    if (!appState) return;
    renderHeaderAndKpis();
    renderOverviewTab();
    renderModulesTab();
    renderMasterChecklistTab();
    renderGuestsTab();
    renderSettingsTab();
  }

  function bindGlobalEvents() {
    // Navigation buttons
    document.querySelectorAll('.nav-btn, .mob-nav-btn').forEach((btn) => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    document.getElementById('openQuickProfileBtn').addEventListener('click', () => {
      switchTab('settings');
    });

    // Hide greyed-out modules toggles
    const handleHideToggle = (e) => {
      appState.meta.hideDisabledModules = e.target.checked;
      persistState();
      renderAll();
    };
    document.getElementById('hideDisabledToggle').addEventListener('change', handleHideToggle);
    document.getElementById('hideDisabledModulesTabToggle').addEventListener('change', handleHideToggle);

    // Checklist search & filter
    document.getElementById('checklistSearchInput').addEventListener('input', renderMasterChecklistTab);
    document.getElementById('checklistStatusFilter').addEventListener('change', renderMasterChecklistTab);
    document.getElementById('checklistGroupMode').addEventListener('change', renderMasterChecklistTab);

    // Guest search & filter
    document.getElementById('guestSearchInput').addEventListener('input', renderGuestsTab);
    document.getElementById('guestRsvpFilter').addEventListener('change', renderGuestsTab);
    document.getElementById('guestGroupFilter').addEventListener('change', renderGuestsTab);

    // Guest Modal
    document.getElementById('openAddGuestModalBtn').addEventListener('click', () => openGuestModal(null));
    document.getElementById('closeGuestModalBtn').addEventListener('click', () => {
      document.getElementById('guestModal').classList.add('hidden');
    });
    document.getElementById('cancelGuestModalBtn').addEventListener('click', () => {
      document.getElementById('guestModal').classList.add('hidden');
    });

    document.getElementById('guestForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const existingId = document.getElementById('guestIdInput').value;
      const payload = {
        id: existingId || 'g-' + Date.now(),
        name: document.getElementById('guestNameInput').value.trim(),
        partySize: Number(document.getElementById('guestPartySizeInput').value) || 1,
        rsvpStatus: document.getElementById('guestRsvpInput').value,
        side: document.getElementById('guestSideInput').value,
        group: document.getElementById('guestGroupInput').value,
        mealChoice: document.getElementById('guestMealInput').value.trim(),
        tableNumber: document.getElementById('guestTableInput').value.trim(),
        dietary: document.getElementById('guestDietaryInput').value.trim(),
        email: document.getElementById('guestEmailInput').value.trim(),
        address: document.getElementById('guestAddressInput').value.trim(),
        saveTheDateSent: document.getElementById('guestStdInput').checked,
        inviteSent: document.getElementById('guestInviteInput').checked,
        thankYouSent: document.getElementById('guestThankYouInput').checked,
        notes: document.getElementById('guestNotesInput').value.trim()
      };

      if (existingId) {
        const idx = appState.guests.findIndex((g) => g.id === existingId);
        if (idx !== -1) appState.guests[idx] = payload;
      } else {
        appState.guests.unshift(payload);
      }

      document.getElementById('guestModal').classList.add('hidden');
      persistState();
      renderAll();
      showToast(existingId ? 'Guest updated' : 'Guest household added');
    });

    // Export Guest CSV
    document.getElementById('exportGuestsCsvBtn').addEventListener('click', () => {
      const headers = ['Name', 'PartySize', 'RSVP', 'Group', 'Side', 'Meals', 'Dietary', 'Table', 'Email', 'Address', 'SaveTheDateSent', 'InviteSent', 'ThankYouSent', 'Notes'];
      const rows = appState.guests.map((g) => [
        g.name,
        g.partySize,
        g.rsvpStatus,
        g.group,
        g.side,
        g.mealChoice,
        g.dietary,
        g.tableNumber,
        g.email,
        g.address,
        g.saveTheDateSent ? 'Yes' : 'No',
        g.inviteSent ? 'Yes' : 'No',
        g.thankYouSent ? 'Yes' : 'No',
        g.notes
      ]);
      const csvContent = [headers, ...rows]
        .map((r) => r.map((cell) => `"${String(cell || '').replace(/"/g, '""')}"`).join(','))
        .join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'wedding-invite-list.csv';
      a.click();
      URL.revokeObjectURL(url);
    });

    // Custom Module Modal
    const openCustomMod = () => document.getElementById('customModuleModal').classList.remove('hidden');
    const closeCustomMod = () => document.getElementById('customModuleModal').classList.add('hidden');
    document.getElementById('addCustomModuleBtn').addEventListener('click', openCustomMod);
    document.getElementById('addCustomModuleBtn2').addEventListener('click', openCustomMod);
    document.getElementById('closeCustomModuleModalBtn').addEventListener('click', closeCustomMod);
    document.getElementById('cancelCustomModuleBtn').addEventListener('click', closeCustomMod);

    document.getElementById('customModuleForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('customModName').value.trim();
      if (!name) return;
      const newMod = {
        id: 'mod-' + Date.now(),
        name,
        icon: document.getElementById('customModIcon').value.trim() || '✨',
        category: document.getElementById('customModCategory').value,
        enabled: true,
        budgetAllocated: Number(document.getElementById('customModBudget').value) || 0,
        actualCost: 0,
        depositPaid: false,
        contractSigned: false,
        fields: [
          { key: 'vendorName', label: 'Vendor / Contact Name', type: 'text', value: '', placeholder: 'Vendor or person responsible' },
          { key: 'contactDetails', label: 'Phone / Email / Website', type: 'text', value: '', placeholder: 'Contact details' },
          { key: 'scheduleNotes', label: 'Timeline & Delivery Notes', type: 'text', value: '', placeholder: 'Arrival time, setup instructions' },
          { key: 'details', label: 'Detailed Notes & Specifications', type: 'textarea', value: '', placeholder: 'Add custom details here...' }
        ],
        checklist: [
          { id: 'ct-1-' + Date.now(), title: `Research & book ${name}`, timeline: '6–9 Months Out', completed: false, skipped: false, notes: '' },
          { id: 'ct-2-' + Date.now(), title: `Finalize day-of details for ${name}`, timeline: '1 Month Out', completed: false, skipped: false, notes: '' }
        ]
      };
      appState.modules.push(newMod);
      expandedModules.add(newMod.id);
      closeCustomMod();
      document.getElementById('customModuleForm').reset();
      persistState();
      renderAll();
      switchTab('modules', newMod.id);
      showToast(`Created custom module "${name}"`);
    });

    // Settings Form
    document.getElementById('weddingProfileForm').addEventListener('submit', (e) => {
      e.preventDefault();
      appState.meta.coupleNames = document.getElementById('metaCoupleNames').value.trim();
      appState.meta.weddingDate = document.getElementById('metaWeddingDate').value;
      appState.meta.locationCity = document.getElementById('metaLocationCity').value.trim();
      appState.meta.estimatedBudget = Number(document.getElementById('metaEstimatedBudget').value) || 0;
      appState.meta.targetGuestCount = Number(document.getElementById('metaTargetGuestCount').value) || 100;
      persistState();
      renderAll();
      showToast('Wedding profile saved!');
    });

    // Backup & Restore
    document.getElementById('downloadJsonBackupBtn').addEventListener('click', () => {
      const blob = new Blob([JSON.stringify(appState, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vowcraft-wedding-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });

    document.getElementById('uploadJsonBackupInput').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const parsed = JSON.parse(evt.target.result);
          if (!parsed.meta || !Array.isArray(parsed.modules)) {
            alert('Invalid backup file format.');
            return;
          }
          appState = parsed;
          persistState();
          renderAll();
          showToast('Wedding backup restored successfully!');
        } catch (err) {
          alert('Could not parse JSON file.');
        }
      };
      reader.readAsText(file);
    });

    document.getElementById('printSummaryBtn').addEventListener('click', () => {
      window.print();
    });

    document.getElementById('resetDemoDataBtn').addEventListener('click', async () => {
      if (!confirm('Reset all wedding modules, checklists, and guests back to the default demo data?')) return;
      try {
        const res = await fetch('/api/reset', { method: 'POST' });
        if (res.ok) {
          appState = await res.json();
          localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
          renderAll();
          showToast('Reset to default demo data');
        }
      } catch (e) {
        localStorage.removeItem(STORAGE_KEY);
        location.reload();
      }
    });
  }

  document.addEventListener('DOMContentLoaded', initApp);
})();
