// 1Cell.Ai Content Hub Application Controller
import db from './db.js';

// Application State
let currentRole = 'marketing_admin';
let currentTheme = 'light';
let userFavorites = new Set(['doc-001', 'doc-004', 'doc-005']); // Default mock favorites
let recentAssets = ['doc-001', 'doc-007', 'doc-013'];
let activeSearchQuery = '';
let activeQuizTab = 'quiz'; // 'quiz' or 'leaderboard'
let currentActiveQuiz = null;
let quizProgress = {
  questionIndex: 0,
  selectedOption: null,
  answers: [], // list of selected option indexes
  isCompleted: false
};
let activeFilters = {
  department: [],
  product: [],
  contentType: [],
  cancerType: [],
  biomarker: [],
  region: [],
  status: [],
  year: []
};

// DOM References
const workspaceViewport = document.getElementById('workspaceViewport');
const sidebarItems = document.querySelectorAll('.sidebar .nav-item');
const globalSearchInput = document.getElementById('globalSearchInput');
const suggestionsDropdown = document.getElementById('suggestionsDropdown');
const roleSelect = document.getElementById('roleSelect');
const themeToggleBtn = document.getElementById('themeToggleBtn');
const themeSunIcon = document.getElementById('themeSunIcon');
const themeMoonIcon = document.getElementById('themeMoonIcon');
const toastContainer = document.getElementById('toastContainer');

// Login Portal DOM
const loginOverlay = document.getElementById('loginOverlay');
const loginForm = document.getElementById('loginForm');
const signOutBtn = document.getElementById('signOutBtn');

// Modals DOM
const previewModal = document.getElementById('previewModal');
const previewModalTitle = document.getElementById('previewModalTitle');
const previewToolbarTitle = document.getElementById('previewToolbarTitle');
const previewContentDisplay = document.getElementById('previewContentDisplay');
const previewModalClose = document.getElementById('previewModalClose');
const previewModalCloseBtn = document.getElementById('previewModalCloseBtn');
const previewBtnSp = document.getElementById('previewBtnSp');
const previewBtnDownload = document.getElementById('previewBtnDownload');
const previewRelationTag = document.getElementById('previewRelationTag');

const sharepointModal = document.getElementById('sharepointModal');
const sharepointModalClose = document.getElementById('sharepointModalClose');
const spMetadataDetails = document.getElementById('spMetadataDetails');
const spModalCopyPath = document.getElementById('spModalCopyPath');
const spModalOpenUrl = document.getElementById('spModalOpenUrl');

const uploadModal = document.getElementById('uploadModal');
const uploadModalClose = document.getElementById('uploadModalClose');
const uploadModalCancel = document.getElementById('uploadModalCancel');
const uploadModalSave = document.getElementById('uploadModalSave');
const uploadForm = document.getElementById('uploadForm');

// Role User profiles mapping
const userProfiles = {
  marketing_admin: { name: "Sarah Jenkins", role: "Marketing Admin", avatar: "MA" },
  sales: { name: "Rajesh Kumar", role: "Sales Specialist", avatar: "RS" },
  medical: { name: "Dr. Amanda Ross", role: "Medical Affairs Coordinator", avatar: "MD" },
  leadership: { name: "Devin Thorne", role: "VP Strategy & Leadership", avatar: "LD" }
};

// Authentication state controller
function checkAuth() {
  const authName = sessionStorage.getItem("authName");
  const authEmail = sessionStorage.getItem("authEmail");
  if (authName && authEmail) {
    document.body.classList.add("authenticated");
    return true;
  } else {
    document.body.classList.remove("authenticated");
    return false;
  }
}

// Name initials generator
function getInitials(name) {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return parts[0].substring(0, 2).toUpperCase();
}

// Initialize Application
function init() {
  // Check session authentication status on start
  checkAuth();

  // Navigation Routing
  sidebarItems.forEach(item => {
    item.addEventListener('click', () => {
      sidebarItems.forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      const route = item.getAttribute('data-route');
      renderRoute(route);
    });
  });

  // Role switching
  roleSelect.addEventListener('change', (e) => {
    currentRole = e.target.value;

    // Sync sessionStorage authDept if they switch roles manually (to keep category styling synced)
    let correspondingDept = 'Marketing';
    if (currentRole === 'sales') correspondingDept = 'Sales';
    else if (currentRole === 'medical') correspondingDept = 'Genomic Scientist';
    else if (currentRole === 'leadership') correspondingDept = 'Leadership';

    if (sessionStorage.getItem("authName")) {
      sessionStorage.setItem("authDept", correspondingDept);
    }

    updateUserBadge();
    updateSidebarCategories();
    showToast(`Switched access role to: ${userProfiles[currentRole].role}`);
    
    // Re-render current page to apply permissions
    const activeRoute = document.querySelector('.sidebar .nav-item.active').getAttribute('data-route');
    renderRoute(activeRoute);
  });

  // Theme switching
  themeToggleBtn.addEventListener('click', () => {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);
    if (currentTheme === 'dark') {
      themeSunIcon.style.display = 'block';
      themeMoonIcon.style.display = 'none';
    } else {
      themeSunIcon.style.display = 'none';
      themeMoonIcon.style.display = 'block';
    }
    showToast(`Switched to ${currentTheme} theme`);
  });

  // Global Search Box Listeners
  globalSearchInput.addEventListener('input', handleSearchInput);
  globalSearchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      triggerSearchHub(globalSearchInput.value);
    }
  });

  // Click outside search suggestions closes dropdown
  document.addEventListener('click', (e) => {
    if (!globalSearchInput.contains(e.target) && !suggestionsDropdown.contains(e.target)) {
      suggestionsDropdown.style.display = 'none';
    }
  });

  // Modal Closures
  [previewModalClose, previewModalCloseBtn].forEach(el => el.addEventListener('click', () => closeModal(previewModal)));
  sharepointModalClose.addEventListener('click', () => closeModal(sharepointModal));
  [uploadModalClose, uploadModalCancel].forEach(el => el.addEventListener('click', () => closeModal(uploadModal)));

  // Setup form submission for custom uploads
  uploadModalSave.addEventListener('click', handleMockUpload);

  // Authentication Event Listeners
  if (loginForm) {
    const emailInput = document.getElementById('loginEmail');
    const errorMsg = document.getElementById('loginErrorMessage');

    if (emailInput) {
      emailInput.addEventListener('input', () => {
        emailInput.classList.remove('input-error');
        if (errorMsg) errorMsg.style.display = 'none';
      });
    }

    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('loginName').value.trim();
      const email = document.getElementById('loginEmail').value.trim();
      const dept = document.getElementById('loginDept').value;

      // Email domain validation
      if (!email.toLowerCase().endsWith('@1cell.ai')) {
        if (emailInput) emailInput.classList.add('input-error');
        if (errorMsg) errorMsg.style.display = 'flex';
        showToast("Access denied: Only official @1cell.ai email domains are authorized.");
        return;
      }

      if (name && email && dept) {
        sessionStorage.setItem("authName", name);
        sessionStorage.setItem("authEmail", email);
        sessionStorage.setItem("authDept", dept);

        // Map department to matching role view
        let targetRole = 'marketing_admin';
        if (dept === 'Sales') targetRole = 'sales';
        else if (dept === 'Genomic Scientist') targetRole = 'medical';
        else if (dept === 'Leadership') targetRole = 'leadership';

        currentRole = targetRole;
        if (roleSelect) {
          roleSelect.value = targetRole;
        }

        checkAuth();
        updateUserBadge();
        updateSidebarCategories();
        renderRoute('dashboard');
        showToast(`Welcome to 1Cell.Ai, ${name}!`);
      }
    });
  }

  if (signOutBtn) {
    signOutBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      sessionStorage.removeItem("authName");
      sessionStorage.removeItem("authEmail");
      sessionStorage.removeItem("authDept");
      checkAuth();
      updateUserBadge();
      updateSidebarCategories();
      showToast("Signed out successfully.");
    });
  }

  // Set default profile details & render dashboard
  updateUserBadge();
  updateSidebarCategories();
  renderRoute('dashboard');
}

// Update bottom profile badge when role changes or custom login occurs
function updateUserBadge() {
  const profile = userProfiles[currentRole];
  const authName = sessionStorage.getItem("authName");
  const authDept = sessionStorage.getItem("authDept");
  
  if (authName) {
    document.getElementById('avatarPill').innerText = getInitials(authName);
    document.getElementById('userNameLabel').innerText = authName;
    if (authDept) {
      document.getElementById('userRoleLabel').innerText = `${authDept} (${profile.role})`;
    } else {
      document.getElementById('userRoleLabel').innerText = profile.role;
    }
  } else {
    document.getElementById('avatarPill').innerText = profile.avatar;
    document.getElementById('userNameLabel').innerText = profile.name;
    document.getElementById('userRoleLabel').innerText = profile.role;
  }

  // Sync author fields
  const authorInput = document.getElementById('formAuthor');
  if (authorInput) {
    authorInput.value = authName || profile.name;
  }
}

// Toggle sidebar menu items visibility based on user department
function updateSidebarCategories() {
  const authDept = sessionStorage.getItem("authDept");
  let dept = authDept;
  if (!dept) {
    if (currentRole === 'marketing_admin') dept = 'Marketing';
    else if (currentRole === 'sales') dept = 'Sales';
    else if (currentRole === 'medical') dept = 'Genomic Scientist';
    else if (currentRole === 'leadership') dept = 'Leadership';
  }

  const campaignsItem = document.querySelector('.sidebar .nav-item[data-route="campaigns"]');
  const brandAssetsItem = document.querySelector('.sidebar .nav-item[data-route="brand-assets"]');
  const templatesItem = document.querySelector('.sidebar .nav-item[data-route="templates"]');

  if (dept === 'Marketing') {
    if (campaignsItem) campaignsItem.style.display = '';
    if (brandAssetsItem) brandAssetsItem.style.display = '';
    if (templatesItem) templatesItem.style.display = '';
  } else {
    if (campaignsItem) campaignsItem.style.display = 'none';
    if (brandAssetsItem) brandAssetsItem.style.display = 'none';
    if (templatesItem) templatesItem.style.display = 'none';
  }
}

// Toast notification helper
function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `
    <span class="toast-success-icon">✓</span>
    <span class="toast-message">${message}</span>
  `;
  toastContainer.appendChild(toast);
  
  // Trigger animation
  setTimeout(() => toast.classList.add('active'), 50);
  
  // Remove after timeout
  setTimeout(() => {
    toast.classList.remove('active');
    setTimeout(() => toast.remove(), 400);
  }, 3000);
}

// Modal handling helpers
function openModal(modalEl) {
  modalEl.classList.add('active');
}

function closeModal(modalEl) {
  modalEl.classList.remove('active');
}

// Route Navigation Controller
function renderRoute(route) {
  // Clear main workspace
  workspaceViewport.innerHTML = '';
  suggestionsDropdown.style.display = 'none';

  // Role/Dept access controls mapping
  const authDept = sessionStorage.getItem("authDept");
  let dept = authDept;
  if (!dept) {
    if (currentRole === 'marketing_admin') dept = 'Marketing';
    else if (currentRole === 'sales') dept = 'Sales';
    else if (currentRole === 'medical') dept = 'Genomic Scientist';
    else if (currentRole === 'leadership') dept = 'Leadership';
  }

  if (dept !== 'Marketing' && (route === 'campaigns' || route === 'brand-assets' || route === 'templates')) {
    showToast("Access restricted: Section available to Marketing only.");
    // Switch active nav item in UI to dashboard
    sidebarItems.forEach(item => {
      if (item.getAttribute('data-route') === 'dashboard') {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
    renderRoute('dashboard');
    return;
  }

  switch (route) {
    case 'dashboard':
      renderDashboard();
      break;
    case 'company-assets':
      renderCompanyAssets();
      break;
    case 'products':
      renderProductHub();
      break;
    case 'cases':
      renderCaseLibrary();
      break;
    case 'publications':
      renderPublications();
      break;
    case 'campaigns':
      renderCampaignHub();
      break;
    case 'sales-enablement':
      renderSalesEnablement();
      break;
    case 'quiz':
      renderQuizPage();
      break;
    case 'videos':
      renderVideoLibrary();
      break;
    case 'speakers':
      renderSpeakerProfiles();
      break;
    case 'brand-assets':
      renderBrandGuidelines();
      break;
    case 'templates':
      renderTemplates();
      break;
    case 'favorites':
      renderFavorites();
      break;
    case 'analytics':
      renderAnalyticsDashboard();
      break;
    default:
      renderDashboard();
  }
}

// 1. Dashboard View
function renderDashboard() {
  let actionsHtml = '';

  // Check logged in department
  const authDept = sessionStorage.getItem("authDept");
  let dept = authDept;
  if (!dept) {
    if (currentRole === 'marketing_admin') dept = 'Marketing';
    else if (currentRole === 'sales') dept = 'Sales';
    else if (currentRole === 'medical') dept = 'Genomic Scientist';
    else if (currentRole === 'leadership') dept = 'Leadership';
  }

  // Conditionally render Admin uploads based on Role (exclude Sales)
  if (dept !== 'Sales' && (currentRole === 'marketing_admin' || currentRole === 'medical')) {
    actionsHtml = `
      <button class="btn-primary" id="dashUploadBtn">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" style="width:16px;height:16px;">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Register New Asset
      </button>
    `;
  }

  workspaceViewport.innerHTML = `
    <div class="welcome-banner">
      <div>
        <h1 class="welcome-title">1Cell.Ai Content Hub</h1>
        <p class="welcome-subtitle">Search, discover, and preview the latest approved company and product resources.</p>
      </div>
      <div class="welcome-banner-actions">
        ${actionsHtml}
      </div>
    </div>

    <!-- Quick Access Tiles -->
    <div class="dashboard-section">
      <div class="section-title-row">
        <h2 class="section-headline">Quick Access Assets</h2>
      </div>
      <div class="quick-tiles-grid">
        <div class="quick-tile-card" data-action="quick-access" data-id="doc-013">
          <div class="tile-icon-wrapper">📊</div>
          <div class="tile-label">Global Corporate Deck</div>
          <div class="tile-sublabel">Presentation (v1.0)</div>
        </div>
        <div class="quick-tile-card" data-action="quick-access" data-id="doc-001">
          <div class="tile-icon-wrapper">📄</div>
          <div class="tile-label">OncoIndx Brochure</div>
          <div class="tile-sublabel">Brochure (v2.3)</div>
        </div>
        <div class="quick-tile-card" data-action="quick-access" data-id="doc-004">
          <div class="tile-icon-wrapper">🧬</div>
          <div class="tile-label">OncoHRD validation</div>
          <div class="tile-sublabel">Research Paper (v3.0)</div>
        </div>
        <div class="quick-tile-card" data-action="quick-access" data-id="doc-007">
          <div class="tile-icon-wrapper">🔬</div>
          <div class="tile-label">OncoMonitor Case Study</div>
          <div class="tile-sublabel">Case Library</div>
        </div>
        <div class="quick-tile-card" data-action="quick-access" data-id="doc-005">
          <div class="tile-icon-wrapper">🎨</div>
          <div class="tile-label">Brand Guidelines</div>
          <div class="tile-sublabel">Brand Manual 2026</div>
        </div>
        <div class="quick-tile-card" data-action="quick-access" data-id="doc-011">
          <div class="tile-icon-wrapper">✉️</div>
          <div class="tile-label">Outreach Email Template</div>
          <div class="tile-sublabel">Campaign templates</div>
        </div>
      </div>
    </div>

    <!-- Dynamic sections columns -->
    <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 32px;">
      <!-- Left side: Recently Added & Pinned -->
      <div>
        <div class="dashboard-section">
          <div class="section-title-row">
            <h2 class="section-headline">Recommended & Pinned Resources</h2>
          </div>
          <div class="assets-grid" style="grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));">
            ${db.documents.filter(d => d.isPinned).map(d => renderDocumentCard(d)).join('')}
          </div>
        </div>

        <div class="dashboard-section">
          <div class="section-title-row">
            <h2 class="section-headline">Recently Added / Updated</h2>
          </div>
          <div class="assets-grid" style="grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));">
            ${db.documents.slice(0, 4).map(d => renderDocumentCard(d)).join('')}
          </div>
        </div>
      </div>

      <!-- Right side: Trending and Telemetry -->
      <div>
        <div class="dashboard-section">
          <div class="section-title-row">
            <h2 class="section-headline">Trending Content</h2>
          </div>
          <div style="display: flex; flex-direction: column; gap: 12px;">
            ${db.documents.filter(d => d.isTrending).map(d => `
              <div class="quick-tile-card" style="flex-direction: row; text-align: left; padding: 14px; gap:12px; align-items:center;" onclick="window.previewDocument('${d.id}')">
                <div class="tile-icon-wrapper" style="margin: 0; width: 36px; height: 36px; font-size:16px;">🔥</div>
                <div style="flex:1;">
                  <div class="tile-label" style="margin:0; font-size:12.5px;">${d.title}</div>
                  <div class="tile-sublabel">${d.viewCount} views • ${d.contentType}</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="dashboard-section">
          <div class="section-title-row">
            <h2 class="section-headline">Most Downloaded</h2>
          </div>
          <div style="display: flex; flex-direction: column; gap: 12px;">
            ${db.documents.sort((a,b) => b.downloadCount - a.downloadCount).slice(0, 3).map(d => `
              <div class="quick-tile-card" style="flex-direction: row; text-align: left; padding: 14px; gap:12px; align-items:center;" onclick="window.previewDocument('${d.id}')">
                <div class="tile-icon-wrapper" style="margin: 0; width: 36px; height: 36px; font-size:16px; color:#10b981; background-color:var(--success-light);">↓</div>
                <div style="flex:1;">
                  <div class="tile-label" style="margin:0; font-size:12.5px;">${d.title}</div>
                  <div class="tile-sublabel">${d.downloadCount} downloads • ${d.size}</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
  `;

  // Attach button triggers
  const dashUploadBtn = document.getElementById('dashUploadBtn');
  if (dashUploadBtn) {
    dashUploadBtn.addEventListener('click', () => {
      uploadForm.reset();
      openModal(uploadModal);
    });
  }

  // Quick access tile clicks
  document.querySelectorAll('[data-action="quick-access"]').forEach(tile => {
    tile.addEventListener('click', () => {
      const docId = tile.getAttribute('data-id');
      window.previewDocument(docId);
    });
  });
}

// Render document card template
function renderDocumentCard(doc) {
  const isFav = userFavorites.has(doc.id);
  const biomarkerBadge = doc.biomarker ? `<span class="badge badge-biomarker">${doc.biomarker}</span>` : '';
  const productTag = doc.product ? `<span class="badge badge-prod">${db.products.find(p => p.id === doc.product).name}</span>` : '';

  return `
    <div class="doc-card" id="card-${doc.id}">
      <div class="card-header-bar">
        <div class="card-type-icon">
          ${doc.contentType === 'Video' ? '🎥' : doc.contentType === 'Sales Deck' || doc.contentType === 'Presentation' ? '📊' : '📄'}
        </div>
        <div class="card-tags">
          <span class="badge badge-dept">${doc.department}</span>
          ${productTag}
          ${biomarkerBadge}
          <span class="badge badge-status-approved">${doc.status}</span>
        </div>
      </div>
      <div class="card-body">
        <h3 class="card-title" onclick="window.previewDocument('${doc.id}')">${doc.title}</h3>
        <p class="card-description">${doc.description}</p>
        <div class="card-metadata">
          <div class="meta-row">
            <span>Version:</span>
            <span class="meta-value">${doc.version}</span>
          </div>
          <div class="meta-row">
            <span>Updated:</span>
            <span class="meta-value">${doc.updatedDate}</span>
          </div>
          <div class="meta-row">
            <span>Owner:</span>
            <span class="meta-value">${doc.owner}</span>
          </div>
        </div>
      </div>
      <div class="card-actions-bar">
        <a class="sp-link-indicator" onclick="window.inspectSharepoint('${doc.id}')">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.5 21a3 3 0 003-3v-4.5a3 3 0 00-3-3h-1.5V9a3 3 0 00-3-3h-3V4.5a3 3 0 00-3-3H4.5a3 3 0 00-3 3V18a3 3 0 003 3h15zM6 4.5a1.5 1.5 0 011.5-1.5h1.5A1.5 1.5 0 0110.5 4.5V6H7.5A1.5 1.5 0 016 4.5z" />
          </svg>
          SharePoint Properties
        </a>
        <div style="display:flex; gap: 4px;">
          <button class="card-action-btn" onclick="window.open('${doc.sharePointUrl}', '_blank')" title="Open Document in SharePoint">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
            </svg>
          </button>
          <button class="card-action-btn ${isFav ? 'active' : ''}" onclick="window.toggleFavorite('${doc.id}')" title="Bookmark Asset">
            <svg xmlns="http://www.w3.org/2000/svg" fill="${isFav ? 'currentColor' : 'none'}" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
            </svg>
          </button>
          <button class="card-action-btn" onclick="window.shareAsset('${doc.id}')" title="Copy Document Share Link">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186l5.572 3.285m-5.572-3.285L12.79 6.94m0 0a2.25 2.25 0 103.504-1.408 2.25 2.25 0 00-3.504 1.408zm0 10.12l3.504 1.409a2.25 2.25 0 101.076-2.186l-4.58-1.833z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  `;
}

// 2. Company Assets View
function renderCompanyAssets() {
  const assets = db.documents.filter(d => d.product === null);
  workspaceViewport.innerHTML = `
    <div class="welcome-banner">
      <div>
        <h1 class="welcome-title">Company Profile & Corporate Assets</h1>
        <p class="welcome-subtitle">All general brand, deck, and legal summaries at a corporate wide level.</p>
      </div>
    </div>

    <!-- Brand Story & Mission/Vision Section from Guidelines v3.0 -->
    <div style="display: grid; grid-template-columns: 1.2fr 1fr 1fr; gap: 24px; margin-bottom: 40px; align-items: stretch;">
      <!-- About Us -->
      <div style="background-color: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 24px; display: flex; flex-direction: column; justify-content: center;">
        <h3 style="font-size: 18px; color: var(--accent-color); margin-bottom: 12px; font-weight: 700;">About 1Cell.Ai</h3>
        <p style="font-size: 13.5px; line-height: 1.6; color: var(--text-secondary); font-family: 'Source Serif 4', serif;">
          1Cell.Ai is a Cupertino, USA-based precision oncology company specializing in developing innovations in liquid biopsy, single-cell multiomics and digital pathology. We bring the power of Genomics data and Artificial Intelligence (AI) to healthcare.
        </p>
      </div>
      
      <!-- Mission Card (Dark Pioneer Blue Theme) -->
      <div style="background-color: #1A365D; border-radius: var(--radius-md); padding: 24px; color: #ffffff; display: flex; flex-direction: column; justify-content: space-between; border: 1px solid #1A365D;">
        <div>
          <h3 style="font-size: 18px; color: #DAA520; margin-bottom: 16px; font-weight: 700; border-bottom: 2px solid #DAA520; padding-bottom: 6px; display: inline-block;">Mission</h3>
          <p style="font-size: 15px; line-height: 1.6; font-family: 'Source Serif 4', serif;">
            Impacting lives of <span class="brand-highlight-2">one million cancer patients</span> by breakthrough innovations in science and AI technology.
          </p>
        </div>
        <div style="font-size: 11px; opacity: 0.6; font-family: 'Outfit', sans-serif; margin-top: 12px;">Guidelines v3.0 Core Value</div>
      </div>

      <!-- Vision Card (Light Theme) -->
      <div style="background-color: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 24px; display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <h3 style="font-size: 18px; color: #1A365D; margin-bottom: 16px; font-weight: 700; border-bottom: 2px solid #DAA520; padding-bottom: 6px; display: inline-block;">Vision</h3>
          <p style="font-size: 15px; line-height: 1.6; color: var(--text-secondary); font-family: 'Source Serif 4', serif;">
            Democratizing precision oncology, by making it <span class="brand-link" onclick="window.triggerSearchHub('')">actionable, accessible and affordable</span>.
          </p>
        </div>
        <div style="font-size: 11px; color: var(--text-tertiary); font-family: 'Outfit', sans-serif; margin-top: 12px;">Guidelines v3.0 Core Value</div>
      </div>
    </div>

    <div class="dashboard-section">
      <h2 class="section-headline" style="margin-bottom: 20px;">Corporate Materials & Assets</h2>
      <div class="assets-grid">
        ${assets.map(d => renderDocumentCard(d)).join('')}
      </div>
    </div>
  `;
}

// 3. Product Hub View
function renderProductHub() {
  workspaceViewport.innerHTML = `
    <div class="welcome-banner">
      <div>
        <h1 class="welcome-title">1Cell.Ai Product Hub Workspaces</h1>
        <p class="welcome-subtitle">Detailed workspace microsites for every clinical genomics assay model.</p>
      </div>
    </div>

    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); gap: 24px;">
      ${db.products.map(p => {
        const docCount = db.documents.filter(d => d.product === p.id).length;
        const caseCount = db.cases.filter(c => c.relatedProduct === p.id).length;
        const pubCount = db.publications.filter(pub => pub.relatedProduct === p.id).length;
        return `
          <div class="quick-tile-card" style="align-items: flex-start; text-align: left; padding: 24px;" onclick="window.openProductMicrosite('${p.id}')">
            <div class="tile-icon-wrapper" style="width: 42px; height: 42px; font-size:20px;">🔬</div>
            <h3 style="font-size:18px; margin-bottom: 8px; font-weight:700;">${p.name}</h3>
            <p style="font-size:12.5px; color:var(--text-secondary); line-height:1.5; margin-bottom: 20px;">${p.description}</p>
            <div style="display:flex; flex-wrap:wrap; gap:6px; margin-top:auto; font-size:11px; font-weight:600; color:var(--text-tertiary);">
              <span style="background-color:var(--bg-tertiary); padding:2px 8px; border-radius:4px;">${docCount} Documents</span>
              <span style="background-color:var(--bg-tertiary); padding:2px 8px; border-radius:4px;">${caseCount} Cases</span>
              <span style="background-color:var(--bg-tertiary); padding:2px 8px; border-radius:4px;">${pubCount} Scientific Pubs</span>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// Product Microsite Workspace Detail view
window.openProductMicrosite = function(prodId) {
  const product = db.products.find(p => p.id === prodId);
  const docs = db.documents.filter(d => d.product === prodId);
  const cases = db.cases.filter(c => c.relatedProduct === prodId);
  const publications = db.publications.filter(pub => pub.relatedProduct === prodId);
  const videos = db.videos.filter(vid => vid.product === prodId);

  workspaceViewport.innerHTML = `
    <div class="product-workspace-header">
      <div class="product-tagline">1Cell.Ai Genomic Assays</div>
      <div class="product-title-row">
        <div>
          <h1 class="product-name">${product.name}</h1>
        </div>
        <div class="product-stats">
          <div class="product-stat-box">
            <div class="product-stat-num">${docs.length}</div>
            <div class="product-stat-lbl">Assets</div>
          </div>
          <div class="product-stat-box">
            <div class="product-stat-num">${cases.length}</div>
            <div class="product-stat-lbl">Cases</div>
          </div>
          <div class="product-stat-box">
            <div class="product-stat-num">${publications.length}</div>
            <div class="product-stat-lbl">Pubs</div>
          </div>
        </div>
      </div>
      <p class="product-description-full">${product.details}</p>

      <div class="product-tabs-row">
        <button class="product-tab-btn active" onclick="window.switchProductTab(event, '${prodId}', 'assets')">All Assets</button>
        <button class="product-tab-btn" onclick="window.switchProductTab(event, '${prodId}', 'clinical')">Clinical & Competitors</button>
        <button class="product-tab-btn" onclick="window.switchProductTab(event, '${prodId}', 'cases')">Case Studies (${cases.length})</button>
        <button class="product-tab-btn" onclick="window.switchProductTab(event, '${prodId}', 'publications')">Publications (${publications.length})</button>
        <button class="product-tab-btn" onclick="window.switchProductTab(event, '${prodId}', 'videos')">Videos & Demos (${videos.length})</button>
      </div>
    </div>

    <div id="productTabContent" class="product-workspace-content">
      <!-- Default tab: All Assets -->
      <div class="assets-grid">
        ${docs.map(d => renderDocumentCard(d)).join('')}
      </div>
    </div>
  `;
}

// Switch tabs inside Product Workspace
window.switchProductTab = function(event, prodId, tabName) {
  // Highlight correct tab
  const tabs = document.querySelectorAll('.product-tab-btn');
  tabs.forEach(t => t.classList.remove('active'));
  event.target.classList.add('active');

  const product = db.products.find(p => p.id === prodId);
  const container = document.getElementById('productTabContent');
  
  if (tabName === 'assets') {
    const docs = db.documents.filter(d => d.product === prodId);
    container.innerHTML = `
      <div class="assets-grid">
        ${docs.map(d => renderDocumentCard(d)).join('')}
      </div>
    `;
  } else if (tabName === 'clinical') {
    container.innerHTML = `
      <div class="product-details-grid">
        <div class="detail-card">
          <h3 class="detail-card-title">Clinical Benefits & Evidence</h3>
          <ul class="detail-list">
            ${product.clinicalBenefits.map(b => `<li class="detail-list-item">${b}</li>`).join('')}
          </ul>
        </div>
        <div class="detail-card">
          <h3 class="detail-card-title">Competitive Advantages</h3>
          <p style="font-size: 13.5px; line-height:1.6; color:var(--text-secondary);">${product.competitiveAdvantage}</p>
          <div style="background-color: var(--accent-light); padding:16px; border-radius:8px; margin-top:20px;">
            <strong style="font-size:12.5px; color:var(--accent-color);">Sales Pitch Tip</strong>
            <p style="font-size: 11.5px; color:var(--text-secondary); margin-top:4px;">Highlight spatial tumor pathology parameters which general competitor sequencing assays completely miss.</p>
          </div>
        </div>
      </div>
    `;
  } else if (tabName === 'cases') {
    const cases = db.cases.filter(c => c.relatedProduct === prodId);
    if (cases.length === 0) {
      container.innerHTML = `<p style="color:var(--text-tertiary); text-align:center; padding:40px;">No registered clinical cases found for this product.</p>`;
      return;
    }
    container.innerHTML = `
      <div class="assets-grid">
        ${cases.map(c => `
          <div class="doc-card">
            <div class="case-card-header">
              <span class="badge badge-biomarker">${c.biomarker}</span>
              <h3 style="font-size:15px; font-weight:700; margin-top:8px;">${c.title}</h3>
              <div class="case-hospital">${c.doctor} • ${c.hospital}</div>
            </div>
            <div class="card-body" style="padding-top:16px;">
              <div class="case-details-summary">${c.summary}</div>
              <div class="case-field-grid">
                <div>
                  <span style="font-size:10px; color:var(--text-tertiary); text-transform:uppercase;">Treatment</span>
                  <div style="font-size:11.5px; font-weight:550; margin-top:2px;">${c.treatment}</div>
                </div>
                <div>
                  <span style="font-size:10px; color:var(--text-tertiary); text-transform:uppercase;">Outcome</span>
                  <div style="font-size:11.5px; font-weight:550; margin-top:2px; color:var(--success);">${c.outcome}</div>
                </div>
              </div>
            </div>
            <div class="card-actions-bar">
              <button class="btn-outline" style="padding:6px 12px; font-size:11px;" onclick="window.previewDocument('doc-007')">Preview Case</button>
              <button class="btn-primary" style="padding:6px 12px; font-size:11px;" onclick="window.triggerDownload('${c.title}')">Download Case Report</button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  } else if (tabName === 'publications') {
    const pubs = db.publications.filter(pub => pub.relatedProduct === prodId);
    if (pubs.length === 0) {
      container.innerHTML = `<p style="color:var(--text-tertiary); text-align:center; padding:40px;">No research publications linked to this product.</p>`;
      return;
    }
    container.innerHTML = `
      <div>
        ${pubs.map(pub => `
          <div class="pub-item">
            <div class="pub-journal">${pub.journal} (${pub.publishedDate})</div>
            <h3 style="font-size:17px; font-weight:700; margin-bottom:8px;">${pub.title}</h3>
            <div class="pub-authors">${pub.authors}</div>
            <div class="pub-abstract-box"><strong>Abstract:</strong> ${pub.abstract}</div>
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <div class="pub-citation"><strong>Citation:</strong> ${pub.citation}</div>
              <button class="btn-primary" style="padding:8px 16px; font-size:12px;" onclick="window.triggerDownload('${pub.title}')">Download PDF</button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  } else if (tabName === 'videos') {
    const videos = db.videos.filter(vid => vid.product === prodId);
    if (videos.length === 0) {
      container.innerHTML = `<p style="color:var(--text-tertiary); text-align:center; padding:40px;">No clinical or demo videos uploaded yet.</p>`;
      return;
    }
    container.innerHTML = `
      <div class="assets-grid">
        ${videos.map(vid => `
          <div class="doc-card" onclick="window.previewDocument('doc-016')">
            <div class="video-card-thumbnail">
              <div class="video-play-icon">▶</div>
              <span class="video-duration">${vid.duration}</span>
            </div>
            <div class="card-body" style="padding:16px;">
              <h3 style="font-size:13.5px; font-weight:700; margin-bottom:6px;">${vid.title}</h3>
              <div style="display:flex; justify-content:space-between; font-size:11px; color:var(--text-tertiary);">
                <span>Speaker: ${vid.speaker}</span>
                <span>Type: ${vid.type}</span>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }
}

// 4. Case Library Route
function renderCaseLibrary() {
  workspaceViewport.innerHTML = `
    <div class="welcome-banner">
      <div>
        <h1 class="welcome-title">Clinical Case Library</h1>
        <p class="welcome-subtitle">Search real-world medical responses and genomics validation summaries.</p>
      </div>
    </div>
    
    <div class="assets-grid">
      ${db.cases.map(c => `
        <div class="doc-card">
          <div class="case-card-header">
            <span class="badge badge-biomarker" style="margin-right:6px;">${c.biomarker}</span>
            <span class="badge badge-prod">${db.products.find(p => p.id === c.relatedProduct).name}</span>
            <h3 style="font-size:16px; font-weight:700; margin-top:8px;">${c.title}</h3>
            <div class="case-hospital">${c.doctor} • ${c.hospital}</div>
          </div>
          <div class="card-body" style="padding-top:16px;">
            <div class="case-details-summary">${c.summary}</div>
            <div class="case-field-grid">
              <div>
                <span style="font-size:10px; color:var(--text-tertiary); text-transform:uppercase;">Cancer Type</span>
                <div style="font-size:12px; font-weight:600; margin-top:2px;">${c.cancerType}</div>
              </div>
              <div>
                <span style="font-size:10px; color:var(--text-tertiary); text-transform:uppercase;">Outcome</span>
                <div style="font-size:12px; font-weight:600; margin-top:2px; color:var(--success);">${c.outcome}</div>
              </div>
            </div>
          </div>
          <div class="card-actions-bar">
            <button class="btn-outline" style="padding:6px 12px; font-size:11px;" onclick="window.previewDocument('doc-007')">Preview Case</button>
            <button class="btn-primary" style="padding:6px 12px; font-size:11px;" onclick="window.triggerDownload('${c.title}')">Download PDF</button>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// 5. Publications Route
function renderPublications() {
  workspaceViewport.innerHTML = `
    <div class="welcome-banner">
      <div>
        <h1 class="welcome-title">Peer-Reviewed Publications</h1>
        <p class="welcome-subtitle">A library of clinical validity studies, poster presentations, and journal abstracts.</p>
      </div>
    </div>
    
    <div>
      ${db.publications.map(pub => `
        <div class="pub-item">
          <div style="display:flex; justify-content:space-between; align-items:flex-start;">
            <div class="pub-journal">${pub.journal} • Published ${pub.publishedDate}</div>
            <span class="badge badge-prod">${db.products.find(p => p.id === pub.relatedProduct).name}</span>
          </div>
          <h3 style="font-size:18px; font-weight:700; margin-bottom:8px;">${pub.title}</h3>
          <div class="pub-authors">${pub.authors}</div>
          <div class="pub-abstract-box"><strong>Abstract:</strong> ${pub.abstract}</div>
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap: 12px;">
            <div class="pub-citation"><strong>Citation:</strong> ${pub.citation}</div>
            <div style="display:flex; gap:8px;">
              <button class="btn-outline" style="padding:8px 16px; font-size:12px;" onclick="window.previewDocument('doc-004')">Preview Publication</button>
              <button class="btn-primary" style="padding:8px 16px; font-size:12px;" onclick="window.triggerDownload('${pub.title}')">Download PDF</button>
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// 6. Campaign Hub Route
function renderCampaignHub() {
  workspaceViewport.innerHTML = `
    <div class="welcome-banner">
      <div>
        <h1 class="welcome-title">Marketing Campaign Hub</h1>
        <p class="welcome-subtitle">Track outbound promotional campaign channels, copy creatives, and view asset linkages.</p>
      </div>
    </div>
    
    <div style="display: flex; flex-direction: column; gap: 24px;">
      ${db.campaigns.map(camp => `
        <div class="pub-item" style="margin-bottom:0;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            <h3 style="font-size:18px; font-weight:700; margin:0;">${camp.name}</h3>
            <span class="badge ${camp.status === 'Active' ? 'badge-status-approved' : 'badge-status-draft'}">${camp.status}</span>
          </div>
          <p style="font-size:13.5px; color:var(--text-secondary); margin-bottom:16px;"><strong>Objective:</strong> ${camp.objective}</p>
          
          <div class="campaign-performance-box">
            <div class="campaign-perf-metric">
              <div class="campaign-perf-lbl">Target Audience</div>
              <div class="campaign-perf-val" style="font-size:14px; margin-top:4px;">${camp.audience}</div>
            </div>
            <div class="campaign-perf-metric">
              <div class="campaign-perf-lbl">Platforms</div>
              <div class="campaign-perf-val" style="font-size:14px; margin-top:4px;">${camp.platform}</div>
            </div>
            <div class="campaign-perf-metric">
              <div class="campaign-perf-lbl">Open Rate (Avg)</div>
              <div class="campaign-perf-val">${camp.openRate}</div>
            </div>
            <div class="campaign-perf-metric">
              <div class="campaign-perf-lbl">CTR</div>
              <div class="campaign-perf-val">${camp.ctr}</div>
            </div>
            <div class="campaign-perf-metric">
              <div class="campaign-perf-lbl">Conversions</div>
              <div class="campaign-perf-val">${camp.conversions}</div>
            </div>
          </div>
          
          <div style="margin-top:20px;">
            <strong style="font-size:12px; color:var(--text-tertiary); text-transform:uppercase;">Assets Linked to this Campaign:</strong>
            <div class="assets-grid" style="grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); margin-top:10px;">
              ${db.documents.filter(d => camp.assetsUsed.includes(d.id)).map(d => renderDocumentCard(d)).join('')}
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// 6.5. Sales Enablement Route
function renderSalesEnablement() {
  const assets = db.documents.filter(d => d.department === "Sales Enablement");
  workspaceViewport.innerHTML = `
    <div class="welcome-banner">
      <div>
        <h1 class="welcome-title">Sales Enablement Portal</h1>
        <p class="welcome-subtitle">Obtain sales guidelines, pitch training presentations, and competitor battlecards for the 1Cell.Ai ASM team.</p>
      </div>
    </div>
    
    <div class="dashboard-section">
      <h2 class="section-headline" style="margin-bottom: 20px;">1Cell.Ai ASM Resources & Playbooks</h2>
      <div class="assets-grid">
        ${assets.map(d => renderDocumentCard(d)).join('')}
      </div>
    </div>
  `;
}

// 7. Video Library Route
function renderVideoLibrary() {
  workspaceViewport.innerHTML = `
    <div class="welcome-banner">
      <div>
        <h1 class="welcome-title">1Cell.Ai Digital Video Library</h1>
        <p class="welcome-subtitle">Browse doctor interviews, webinars, and genomics sequencing demo clips.</p>
      </div>
    </div>
    
    <div class="assets-grid">
      ${db.videos.map(vid => `
        <div class="doc-card" onclick="window.previewDocument('doc-016')">
          <div class="video-card-thumbnail">
            <div class="video-play-icon">▶</div>
            <span class="video-duration">${vid.duration}</span>
          </div>
          <div class="card-body" style="padding:16px;">
            <span class="badge badge-prod" style="align-self: flex-start; margin-bottom:8px;">${db.products.find(p => p.id === vid.product).name}</span>
            <h3 style="font-size:14px; font-weight:700; margin-bottom:6px;">${vid.title}</h3>
            <div style="display:flex; justify-content:space-between; font-size:11.5px; color:var(--text-tertiary); margin-top:auto;">
              <span>Speaker: ${vid.speaker}</span>
              <span>Type: ${vid.type}</span>
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// 8. Speaker Profiles Route
function renderSpeakerProfiles() {
  workspaceViewport.innerHTML = `
    <div class="welcome-banner">
      <div>
        <h1 class="welcome-title">Speaker Profiles & Medical Experts</h1>
        <p class="welcome-subtitle">Academic profiles and content assets linked to clinical key opinion leaders.</p>
      </div>
    </div>
    
    <div class="speakers-grid">
      ${db.speakers.map(spk => `
        <div class="speaker-card">
          <img src="${spk.photo}" alt="${spk.name}" class="speaker-photo">
          <div class="speaker-info">
            <h3 class="speaker-name">${spk.name}</h3>
            <div class="speaker-details">
              <div style="font-weight:600; color:var(--text-primary);">${spk.specialization}</div>
              <div style="color:var(--text-tertiary); font-size:11.5px; margin-top:2px;">${spk.hospital}</div>
              <div style="font-size:11px; margin-top:6px; color:var(--accent-color);">${spk.contact}</div>
            </div>
            
            <div class="speaker-relations">
              <span style="font-size:10px; font-weight:700; color:var(--text-tertiary); text-transform:uppercase;">Linked Resources:</span>
              <div style="margin-top:6px;">
                ${spk.publications.map(p => `<div class="relation-item"><span>📄</span> <span style="cursor:pointer;" onclick="window.previewDocument('doc-004')">${p}</span></div>`).join('')}
                ${spk.presentations.map(p => `<div class="relation-item"><span>📊</span> <span style="cursor:pointer;" onclick="window.previewDocument('doc-002')">${p}</span></div>`).join('')}
              </div>
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// 9. Brand Guidelines Route
function renderBrandGuidelines() {
  workspaceViewport.innerHTML = `
    <div class="welcome-banner">
      <div>
        <h1 class="welcome-title">Corporate Brand Assets & Guidelines</h1>
        <p class="welcome-subtitle">Core logos, fonts, templates, and corporate identities managed for external branding.</p>
      </div>
    </div>
    
    <div class="assets-grid">
      ${db.brandAssets.map(asset => `
        <div class="doc-card">
          <div class="card-header-bar">
            <div class="card-type-icon">🎨</div>
            <span class="badge badge-dept">Corporate</span>
          </div>
          <div class="card-body">
            <h3 class="card-title">${asset.title}</h3>
            <div class="card-metadata" style="border-top:none; padding:0; margin-bottom:12px;">
              <div class="meta-row">
                <span>Category:</span>
                <span class="meta-value">${asset.category}</span>
              </div>
              <div class="meta-row">
                <span>Format:</span>
                <span class="meta-value">${asset.fileType}</span>
              </div>
            </div>
          </div>
          <div class="card-actions-bar" style="justify-content: flex-end;">
            <button class="btn-primary" style="padding:6px 12px; font-size:11px;" onclick="window.triggerDownload('${asset.title}')">Download Asset</button>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// 10. Templates Route
function renderTemplates() {
  workspaceViewport.innerHTML = `
    <div class="welcome-banner">
      <div>
        <h1 class="welcome-title">Document Templates & Outlines</h1>
        <p class="welcome-subtitle">Pre-approved layouts for presentations, cases, publications, and creatives.</p>
      </div>
    </div>
    
    <div class="assets-grid">
      ${db.templates.map(temp => `
        <div class="doc-card">
          <div class="card-header-bar">
            <div class="card-type-icon">📄</div>
            <span class="badge badge-dept">Marketing</span>
          </div>
          <div class="card-body">
            <h3 class="card-title">${temp.title}</h3>
            <div class="card-metadata" style="border-top:none; padding:0; margin-bottom:12px;">
              <div class="meta-row">
                <span>Category:</span>
                <span class="meta-value">${temp.category} Templates</span>
              </div>
            </div>
          </div>
          <div class="card-actions-bar" style="justify-content: flex-end;">
            <button class="btn-primary" style="padding:6px 12px; font-size:11px;" onclick="window.triggerDownload('${temp.title}')">Download Template</button>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// 11. Favorites Route
function renderFavorites() {
  const favs = db.documents.filter(d => userFavorites.has(d.id));
  if (favs.length === 0) {
    workspaceViewport.innerHTML = `
      <div class="welcome-banner">
        <div>
          <h1 class="welcome-title">Your Bookmarks & Favorites</h1>
          <p class="welcome-subtitle">Quick access list of assets pinned by your profile.</p>
        </div>
      </div>
      <p style="color:var(--text-tertiary); text-align:center; padding:80px;">No bookmarked items. Click the bookmark icon on any document card to pin it here.</p>
    `;
    return;
  }
  workspaceViewport.innerHTML = `
    <div class="welcome-banner">
      <div>
        <h1 class="welcome-title">Your Bookmarks & Favorites</h1>
        <p class="welcome-subtitle">Quick access list of assets pinned by your profile.</p>
      </div>
    </div>
    <div class="assets-grid">
      ${favs.map(d => renderDocumentCard(d)).join('')}
    </div>
  `;
}

// 12. Dashboard Analytics Route
function renderAnalyticsDashboard() {
  const counts = db.analytics.assetsByDepartment;
  const prodCounts = db.analytics.assetsByProduct;
  
  workspaceViewport.innerHTML = `
    <div class="welcome-banner">
      <div>
        <h1 class="welcome-title">Content Analytics Dashboard</h1>
        <p class="welcome-subtitle">Usage metrics, top keyword queries, downloads telemetry, and active curators.</p>
      </div>
    </div>

    <!-- Stats summary grid -->
    <div class="analytics-grid">
      <div class="stat-card">
        <div class="stat-header">
          <span class="stat-title">Total Indexed Assets</span>
          <span class="stat-icon">📄</span>
        </div>
        <div class="stat-number">${db.documents.length}</div>
        <div class="stat-subtext">Active files in SharePoint</div>
      </div>
      <div class="stat-card">
        <div class="stat-header">
          <span class="stat-title">Added This Month</span>
          <span class="stat-icon">📈</span>
        </div>
        <div class="stat-number">+${db.analytics.assetsAddedThisMonth}</div>
        <div class="stat-subtext">Marketing & Medical Uploads</div>
      </div>
      <div class="stat-card">
        <div class="stat-header">
          <span class="stat-title">Total Views</span>
          <span class="stat-icon">👁</span>
        </div>
        <div class="stat-number">${db.analytics.telemetry.views}</div>
        <div class="stat-subtext">Across all sales divisions</div>
      </div>
      <div class="stat-card">
        <div class="stat-header">
          <span class="stat-title">Downloads Telemetry</span>
          <span class="stat-icon">↓</span>
        </div>
        <div class="stat-number">${db.analytics.telemetry.downloads}</div>
        <div class="stat-subtext">Offline presentations/PDFs</div>
      </div>
    </div>

    <!-- Charts row -->
    <div class="analytics-charts-row">
      <div class="chart-card">
        <h3 class="chart-title">Assets By Department</h3>
        <div class="progress-bar-list">
          ${Object.keys(counts).map(dept => {
            const percentage = (counts[dept] / db.documents.length) * 100;
            return `
              <div class="bar-row">
                <div class="bar-labels">
                  <span>${dept}</span>
                  <span>${counts[dept]} files (${Math.round(percentage)}%)</span>
                </div>
                <div class="bar-outer">
                  <div class="bar-inner" style="width: ${percentage}%"></div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <div class="chart-card">
        <h3 class="chart-title">Assets By Product Workspace</h3>
        <div class="progress-bar-list">
          ${Object.keys(prodCounts).slice(0, 5).map(prodId => {
            const product = db.products.find(p => p.id === prodId);
            const percentage = (prodCounts[prodId] / db.documents.length) * 100;
            return `
              <div class="bar-row">
                <div class="bar-labels">
                  <span>${product ? product.name : 'Corporate'}</span>
                  <span>${prodCounts[prodId]} files</span>
                </div>
                <div class="bar-outer">
                  <div class="bar-inner" style="width: ${percentage}%; background-color:#10b981;"></div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>

    <!-- Popular Assets & active curators -->
    <div style="display:grid; grid-template-columns: 2fr 1fr; gap:24px;">
      <div class="table-card" style="margin-bottom:0;">
        <h3 class="chart-title">Most Popular Assets</h3>
        <table class="data-table">
          <thead>
            <tr>
              <th>Document Title</th>
              <th>Views</th>
              <th>Downloads</th>
            </tr>
          </thead>
          <tbody>
            ${db.analytics.telemetry.mostPopular.map(item => `
              <tr>
                <td class="table-text-primary">${item.title}</td>
                <td>${item.views}</td>
                <td>${item.downloads}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <div class="table-card" style="margin-bottom:0;">
        <h3 class="chart-title">Trending Search Terms</h3>
        <ul style="list-style:none; display:flex; flex-direction:column; gap:12px; margin-top:16px;">
          ${db.analytics.telemetry.mostSearchedKeywords.map((keyword, index) => `
            <li style="display:flex; align-items:center; gap:10px; font-size:13px; color:var(--text-secondary);">
              <span style="font-weight:700; color:var(--accent-color); width:20px;">#${index+1}</span>
              <span style="flex:1;">${keyword}</span>
              <span style="font-size:11px; color:var(--text-tertiary);">Trending</span>
            </li>
          `).join('')}
        </ul>
      </div>
    </div>
  `;
}

// 13. Search Hub & Advanced Filters Workspace
function triggerSearchHub(query = '') {
  // Switch active item in sidebar
  sidebarItems.forEach(i => i.classList.remove('active'));

  activeSearchQuery = query;
  workspaceViewport.innerHTML = `
    <div class="welcome-banner">
      <div>
        <h1 class="welcome-title">Search Hub Workspace</h1>
        <p class="welcome-subtitle">Instant filtering and natural language processing discovery engine.</p>
      </div>
    </div>

    <!-- Natural Language Processing Assistant Container -->
    <div class="ai-search-box">
      <div class="ai-search-header">
        <span>🤖 AI Search Simulator</span>
      </div>
      <div class="ai-search-input-row">
        <input type="text" id="aiNlpInput" placeholder="Try natural phrasing: 'Show breast cancer brochures', 'Latest OncoIndx presentations'..." value="${query}">
        <button class="btn-primary" onclick="window.parseAiNlpSearch()">Run AI Query</button>
      </div>
      <div class="ai-search-examples">
        <span style="font-size:11px; color:var(--text-tertiary);">Try asking:</span>
        <span class="ai-example-chip" onclick="window.setNlpExample('Show HRD publications')">Show HRD publications</span>
        <span class="ai-example-chip" onclick="window.setNlpExample('Show all breast cancer brochures')">Show all breast cancer brochures</span>
        <span class="ai-example-chip" onclick="window.setNlpExample('Latest OncoIndx presentations')">Latest OncoIndx presentations</span>
        <span class="ai-example-chip" onclick="window.setNlpExample('Show case studies from Dr. Nilesh Shah')">Show case studies from Dr. Nilesh Shah</span>
        <span class="ai-example-chip" onclick="window.setNlpExample('Show ASM sales playbooks')">Show ASM sales playbooks</span>
      </div>
    </div>

    <div class="search-hub-layout">
      <!-- Left Filters Sidebar -->
      <aside class="filter-panel">
        <div class="filter-panel-header">
          <span class="filter-panel-title">Filters</span>
          <span class="filter-clear-all" onclick="window.clearFilters()">Clear All</span>
        </div>

        <!-- Filter Department -->
        <div class="filter-group">
          <span class="filter-group-label">Department</span>
          <div class="filter-options-list">
            ${['Marketing', 'Medical', 'Product', 'Scientific', 'Sales', 'Corporate', 'Sales Enablement'].map(d => `
              <label class="filter-checkbox-label">
                <input type="checkbox" data-filter="department" value="${d}" ${activeFilters.department.includes(d) ? 'checked' : ''} onchange="window.updateFilterState()">
                ${d}
              </label>
            `).join('')}
          </div>
        </div>

        <!-- Filter Product -->
        <div class="filter-group">
          <span class="filter-group-label">Product Assay</span>
          <div class="filter-options-list">
            ${db.products.map(p => `
              <label class="filter-checkbox-label">
                <input type="checkbox" data-filter="product" value="${p.id}" ${activeFilters.product.includes(p.id) ? 'checked' : ''} onchange="window.updateFilterState()">
                ${p.name}
              </label>
            `).join('')}
          </div>
        </div>

        <!-- Filter Content Type -->
        <div class="filter-group">
          <span class="filter-group-label">Content Type</span>
          <div class="filter-options-list">
            ${['Brochure', 'Presentation', 'One Pager', 'Sales Deck', 'FAQ', 'Case Study', 'Clinical Evidence', 'Publication', 'Whitepaper', 'Video', 'Brand Asset', 'Sales Playbook', 'Objection Handling'].map(t => `
              <label class="filter-checkbox-label">
                <input type="checkbox" data-filter="contentType" value="${t}" ${activeFilters.contentType.includes(t) ? 'checked' : ''} onchange="window.updateFilterState()">
                ${t}
              </label>
            `).join('')}
          </div>
        </div>

        <!-- Filter Cancer Type -->
        <div class="filter-group">
          <span class="filter-group-label">Cancer Type</span>
          <div class="filter-options-list">
            ${['Breast', 'Lung', 'Colorectal', 'Ovarian', 'Endometrium', 'Pan Cancer'].map(c => `
              <label class="filter-checkbox-label">
                <input type="checkbox" data-filter="cancerType" value="${c}" ${activeFilters.cancerType.includes(c) ? 'checked' : ''} onchange="window.updateFilterState()">
                ${c}
              </label>
            `).join('')}
          </div>
        </div>

        <!-- Filter Biomarker -->
        <div class="filter-group">
          <span class="filter-group-label">Biomarkers</span>
          <div class="filter-options-list">
            ${['MSI', 'HRD', 'BRCA', 'PD-L1', 'TMB', 'HER2'].map(b => `
              <label class="filter-checkbox-label">
                <input type="checkbox" data-filter="biomarker" value="${b}" ${activeFilters.biomarker.includes(b) ? 'checked' : ''} onchange="window.updateFilterState()">
                ${b}
              </label>
            `).join('')}
          </div>
        </div>

        <!-- Filter Region -->
        <div class="filter-group">
          <span class="filter-group-label">Region</span>
          <div class="filter-options-list">
            ${['Global', 'India', 'US', 'Thailand', 'Turkey', 'SEA', 'Middle East'].map(r => `
              <label class="filter-checkbox-label">
                <input type="checkbox" data-filter="region" value="${r}" ${activeFilters.region.includes(r) ? 'checked' : ''} onchange="window.updateFilterState()">
                ${r}
              </label>
            `).join('')}
          </div>
        </div>
      </aside>

      <!-- Right Results grid -->
      <section class="search-results-panel">
        <div class="results-status-row">
          <span class="results-count" id="resultsCountLabel">0 results found</span>
        </div>
        <div class="assets-grid" id="searchResultsGrid">
          <!-- Filtered items injected here -->
        </div>
      </section>
    </div>
  `;

  // Trigger evaluation
  window.updateFilterState();
}

// Set text inside NLP input
window.setNlpExample = function(text) {
  document.getElementById('aiNlpInput').value = text;
  window.parseAiNlpSearch();
};

// Simulate Natural language search engine
window.parseAiNlpSearch = function() {
  const nlpText = document.getElementById('aiNlpInput').value.trim().toLowerCase();
  if (!nlpText) return;

  // Clear current filter toggles
  window.clearFilters(false); // Clear silently without re-running triggerSearchHub

  let feedback = [];

  // 1. Detect Biomarker
  if (nlpText.includes('hrd')) {
    activeFilters.biomarker.push('HRD');
    feedback.push('Biomarker = HRD');
  }
  if (nlpText.includes('brca')) {
    activeFilters.biomarker.push('BRCA');
    feedback.push('Biomarker = BRCA');
  }
  if (nlpText.includes('pd-l1') || nlpText.includes('pdl1')) {
    activeFilters.biomarker.push('PD-L1');
    feedback.push('Biomarker = PD-L1');
  }

  // 2. Detect Cancer Type
  if (nlpText.includes('breast')) {
    activeFilters.cancerType.push('Breast');
    feedback.push('Cancer Type = Breast');
  }
  if (nlpText.includes('lung')) {
    activeFilters.cancerType.push('Lung');
    feedback.push('Cancer Type = Lung');
  }
  if (nlpText.includes('ovarian')) {
    activeFilters.cancerType.push('Ovarian');
    feedback.push('Cancer Type = Ovarian');
  }
  if (nlpText.includes('colorectal')) {
    activeFilters.cancerType.push('Colorectal');
    feedback.push('Cancer Type = Colorectal');
  }

  // 3. Detect Content Type
  if (nlpText.includes('brochure')) {
    activeFilters.contentType.push('Brochure');
    feedback.push('Content Type = Brochure');
  }
  if (nlpText.includes('presentation') || nlpText.includes('deck') || nlpText.includes('slides')) {
    activeFilters.contentType.push('Presentation');
    activeFilters.contentType.push('Sales Deck');
    feedback.push('Content Type = Presentation / Sales Deck');
  }
  if (nlpText.includes('publication') || nlpText.includes('paper')) {
    activeFilters.contentType.push('Publication');
    feedback.push('Content Type = Publication');
  }
  if (nlpText.includes('case')) {
    activeFilters.contentType.push('Case Study');
    feedback.push('Content Type = Case Study');
  }

  // 3.5. Detect Sales Enablement & Playbooks
  if (nlpText.includes('asm') || nlpText.includes('sales enablement') || nlpText.includes('playbook') || nlpText.includes('battlecard') || nlpText.includes('objection')) {
    activeFilters.department.push('Sales Enablement');
    feedback.push('Department = Sales Enablement');
    if (nlpText.includes('playbook')) {
      activeFilters.contentType.push('Sales Playbook');
      feedback.push('Content Type = Sales Playbook');
    }
    if (nlpText.includes('battlecard') || nlpText.includes('objection')) {
      activeFilters.contentType.push('Objection Handling');
      feedback.push('Content Type = Objection Handling');
    }
  }

  // 4. Detect Product Name
  if (nlpText.includes('oncoindx') || nlpText.includes('indx')) {
    activeFilters.product.push('oncoindx');
    feedback.push('Product = OncoIndx Multimodal');
  }
  if (nlpText.includes('oncohrd')) {
    activeFilters.product.push('oncohrd');
    feedback.push('Product = OncoHRD');
  }
  if (nlpText.includes('oncomonitor')) {
    activeFilters.product.push('oncomonitor');
    feedback.push('Product = OncoMonitor');
  }

  // 5. Detect Author / Doctor keywords
  let keywordQuery = '';
  if (nlpText.includes('dr. nilesh shah') || nlpText.includes('nilesh') || nlpText.includes('shah')) {
    keywordQuery = 'Nilesh Shah';
    feedback.push('Keyword = Nilesh Shah');
  } else if (nlpText.includes('dr. amanda ross') || nlpText.includes('ross') || nlpText.includes('amanda')) {
    keywordQuery = 'Amanda Ross';
    feedback.push('Keyword = Amanda Ross');
  }

  showToast(`AI interpreted query parameters: [${feedback.join(', ')}]`);
  
  // Update search input to highlight nlp keywords
  globalSearchInput.value = keywordQuery || nlpText;
  activeSearchQuery = keywordQuery || nlpText;

  // Redraw filters checklist and results
  triggerSearchHub(activeSearchQuery);
};

// Clear search filters
window.clearFilters = function(reload = true) {
  activeFilters = {
    department: [],
    product: [],
    contentType: [],
    cancerType: [],
    biomarker: [],
    region: [],
    status: [],
    year: []
  };
  globalSearchInput.value = '';
  activeSearchQuery = '';
  
  if (reload) {
    triggerSearchHub('');
  }
};

// Read filters checkbox inputs and update grid
window.updateFilterState = function() {
  // Sync checkboxes to local state
  const checkboxes = document.querySelectorAll('.filter-checkbox-label input');
  
  // If checklist elements exist in DOM (only when search hub is active)
  if (checkboxes.length > 0) {
    // Reset state
    activeFilters.department = [];
    activeFilters.product = [];
    activeFilters.contentType = [];
    activeFilters.cancerType = [];
    activeFilters.biomarker = [];
    activeFilters.region = [];

    checkboxes.forEach(cb => {
      if (cb.checked) {
        const filterType = cb.getAttribute('data-filter');
        activeFilters[filterType].push(cb.value);
      }
    });
  }

  // Perform evaluation logic
  const query = activeSearchQuery.toLowerCase().trim();
  const filtered = db.documents.filter(doc => {
    // 1. Text Query Matching
    if (query) {
      const matchTitle = doc.title.toLowerCase().includes(query);
      const matchDesc = doc.description.toLowerCase().includes(query);
      const matchBiomarker = doc.biomarker ? doc.biomarker.toLowerCase().includes(query) : false;
      const matchCancer = doc.cancerType ? doc.cancerType.toLowerCase().includes(query) : false;
      const matchAuthor = doc.author ? doc.author.toLowerCase().includes(query) : false;
      const matchOwner = doc.owner.toLowerCase().includes(query);
      const matchDept = doc.department.toLowerCase().includes(query);
      
      if (!matchTitle && !matchDesc && !matchBiomarker && !matchCancer && !matchAuthor && !matchOwner && !matchDept) {
        return false;
      }
    }

    // 2. Department filter
    if (activeFilters.department.length > 0 && !activeFilters.department.includes(doc.department)) {
      return false;
    }
    // 3. Product filter
    if (activeFilters.product.length > 0 && !activeFilters.product.includes(doc.product)) {
      return false;
    }
    // 4. Content Type filter
    if (activeFilters.contentType.length > 0 && !activeFilters.contentType.includes(doc.contentType)) {
      return false;
    }
    // 5. Cancer Type filter
    if (activeFilters.cancerType.length > 0 && !activeFilters.cancerType.includes(doc.cancerType)) {
      return false;
    }
    // 6. Biomarker filter
    if (activeFilters.biomarker.length > 0 && !activeFilters.biomarker.includes(doc.biomarker)) {
      return false;
    }
    // 7. Region filter
    if (activeFilters.region.length > 0 && !activeFilters.region.includes(doc.region)) {
      return false;
    }

    return true;
  });

  // Inject into results label
  const resultsLabel = document.getElementById('resultsCountLabel');
  if (resultsLabel) {
    resultsLabel.innerText = `${filtered.length} approved document${filtered.length === 1 ? '' : 's'} matching criteria`;
  }

  // Inject into grid
  const resultsGrid = document.getElementById('searchResultsGrid');
  if (resultsGrid) {
    if (filtered.length === 0) {
      resultsGrid.innerHTML = `
        <div style="grid-column: span 3; text-align: center; padding: 48px; color: var(--text-tertiary);">
          <div style="font-size:32px; margin-bottom:12px;">🔍</div>
          <strong>No matching files found</strong>
          <p style="font-size:12px; margin-top:6px;">Try adjusting your keyword query or expanding advanced filters in the sidebar.</p>
        </div>
      `;
    } else {
      resultsGrid.innerHTML = filtered.map(d => renderDocumentCard(d)).join('');
    }
  }
};

// Global search auto suggestions engine
function handleSearchInput(e) {
  const query = e.target.value.toLowerCase().trim();
  if (!query) {
    suggestionsDropdown.style.display = 'none';
    return;
  }

  // Find matches
  const matchedDocs = db.documents.filter(doc => 
    doc.title.toLowerCase().includes(query) || 
    doc.department.toLowerCase().includes(query) ||
    (doc.biomarker && doc.biomarker.toLowerCase().includes(query)) ||
    (doc.cancerType && doc.cancerType.toLowerCase().includes(query))
  ).slice(0, 5);

  const matchedProducts = db.products.filter(p => 
    p.name.toLowerCase().includes(query) || 
    p.description.toLowerCase().includes(query)
  ).slice(0, 2);

  if (matchedDocs.length === 0 && matchedProducts.length === 0) {
    suggestionsDropdown.innerHTML = `
      <div style="padding: 12px 16px; font-size:12.5px; color:var(--text-tertiary); text-align:center;">
        No quick assets found. Press Enter to search hub.
      </div>
    `;
    suggestionsDropdown.style.display = 'block';
    return;
  }

  let html = '';

  if (matchedProducts.length > 0) {
    html += `
      <div class="search-suggestion-section">
        <div class="suggestion-header">Product Workspaces</div>
        ${matchedProducts.map(p => `
          <div class="suggestion-item" onclick="window.openProductMicrosite('${p.id}')">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 21a3 3 0 003-3v-4.5a3 3 0 00-3-3h-1.5V9a3 3 0 00-3-3h-3V4.5a3 3 0 00-3-3H4.5a3 3 0 00-3 3V18a3 3 0 003 3h15z" />
            </svg>
            <span class="suggestion-text">${p.name}</span>
            <span class="suggestion-badge">Workspace</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  if (matchedDocs.length > 0) {
    html += `
      <div class="search-suggestion-section">
        <div class="suggestion-header">Documents & Assets</div>
        ${matchedDocs.map(d => `
          <div class="suggestion-item" onclick="window.previewDocument('${d.id}')">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            <span class="suggestion-text">${d.title}</span>
            <span class="suggestion-badge">${d.contentType}</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  suggestionsDropdown.innerHTML = html;
  suggestionsDropdown.style.display = 'block';
}

// 14. Preview Document Modal logic
window.previewDocument = function(docId) {
  const doc = db.documents.find(d => d.id === docId);
  if (!doc) return;

  // Track recent viewed item
  if (!recentAssets.includes(docId)) {
    recentAssets.unshift(docId);
    if (recentAssets.length > 5) recentAssets.pop();
  }

  // Increment views in database telemetry dynamically
  doc.viewCount++;
  db.analytics.telemetry.views++;

  // Set modal headers
  previewModalTitle.innerText = doc.title;
  previewToolbarTitle.innerText = `${doc.contentType} v${doc.version} • SharePoint: ${doc.folderPath}/${doc.title}`;

  // Hook button links
  previewBtnSp.onclick = () => {
    window.open(doc.sharePointUrl, '_blank');
    showToast(`Redirecting to live SharePoint document: ${doc.title}`);
  };
  previewBtnDownload.onclick = () => {
    window.triggerDownload(doc.title);
  };

  // Recommendations mapping logic
  let recTagsHtml = '';
  if (doc.product) {
    const relatedCases = db.cases.filter(c => c.relatedProduct === doc.product);
    const relatedPubs = db.publications.filter(p => p.relatedProduct === doc.product);
    
    let recList = [];
    if (relatedCases.length > 0) recList.push(`Case: ${relatedCases[0].title}`);
    if (relatedPubs.length > 0) recList.push(`Research: ${relatedPubs[0].title}`);
    
    if (recList.length > 0) {
      recTagsHtml = `💡 Auto Recommendations: [${recList.join(' | ')}]`;
    }
  }
  previewRelationTag.innerText = recTagsHtml;

  // Render mock preview content
  if (doc.contentType === 'Brochure' || doc.contentType === 'One Pager' || doc.contentType === 'Whitepaper' || doc.contentType === 'Clinical Evidence' || doc.contentType === 'FAQ') {
    // Mock PDF layout
    previewContentDisplay.innerHTML = `
      <div class="mock-pdf-page">
        <div class="mock-pdf-header">
          <span class="mock-pdf-logo">1Cell.Ai Genomic Assays</span>
          <span style="font-size:9px; color:#94a3b8;">OFFICIAL APPROVED DOCUMENT</span>
        </div>
        <h2 class="mock-pdf-title">${doc.title}</h2>
        <div style="font-size:11px; margin-bottom:12px; color:var(--text-secondary);"><strong>Target Department:</strong> ${doc.department} | <strong>Biomarker:</strong> ${doc.biomarker || 'General'}</div>
        
        <div class="mock-pdf-section-title">Clinical Background</div>
        <p class="mock-pdf-paragraph">1Cell's assays enable clinicians to detect crucial solid tumor variants down to extremely low allele frequencies. By integrating whole transcriptome RNA sequencing, the diagnostic yield expands to target complex fusions, structural variants, and transcriptomic signature patterns.</p>
        
        <div class="mock-pdf-section-title">Summary & Intended Use</div>
        <p class="mock-pdf-paragraph">${doc.description}</p>
        
        <div class="mock-pdf-section-title">SharePoint Verification</div>
        <p class="mock-pdf-paragraph" style="font-style:italic; font-size:10px; border-top:1px solid #cbd5e1; padding-top:8px;">Document path: 1cellai.sharepoint.com/${doc.folderPath}/${doc.title}</p>
      </div>
    `;
  } else if (doc.contentType === 'Presentation' || doc.contentType === 'Sales Deck') {
    // Mock PowerPoint slides carousel
    previewContentDisplay.innerHTML = `
      <div style="width:100%; max-width:600px; display:flex; flex-direction:column; gap:16px;">
        <div class="mock-ppt-slide">
          <div class="mock-ppt-header">${doc.title}</div>
          <div class="mock-ppt-body">
            <strong>Key Presentation Takeaways:</strong>
            <ul class="mock-ppt-bullets">
              <li>1Cell.Ai clinical advantage outlines</li>
              <li>Toxicity reduction thresholds</li>
              <li>Live testing validation comparisons</li>
            </ul>
          </div>
          <div class="mock-ppt-footer">
            <span>1Cell.Ai Corporate Slides v${doc.version}</span>
            <span>Slide 1 of 3</span>
          </div>
        </div>
        <div style="display:flex; justify-content:center; gap:8px;">
          <button class="btn-outline" style="padding:4px 8px; font-size:10px;" onclick="showToast('Loading next presentation slide (simulation)')">◀ Prev Slide</button>
          <button class="btn-outline" style="padding:4px 8px; font-size:10px;" onclick="showToast('Loading next presentation slide (simulation)')">Next Slide ▶</button>
        </div>
      </div>
    `;
  } else if (doc.contentType === 'Video') {
    // Video Player
    previewContentDisplay.innerHTML = `
      <div style="background-color:black; width:100%; aspect-ratio:16/9; border-radius:10px; display:flex; flex-direction:column; align-items:center; justify-content:center; color:white; font-size:14px; position:relative; box-shadow:var(--shadow-xl);">
        <div style="font-size:40px; margin-bottom:12px; color:var(--accent-color); cursor:pointer;" onclick="showToast('Video Playing...')">▶</div>
        <div>Simulated Video: ${doc.title}</div>
        <div style="font-size:11px; opacity:0.6; margin-top:4px;">SharePoint streaming container integration mockup</div>
        
        <!-- Mock Controls -->
        <div style="position:absolute; bottom:0; left:0; right:0; background:rgba(0,0,0,0.8); padding:8px 16px; display:flex; justify-content:space-between; font-size:11px;">
          <span>0:00 / 4:12</span>
          <span>1080p HD</span>
        </div>
      </div>
    `;
  } else {
    // Default fallback
    previewContentDisplay.innerHTML = `
      <div class="mock-pdf-page">
        <h2 class="mock-pdf-title">${doc.title}</h2>
        <p>${doc.description}</p>
        <div style="background-color:var(--bg-tertiary); padding:16px; border-radius:8px; font-size:12px; margin-top:20px;">
          <strong>Raw Document Content Placeholder</strong>
          <p style="margin-top:6px;">This template represents a ${doc.contentType} format file hosted at path: ${doc.folderPath}.</p>
        </div>
      </div>
    `;
  }

  // Open the Modal
  openModal(previewModal);
};

// Inspect SharePoint details modal
window.inspectSharepoint = function(docId) {
  const doc = db.documents.find(d => d.id === docId);
  if (!doc) return;

  spMetadataDetails.innerHTML = `
    <div class="form-group">
      <label>SharePoint File Name</label>
      <div style="font-weight:600; color:var(--text-primary);">${doc.title}</div>
    </div>
    <div class="form-group">
      <label>SharePoint Folder Path</label>
      <div style="font-family:monospace; font-size:11px;">${doc.folderPath}</div>
    </div>
    <div class="form-group">
      <label>Version Sequence</label>
      <div>${doc.version}</div>
    </div>
    <div class="form-group">
      <label>Approval Status</label>
      <div style="color:var(--success); font-weight:600;">${doc.status}</div>
    </div>
    <div class="form-group">
      <label>Indexed Date</label>
      <div>${doc.createdDate}</div>
    </div>
    <div class="form-group">
      <label>Modified Date</label>
      <div>${doc.updatedDate}</div>
    </div>
    <div class="form-group" style="grid-column: span 2;">
      <label>Direct SharePoint Access URL</label>
      <div style="font-size:11px; word-break:break-all; color:#0078d4;">${doc.sharePointUrl}</div>
    </div>
  `;

  // Hook button links
  spModalCopyPath.onclick = () => {
    navigator.clipboard.writeText(doc.sharePointUrl);
    showToast("SharePoint link copied to clipboard!");
  };

  spModalOpenUrl.onclick = () => {
    window.open(doc.sharePointUrl, '_blank');
    showToast(`Redirecting to live SharePoint document: ${doc.title}`);
  };

  openModal(sharepointModal);
};

// Toggle bookmark / favorites
window.toggleFavorite = function(docId) {
  if (userFavorites.has(docId)) {
    userFavorites.delete(docId);
    showToast("Removed from bookmarks");
  } else {
    userFavorites.add(docId);
    showToast("Added to bookmarks");
  }
  
  // Re-draw current active route in view
  const activeRoute = document.querySelector('.sidebar .nav-item.active').getAttribute('data-route');
  renderRoute(activeRoute);
};

// Share Link simulator
window.shareAsset = function(docId) {
  const doc = db.documents.find(d => d.id === docId);
  if (!doc) return;
  navigator.clipboard.writeText(doc.sharePointUrl);
  showToast(`Direct SharePoint link copied to clipboard: ${doc.title}`);
};

// Mock download telemetry update
window.triggerDownload = function(title) {
  // Update downloads telemetry in database
  db.analytics.telemetry.downloads++;
  showToast(`Downloaded: ${title}`);
};

// Marketing Admin mock upload new files
function handleMockUpload(e) {
  e.preventDefault();

  const authDept = sessionStorage.getItem("authDept");
  let dept = authDept;
  if (!dept) {
    if (currentRole === 'marketing_admin') dept = 'Marketing';
    else if (currentRole === 'sales') dept = 'Sales';
    else if (currentRole === 'medical') dept = 'Genomic Scientist';
    else if (currentRole === 'leadership') dept = 'Leadership';
  }

  if (dept === 'Sales') {
    showToast("Access denied: Sales team members are not permitted to register content.");
    closeModal(uploadModal);
    return;
  }
  
  const title = document.getElementById('formTitle').value.trim();
  const description = document.getElementById('formDesc').value.trim() || 'No description provided.';
  const department = document.getElementById('formDept').value;
  const product = document.getElementById('formProduct').value || null;
  const contentType = document.getElementById('formContentType').value;
  const region = document.getElementById('formRegion').value;
  const cancerType = document.getElementById('formCancer').value || 'Pan Cancer';
  const biomarker = document.getElementById('formBiomarker').value || null;
  const status = document.getElementById('formStatus').value;
  const version = document.getElementById('formVersion').value || 'v1.0';
  const sharePointUrl = document.getElementById('formSpUrl').value;
  const author = document.getElementById('formAuthor').value || 'Unknown';
  const size = document.getElementById('formSize').value || '1.0 MB';

  if (!title || !sharePointUrl) {
    showToast("Please fill in all required fields.");
    return;
  }

  // Create new document item
  const newDocId = `doc-${Date.now()}`;
  const newDoc = {
    id: newDocId,
    title,
    description,
    department,
    product,
    cancerType,
    biomarker,
    contentType,
    region,
    status,
    year: "2026",
    version,
    author,
    owner: userProfiles[currentRole].name,
    createdDate: new Date().toISOString().split('T')[0],
    updatedDate: new Date().toISOString().split('T')[0],
    sharePointUrl,
    folderPath: `${department}/${contentType}s`,
    size,
    downloadCount: 0,
    viewCount: 1,
    isPinned: false,
    isTrending: false
  };

  // Push to local database
  db.documents.unshift(newDoc);
  
  // Update analytics telemetry
  db.analytics.totalAssets++;
  db.analytics.assetsAddedThisMonth++;
  
  if (db.analytics.assetsByDepartment[department]) {
    db.analytics.assetsByDepartment[department]++;
  } else {
    db.analytics.assetsByDepartment[department] = 1;
  }

  if (product) {
    if (db.analytics.assetsByProduct[product]) {
      db.analytics.assetsByProduct[product]++;
    } else {
      db.analytics.assetsByProduct[product] = 1;
    }
  }

  closeModal(uploadModal);
  showToast(`Successfully registered "${title}" from SharePoint!`);

  // Force re-render active route
  const activeRoute = document.querySelector('.sidebar .nav-item.active').getAttribute('data-route');
  renderRoute(activeRoute);
}

// 6.7. Quiz & Leaderboard Portal Route
function renderQuizPage() {
  workspaceViewport.innerHTML = `
    <div class="welcome-banner">
      <div>
        <h1 class="welcome-title">Quiz & Rankings</h1>
        <p class="welcome-subtitle">Evaluate your product positioning competency and view the ASM leaderboard rankings.</p>
      </div>
    </div>

    <div class="quiz-tabs-container">
      <button class="quiz-tab-btn ${activeQuizTab === 'quiz' ? 'active-tab' : ''}" onclick="window.switchQuizTab('quiz')">Quizzes</button>
      <button class="quiz-tab-btn ${activeQuizTab === 'leaderboard' ? 'active-tab' : ''}" onclick="window.switchQuizTab('leaderboard')">Leaderboard</button>
    </div>

    <div id="quizTabContent"></div>
  `;

  renderQuizTabContent();
}

// Render active tab view
function renderQuizTabContent() {
  const container = document.getElementById('quizTabContent');
  if (!container) return;

  if (activeQuizTab === 'quiz') {
    if (currentActiveQuiz) {
      renderActiveQuizWizard(container);
    } else {
      renderQuizzesList(container);
    }
  } else if (activeQuizTab === 'leaderboard') {
    renderLeaderboardView(container);
  }
}

// Render list of quizzes
function renderQuizzesList(container) {
  let html = `
    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 24px;">
  `;

  db.quizzes.forEach(quiz => {
    html += `
      <div class="quiz-card">
        <h3 style="font-family:'Outfit', sans-serif; font-size:18px; font-weight:700; margin-bottom:8px; color:var(--text-primary);">${quiz.title}</h3>
        <p style="font-family:'Source Serif 4', serif; font-size:14px; color:var(--text-secondary); line-height:1.5; margin-bottom:20px; flex-grow:1;">${quiz.description}</p>
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="font-family:'Outfit', sans-serif; font-size:12px; font-weight:600; color:var(--text-tertiary); text-transform:uppercase;">${quiz.questions.length} Questions</span>
          <button class="btn-primary" style="padding:6px 14px; font-size:12.5px;" onclick="window.startQuiz('${quiz.id}')">Start Quiz</button>
        </div>
      </div>
    `;
  });

  html += `</div>`;
  container.innerHTML = html;
}

// Render step wizard for active quiz
function renderActiveQuizWizard(container) {
  const quiz = currentActiveQuiz;
  const qIndex = quizProgress.questionIndex;
  const question = quiz.questions[qIndex];
  const totalQs = quiz.questions.length;
  const progressPercent = ((qIndex) / totalQs) * 100;

  let optionsHtml = '';
  const letters = ['A', 'B', 'C', 'D'];
  question.options.forEach((opt, idx) => {
    const isSelected = quizProgress.selectedOption === idx;
    optionsHtml += `
      <div class="option-box ${isSelected ? 'selected' : ''}" onclick="window.selectQuizOption(${idx})">
        <span class="option-letter">${letters[idx]}</span>
        <span>${opt}</span>
      </div>
    `;
  });

  container.innerHTML = `
    <div style="max-width: 680px; margin: 0 auto;">
      <div class="quiz-card" style="padding: 32px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <span style="font-family:'Outfit', sans-serif; font-size:12px; font-weight:600; color:var(--accent-color); text-transform:uppercase;">${quiz.title}</span>
          <span style="font-family:'Outfit', sans-serif; font-size:12px; color:var(--text-tertiary);">Question ${qIndex + 1} of ${totalQs}</span>
        </div>
        
        <!-- Progress Bar -->
        <div style="width:100%; height:6px; background-color:var(--border-color); border-radius:3px; margin-bottom:24px; overflow:hidden;">
          <div style="width:${progressPercent}%; height:100%; background-color:var(--accent-color); border-radius:3px; transition: width 0.3s ease;"></div>
        </div>

        <h3 style="font-family:'Source Serif 4', Georgia, serif; font-size:18px; font-weight:600; color:var(--text-primary); line-height:1.4; margin-bottom:20px;">${question.text}</h3>
        
        <div class="option-group">
          ${optionsHtml}
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:20px; padding-top:20px; border-top:1px solid var(--border-color);">
          <button class="btn-outline" style="padding:8px 16px;" onclick="window.cancelQuiz()">Quit Quiz</button>
          ${qIndex < totalQs - 1 ? 
            `<button class="btn-primary" style="padding:8px 20px;" ${quizProgress.selectedOption === null ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''} onclick="window.nextQuizQuestion()">Next Question</button>` : 
            `<button class="btn-primary" style="padding:8px 20px; background-color:var(--success); border-color:var(--success);" ${quizProgress.selectedOption === null ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''} onclick="window.submitQuizAnswers()">Submit Quiz</button>`
          }
        </div>
      </div>
    </div>
  `;
}

// Render completed quiz results card
function renderQuizResults(container) {
  const quiz = currentActiveQuiz;
  const userAnswers = quizProgress.answers;
  let correctCount = 0;

  quiz.questions.forEach((q, idx) => {
    if (userAnswers[idx] === q.correctIndex) {
      correctCount++;
    }
  });

  const pct = Math.round((correctCount / quiz.questions.length) * 100);
  const earnedPoints = correctCount * 25;
  const loggedInName = sessionStorage.getItem("authName") || userProfiles[currentRole].name;

  let answersReviewHtml = '';
  const letters = ['A', 'B', 'C', 'D'];

  quiz.questions.forEach((q, idx) => {
    const userSel = userAnswers[idx];
    const correctSel = q.correctIndex;
    const isCorrect = userSel === correctSel;

    let optionsReviewHtml = '';
    q.options.forEach((opt, oIdx) => {
      let statusClass = '';
      if (oIdx === correctSel) {
        statusClass = 'correct';
      } else if (oIdx === userSel && !isCorrect) {
        statusClass = 'incorrect';
      }

      optionsReviewHtml += `
        <div class="option-box ${statusClass}" style="cursor:default; pointer-events:none;">
          <span class="option-letter">${letters[oIdx]}</span>
          <span>${opt}</span>
        </div>
      `;
    });

    answersReviewHtml += `
      <div style="border-bottom:1px solid var(--border-color); padding-bottom:24px; margin-bottom:24px;">
        <div style="display:flex; align-items:center; gap:8px; margin-bottom:12px;">
          <span style="font-family:'Outfit', sans-serif; font-size:12px; font-weight:700; color:var(--text-tertiary); text-transform:uppercase;">Question ${idx + 1}</span>
          <span class="badge ${isCorrect ? 'badge-status-approved' : 'badge-status-draft'}">${isCorrect ? '✓ Correct' : '✗ Incorrect'}</span>
        </div>
        <h4 style="font-family:'Source Serif 4', Georgia, serif; font-size:15.5px; font-weight:600; color:var(--text-primary); margin-bottom:12px;">${q.text}</h4>
        
        <div style="display:flex; flex-direction:column; gap:8px; margin-bottom:12px;">
          ${optionsReviewHtml}
        </div>
        
        <div style="padding:12px 16px; background-color:var(--bg-tertiary); border-radius:var(--radius-sm); font-size:13px; font-family:'Source Serif 4', serif; line-height:1.5; color:var(--text-secondary);">
          <strong style="font-family:'Outfit', sans-serif; color:var(--text-primary);">Scientific / Strategic Reason:</strong> ${q.explanation}
        </div>
      </div>
    `;
  });

  container.innerHTML = `
    <div style="max-width: 680px; margin: 0 auto;">
      <div class="quiz-card" style="padding:32px; margin-bottom:32px; border-color:${pct >= 75 ? 'var(--success)' : 'var(--border-color)'};">
        <div style="text-align:center; margin-bottom:24px;">
          <div style="font-size:48px; margin-bottom:8px;">${pct >= 75 ? '🎉' : '📚'}</div>
          <h2 style="font-family:'Outfit', sans-serif; font-size:24px; font-weight:800; margin-bottom:4px;">Quiz Completed!</h2>
          <p style="font-size:14px; color:var(--text-secondary);">${quiz.title}</p>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; padding:20px; background-color:var(--bg-tertiary); border-radius:var(--radius-md); margin-bottom:24px; text-align:center;">
          <div>
            <div style="font-family:'Outfit', sans-serif; font-size:12px; color:var(--text-tertiary); text-transform:uppercase; margin-bottom:4px;">Your Score</div>
            <div style="font-family:'Outfit', sans-serif; font-size:28px; font-weight:800; color:${pct >= 75 ? 'var(--success)' : 'var(--accent-color)'};">${correctCount} / ${quiz.questions.length} (${pct}%)</div>
          </div>
          <div>
            <div style="font-family:'Outfit', sans-serif; font-size:12px; color:var(--text-tertiary); text-transform:uppercase; margin-bottom:4px;">Points Added</div>
            <div style="font-family:'Outfit', sans-serif; font-size:28px; font-weight:800; color:var(--accent-color);">+${earnedPoints} pts</div>
          </div>
        </div>

        <p style="font-size:14px; text-align:center; color:var(--text-secondary); margin-bottom:24px;">
          Results recorded for ASM member <strong>${loggedInName}</strong>. Your points have been added to the rankings.
        </p>

        <div style="display:flex; justify-content:center; gap:16px;">
          <button class="btn-primary" style="padding:10px 24px;" onclick="window.resetQuizFlow()">Back to Quizzes</button>
          <button class="btn-outline" style="padding:10px 24px;" onclick="window.switchQuizTab('leaderboard')">View Leaderboard</button>
        </div>
      </div>

      <div class="quiz-card" style="padding:32px;">
        <h3 style="font-family:'Outfit', sans-serif; font-size:18px; font-weight:700; margin-bottom:20px; border-bottom:1px solid var(--border-color); padding-bottom:8px;">Questions Review</h3>
        ${answersReviewHtml}
      </div>
    </div>
  `;
}

// Render Leaderboard rankings table
function renderLeaderboardView(container) {
  let rowsHtml = '';
  db.leaderboard.forEach(row => {
    let rankBadgeClass = 'rank-other';
    if (row.rank === 1) rankBadgeClass = 'rank-1';
    else if (row.rank === 2) rankBadgeClass = 'rank-2';
    else if (row.rank === 3) rankBadgeClass = 'rank-3';

    rowsHtml += `
      <tr class="leaderboard-row">
        <td style="width:70px; text-align:center;">
          <span class="rank-badge ${rankBadgeClass}">${row.rank}</span>
        </td>
        <td style="font-weight:600; font-family:'Outfit', sans-serif;">${row.name}</td>
        <td style="text-align:center; font-weight:600;">${row.attempted}</td>
        <td style="text-align:right; font-weight:700; color:var(--accent-color); font-family:'Outfit', sans-serif; font-size:15.5px;">${row.points} pts</td>
      </tr>
    `;
  });

  container.innerHTML = `
    <div class="quiz-card" style="padding: 24px; overflow-x: auto;">
      <table class="leaderboard-table">
        <thead>
          <tr>
            <th style="width:70px; text-align:center;">Rank</th>
            <th>ASM Member Name</th>
            <th style="text-align:center; width:120px;">Quizzes Played</th>
            <th style="text-align:right; width:120px;">Total Points</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    </div>
  `;
}

// Call entrypoint on window load
window.addEventListener('DOMContentLoaded', init);
window.previewDocument = previewDocument;
window.inspectSharepoint = inspectSharepoint;
window.toggleFavorite = toggleFavorite;
window.shareAsset = shareAsset;
window.triggerDownload = triggerDownload;
window.setNlpExample = setNlpExample;
window.parseAiNlpSearch = parseAiNlpSearch;
window.clearFilters = clearFilters;
window.updateFilterState = updateFilterState;
window.openProductMicrosite = openProductMicrosite;
window.switchProductTab = switchProductTab;
window.triggerSearchHub = triggerSearchHub;

// Window actions routing helpers
window.switchQuizTab = function(tab) {
  activeQuizTab = tab;
  renderQuizPage();
};

window.startQuiz = function(quizId) {
  const quiz = db.quizzes.find(q => q.id === quizId);
  if (!quiz) return;
  currentActiveQuiz = quiz;
  quizProgress.questionIndex = 0;
  quizProgress.selectedOption = null;
  quizProgress.answers = [];
  quizProgress.isCompleted = false;
  renderQuizPage();
};

window.selectQuizOption = function(optionIndex) {
  quizProgress.selectedOption = optionIndex;
  renderQuizTabContent();
};

window.nextQuizQuestion = function() {
  if (quizProgress.selectedOption === null) return;
  quizProgress.answers.push(quizProgress.selectedOption);
  quizProgress.questionIndex++;
  quizProgress.selectedOption = null;
  renderQuizTabContent();
};

window.submitQuizAnswers = function() {
  if (quizProgress.selectedOption === null) return;
  quizProgress.answers.push(quizProgress.selectedOption);
  quizProgress.isCompleted = true;

  // Calculate & record points
  const quiz = currentActiveQuiz;
  let correctCount = 0;
  quiz.questions.forEach((q, idx) => {
    if (quizProgress.answers[idx] === q.correctIndex) {
      correctCount++;
    }
  });

  const earnedPoints = correctCount * 25;
  const loggedInName = sessionStorage.getItem("authName") || userProfiles[currentRole].name;
  let userRank = db.leaderboard.find(u => u.name === loggedInName);

  if (userRank) {
    userRank.points += earnedPoints;
    userRank.attempted += 1;
  } else {
    db.leaderboard.push({
      rank: db.leaderboard.length + 1,
      name: loggedInName,
      points: earnedPoints,
      attempted: 1
    });
  }

  // Re-sort & Re-rank
  db.leaderboard.sort((a, b) => b.points - a.points);
  db.leaderboard.forEach((item, index) => {
    item.rank = index + 1;
  });

  const container = document.getElementById('quizTabContent');
  renderQuizResults(container);
};

window.cancelQuiz = function() {
  if (confirm("Are you sure you want to quit? Your progress will not be saved.")) {
    window.resetQuizFlow();
  }
};

window.resetQuizFlow = function() {
  currentActiveQuiz = null;
  quizProgress.questionIndex = 0;
  quizProgress.selectedOption = null;
  quizProgress.answers = [];
  quizProgress.isCompleted = false;
  renderQuizPage();
};
