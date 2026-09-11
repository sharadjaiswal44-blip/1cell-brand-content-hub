// 1Cell.Ai Content Hub Application Controller
import db from './db.js?v=20260911-v30';
import { 
  normalizeTeam,
  canTeamViewVisibility,
  TEAMS,
  VISIBILITY
} from './cloud-config.js';
import { supabaseService } from './supabase-service.js';
import { 
  getActiveSupabaseConfig, 
  saveActiveSupabaseConfig, 
  isSupabaseConfigured,
  clearSupabaseConfig 
} from './supabase-config.js';

window.db = db;
window.normalizeTeam = normalizeTeam;
window.canTeamViewVisibility = canTeamViewVisibility;
window.TEAMS = TEAMS;
window.VISIBILITY = VISIBILITY;
window.supabaseService = supabaseService;

function getCurrentUserTeam() {
  const authTeam = sessionStorage.getItem("authTeam");
  if (authTeam) return authTeam;
  const authDept = sessionStorage.getItem("authDept");
  if (authDept) return normalizeTeam(authDept);
  if (currentRole === 'marketing_admin') return TEAMS.MARKETING;
  if (currentRole === 'medical') return TEAMS.SCIENTIFIC;
  if (currentRole === 'sales') return TEAMS.SALES;
  if (currentRole === 'leadership') return TEAMS.LEADERSHIP;
  return TEAMS.MARKETING;
}
window.getCurrentUserTeam = getCurrentUserTeam;

// Map a Supabase row to the format expected by the Content Hub frontend
function mapSupabaseRowToCard(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title || '',
    description: row.description || '',
    category: row.category || 'company-assets',
    department: row.department || 'Corporate',
    product: row.product_workspace || null,
    contentType: row.content_type || 'Brochure',
    region: row.region || 'Global',
    cancerType: row.cancer_type || 'None',
    biomarker: row.biomarkers || 'None',
    owner: row.owner_author || '1Cell.Ai',
    author: row.owner_author || '1Cell.Ai',
    version: row.version || 'v1.0',
    status: row.status || 'Approved',
    team_id: row.target_team || 'marketing',
    visibility: row.collaboration_scope || 'all',
    sharePointUrl: row.sharepoint_url || '',
    oneDriveUrl: row.sharepoint_url || '',
    folderPath: row.sharepoint_folder_path || 'Shared Documents',
    created_by: row.created_by || 'Team Member',
    created_by_email: row.created_by_email || '',
    createdDate: (row.created_at || '').split('T')[0],
    updatedDate: (row.updated_at || '').split('T')[0],
    created_at: row.created_at,
    updated_at: row.updated_at,
    is_deleted: Boolean(row.is_deleted),
    ...(row.extra_metadata || {})
  };
}

const DUMMY_COMPANY_DOC_IDS = new Set(['doc-101', 'doc-102', 'doc-103', 'doc-104', 'doc-105', 'doc-106', 'doc-107']);

if (db && Array.isArray(db.documents)) {
  db.documents = db.documents.filter(d => !DUMMY_COMPANY_DOC_IDS.has(d.id));
}

// Injects or updates an asset card inside the in-memory collections
function applyAssetToLocalDb(card) {
  if (!card || !card.id || DUMMY_COMPANY_DOC_IDS.has(card.id) || card.is_deleted) return;
  const cat = (card.category || '').toLowerCase();
  
  if (cat === 'case-library' || card.contentType === 'Case Study') {
    if (!db.cases) db.cases = [];
    const idx = db.cases.findIndex(c => c.id === card.id);
    const caseObj = {
      ...card,
      doctor: card.owner || card.author,
      hospital: card.department || '1Cell Clinical Specialist',
      relatedProduct: card.product || 'oncoindx',
      readMoreUrl: card.sharePointUrl,
      summary: card.description
    };
    if (idx >= 0) db.cases[idx] = { ...db.cases[idx], ...caseObj };
    else db.cases.unshift(caseObj);
  } else if (cat === 'publications' || card.contentType === 'Publication') {
    if (!db.publications) db.publications = [];
    const idx = db.publications.findIndex(p => p.id === card.id);
    const pubObj = {
      ...card,
      authors: card.owner || card.author,
      link: card.sharePointUrl,
      abstract: card.description,
      relatedProduct: card.product || 'oncoindx'
    };
    if (idx >= 0) db.publications[idx] = { ...db.publications[idx], ...pubObj };
    else db.publications.unshift(pubObj);
  } else if (cat === 'videos' || card.contentType === 'Video') {
    if (!db.videos) db.videos = [];
    const idx = db.videos.findIndex(v => v.id === card.id);
    const vidObj = {
      ...card,
      speaker: card.owner || card.author,
      videoUrl: card.sharePointUrl
    };
    if (idx >= 0) db.videos[idx] = { ...db.videos[idx], ...vidObj };
    else db.videos.unshift(vidObj);
  } else if (cat === 'report-library' || card.contentType === 'Sample Report') {
    if (!db.reports) db.reports = [];
    const idx = db.reports.findIndex(r => r.id === card.id);
    const repObj = {
      ...card,
      author: card.owner || card.author,
      downloadUrl: card.sharePointUrl,
      summary: card.description
    };
    if (idx >= 0) db.reports[idx] = { ...db.reports[idx], ...repObj };
    else db.reports.unshift(repObj);
  }

  // Always keep in db.documents as canonical searchable index
  if (!db.documents) db.documents = [];
  const dIdx = db.documents.findIndex(d => d.id === card.id);
  if (dIdx >= 0) db.documents[dIdx] = { ...db.documents[dIdx], ...card };
  else db.documents.unshift(card);
}

// Removes an asset from all in-memory collections
function removeAssetFromLocalDb(id) {
  if (!id) return;
  if (db.documents) db.documents = db.documents.filter(d => d.id !== id);
  if (db.cases) db.cases = db.cases.filter(c => c.id !== id);
  if (db.publications) db.publications = db.publications.filter(p => p.id !== id);
  if (db.videos) db.videos = db.videos.filter(v => v.id !== id);
  if (db.reports) db.reports = db.reports.filter(r => r.id !== id);
  if (db.brandAssets) db.brandAssets = db.brandAssets.filter(b => b.id !== id);
  if (db.templates) db.templates = db.templates.filter(t => t.id !== id);
}

// Synchronize cards from central Supabase database
async function syncFromCentralDatabase(silent = false) {
  updateCloudDbUI('connecting');
  const res = await supabaseService.fetchActiveAssets();
  
  if (!res.configured) {
    updateCloudDbUI('unconfigured');
    return false;
  }

  if (res.success && Array.isArray(res.data)) {
    if (res.data.length > 0) {
      res.data.forEach(row => {
        const card = mapSupabaseRowToCard(row);
        if (card) applyAssetToLocalDb(card);
      });
      if (!silent) {
        showToast(`Synchronized ${res.data.length} shared assets from Central Hub.`);
      }
    }
    updateCloudDbUI('connected', res.data.length);

    // Subscribe to realtime changes for instant updates across team browsers
    supabaseService.subscribeToRealtime((event) => {
      handleRealtimeEvent(event);
    });

    return true;
  } else {
    console.warn('[Central DB] Could not fetch assets:', res.error);
    updateCloudDbUI('error', 0, res.error);
    return false;
  }
}

// Handles incoming real-time events from Supabase
function handleRealtimeEvent(event) {
  if (!event) return;
  const userTeam = getCurrentUserTeam();

  if (event.type === 'INSERT') {
    const card = mapSupabaseRowToCard(event.item);
    if (!card) return;
    applyAssetToLocalDb(card);

    if (canTeamViewVisibility(userTeam, card.visibility || card.department)) {
      showToast(`New shared card: "${card.title}" added by ${card.created_by}!`);
      window.refreshCurrentView();
    }
  } else if (event.type === 'UPDATE') {
    const card = mapSupabaseRowToCard(event.item);
    if (!card) return;
    applyAssetToLocalDb(card);

    if (canTeamViewVisibility(userTeam, card.visibility || card.department)) {
      showToast(`Card updated: "${card.title}"`);
      window.refreshCurrentView();
    } else {
      window.refreshCurrentView();
    }
  } else if (event.type === 'DELETE') {
    removeAssetFromLocalDb(event.id);
    showToast('A content card was removed from the Central Hub.');
    window.refreshCurrentView();
  }
}

// Update UI badge and modal telemetry for cloud database
function updateCloudDbUI(status, count = null, err = null) {
  const dot = document.getElementById('cloudDbDot');
  const label = document.getElementById('cloudDbLabel');
  const modalStatusDot = document.getElementById('modalDbStatusDot');
  const modalStatusTitle = document.getElementById('modalDbStatusTitle');
  const modalAssetCount = document.getElementById('modalDbAssetCount');

  if (dot && label) {
    if (status === 'connected') {
      dot.style.backgroundColor = '#10b981';
      dot.style.boxShadow = '0 0 0 2px rgba(16, 185, 129, 0.25)';
      label.textContent = count !== null ? `Cloud Live (${count})` : 'Cloud Live';
    } else if (status === 'connecting') {
      dot.style.backgroundColor = '#3b82f6';
      dot.style.boxShadow = '0 0 0 2px rgba(59, 130, 246, 0.25)';
      label.textContent = 'Connecting...';
    } else if (status === 'error') {
      dot.style.backgroundColor = '#ef4444';
      dot.style.boxShadow = '0 0 0 2px rgba(239, 68, 68, 0.25)';
      label.textContent = 'Cloud Error';
    } else {
      dot.style.backgroundColor = '#f59e0b';
      dot.style.boxShadow = 'none';
      label.textContent = 'Connect Cloud';
    }
  }

  if (modalStatusDot && modalStatusTitle) {
    if (status === 'connected') {
      modalStatusDot.style.backgroundColor = '#10b981';
      modalStatusTitle.textContent = 'Connected & Synchronized (Supabase Realtime Live)';
      if (modalAssetCount && count !== null) modalAssetCount.textContent = `${count} cards`;
    } else if (status === 'connecting') {
      modalStatusDot.style.backgroundColor = '#3b82f6';
      modalStatusTitle.textContent = 'Connecting to Supabase...';
    } else if (status === 'error') {
      modalStatusDot.style.backgroundColor = '#ef4444';
      modalStatusTitle.textContent = `Connection Notice: ${err || 'Disconnected'}`;
    } else {
      modalStatusDot.style.backgroundColor = '#f59e0b';
      modalStatusTitle.textContent = 'Cloud Database Not Configured';
      if (modalAssetCount) modalAssetCount.textContent = '0 cards';
    }
  }
}

// Map document content type to standard product categories: about-product, evidence, scientific, training-sales, other
function getProductAssetCategory(doc) {
  if (!doc) return 'other';
  const ct = (doc.contentType || '').toLowerCase().trim();
  const rawCat = (doc.category || '').toLowerCase().trim();
  const docId = String(doc.id || '');

  // 1. Evidence: Case studies, sample reports, clinical evidence
  if (
    docId.startsWith('case-') ||
    docId.startsWith('report-') ||
    rawCat === 'case-library' ||
    rawCat === 'report-library' ||
    ct === 'case study' ||
    ct === 'case studies' ||
    ct === 'cases' ||
    ct === 'sample report' ||
    ct === 'sample reports' ||
    ct === 'patient report' ||
    ct === 'clinical evidence' ||
    ct.includes('sample report') ||
    ct === 'evidence'
  ) {
    return 'evidence';
  }

  // 2. Scientific: Whitepaper, publication, clinical validity study
  if (
    docId.startsWith('pub-') ||
    rawCat === 'publications' ||
    ct === 'whitepaper' ||
    ct === 'white paper' ||
    ct === 'publication' ||
    ct === 'publications' ||
    ct === 'journal' ||
    ct === 'poster' ||
    ct === 'scientific'
  ) {
    return 'scientific';
  }

  // 3. About Product: Brochure, product overview, flyer, one pager, FAQ
  if (
    ct === 'brochure' ||
    ct === 'about product' ||
    ct === 'product overview' ||
    ct === 'one pager' ||
    ct === 'two pager' ||
    ct === 'product flyer' ||
    ct === 'faq' ||
    ct.includes('brochure')
  ) {
    return 'about-product';
  }

  // 4. Training & Sales Enablement: Sales deck, presentation, battlecard, playbook, training, video, objection handling
  if (
    docId.startsWith('vid-') ||
    rawCat === 'videos' ||
    rawCat === 'sales-enablement' ||
    ct === 'training & sales enablement' ||
    ct === 'training & sales' ||
    ct === 'sales enablement' ||
    ct === 'training' ||
    ct === 'sales deck' ||
    ct === 'presentation' ||
    ct === 'battlecard' ||
    ct === 'playbook' ||
    ct === 'sales playbook' ||
    ct === 'objection handling' ||
    ct === 'video' ||
    doc.isSalesAsset
  ) {
    return 'training-sales';
  }

  // 5. Other: Brand assets, templates, infographics, general collateral
  return 'other';
}


// Application State
let currentRole = 'marketing_admin';
let currentTheme = 'light';
let userFavorites = new Set(['doc-041', 'doc-046', 'doc-051']); // Default mock favorites (OncoCTC, OncoAlibrex, OncoIncytes)
let recentAssets = ['doc-041', 'doc-046', 'doc-051'];
let activeSearchQuery = '';
let activeQuizTab = 'quiz';
let currentMicrositeId = null;
let currentMicrositeTab = 'assets'; // 'quiz' or 'leaderboard'
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

// Authorized Marketing Team Emails
const authorizedMarketingEmails = [
  "sharad.jaiswal@1cell.ai",
  "vikas.naguru@1cell.ai",
  "parita.razdan@1cell.ai",
  "arjvee.vaidya@1cell.ai",
  "tanisha.tolani@1cell.ai",
  "pranad.kshirsagar@1cell.ai",
  "richa@1cell.ai",
  "ishita.dhaddha@1cell.ai"
];
window.authorizedMarketingEmails = authorizedMarketingEmails;

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

// Bind Cloud Database Setup Modal & Connection Controls
function bindCloudDbModalEvents() {
  const cloudDbBtn = document.getElementById('cloudDbBtn');
  const cloudDbModal = document.getElementById('cloudDbModal');
  const cloudDbModalClose = document.getElementById('cloudDbModalClose');
  const cloudDbModalCloseBtn = document.getElementById('cloudDbModalCloseBtn');
  const form = document.getElementById('cloudDbConfigForm');
  const btnReset = document.getElementById('btnResetCloudDb');
  const btnSeedDb = document.getElementById('btnSeedCloudDb');
  const btnCopySql = document.getElementById('btnCopyCloudSql');

  if (cloudDbBtn && cloudDbModal) {
    cloudDbBtn.addEventListener('click', () => {
      const cfg = getActiveSupabaseConfig();
      const urlInput = document.getElementById('cfgSupabaseUrl');
      const keyInput = document.getElementById('cfgSupabaseAnonKey');
      if (urlInput) urlInput.value = cfg.supabaseUrl || '';
      if (keyInput) keyInput.value = cfg.supabaseAnonKey || '';
      openModal(cloudDbModal);
    });
  }

  if (cloudDbModalClose && cloudDbModal) {
    cloudDbModalClose.addEventListener('click', () => closeModal(cloudDbModal));
  }
  if (cloudDbModalCloseBtn && cloudDbModal) {
    cloudDbModalCloseBtn.addEventListener('click', () => closeModal(cloudDbModal));
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const url = (document.getElementById('cfgSupabaseUrl')?.value || '').trim();
      const key = (document.getElementById('cfgSupabaseAnonKey')?.value || '').trim();

      if (!url || !key) {
        showToast('Please provide both Supabase Project URL and Public Anon Key.');
        return;
      }

      saveActiveSupabaseConfig({ supabaseUrl: url, supabaseAnonKey: key });
      showToast('Connecting to Supabase...');
      const ok = await syncFromCentralDatabase(false);
      if (ok) {
        showToast('Successfully connected to Supabase Central Database!');
        window.refreshCurrentView();
      } else {
        showToast('Could not connect to Supabase. Check credentials and ensure table exists.');
      }
    });
  }

  if (btnReset) {
    btnReset.addEventListener('click', () => {
      if (confirm('Disconnect from central Supabase database and reset credentials?')) {
        clearSupabaseConfig();
        const urlInput = document.getElementById('cfgSupabaseUrl');
        const keyInput = document.getElementById('cfgSupabaseAnonKey');
        if (urlInput) urlInput.value = '';
        if (keyInput) keyInput.value = '';
        updateCloudDbUI('unconfigured');
        showToast('Database disconnected.');
      }
    });
  }

  if (btnSeedDb) {
    btnSeedDb.addEventListener('click', async () => {
      if (!isSupabaseConfigured()) {
        showToast('Please connect to Supabase first before seeding.');
        return;
      }
      btnSeedDb.disabled = true;
      btnSeedDb.textContent = 'Seeding Cloud Database...';
      try {
        const resp = await fetch('backup_seed_assets.json');
        if (!resp.ok) throw new Error('Could not load backup_seed_assets.json');
        const seedData = await resp.json();
        
        let inserted = 0;
        const client = await supabaseService.getClient();
        if (!client) throw new Error('Supabase client unavailable.');

        for (const item of seedData) {
          const { error } = await client.from('content_assets').upsert([item], { onConflict: 'id' });
          if (!error) inserted++;
        }
        showToast(`Successfully seeded ${inserted} cards to Supabase!`);
        await syncFromCentralDatabase(true);
        window.refreshCurrentView();
      } catch (err) {
        showToast(`Seed error: ${err.message}`);
      } finally {
        btnSeedDb.disabled = false;
        btnSeedDb.textContent = 'Seed All Existing Cards to Database';
      }
    });
  }

  if (btnCopySql) {
    btnCopySql.addEventListener('click', async () => {
      try {
        const resp = await fetch('supabase_schema_and_seed.sql');
        const sqlText = await resp.text();
        await navigator.clipboard.writeText(sqlText);
        showToast('Complete SQL Schema & Seed script copied to clipboard!');
      } catch (e) {
        showToast('Could not copy SQL. You can open supabase_schema_and_seed.sql in the repo.');
      }
    });
  }
}

// Initialize Application
function init() {
  // Sync cards from central Supabase database
  syncFromCentralDatabase(true);
  bindCloudDbModalEvents();
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
    const newRole = e.target.value;
    
    // Validate Marketing email authorization if switching manually
    if (newRole === 'marketing_admin') {
      const email = sessionStorage.getItem("authEmail");
      if (email) {
        const cleanEmail = email.toLowerCase().trim();
        if (!authorizedMarketingEmails.includes(cleanEmail)) {
          showToast("Access denied: Your email is not authorized for the Marketing Admin role.");
          // Revert selection
          let prevRole = 'sales';
          const authDept = sessionStorage.getItem("authDept");
          if (authDept === 'Leadership') prevRole = 'leadership';
          else if (authDept === 'Genomic Scientist') prevRole = 'medical';
          roleSelect.value = prevRole;
          currentRole = prevRole;
          return;
        }
      }
    }

    currentRole = newRole;

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

  // Edit Modal Event Listeners
  const editModal = document.getElementById('editAssetModal');
  const editModalClose = document.getElementById('editAssetModalClose');
  const editModalCancel = document.getElementById('editAssetModalCancel');
  const editModalSave = document.getElementById('editAssetModalSave');
  const editDocTestLinkBtn = document.getElementById('editDocTestLinkBtn');

  if (editModalClose) editModalClose.addEventListener('click', () => closeModal(editModal));
  if (editModalCancel) editModalCancel.addEventListener('click', () => closeModal(editModal));
  if (editModalSave) editModalSave.addEventListener('click', window.saveAssetEdit);
  const editDocDeleteBtn = document.getElementById('editDocDeleteBtn');
  if (editDocDeleteBtn) {
    editDocDeleteBtn.addEventListener('click', () => {
      const docId = document.getElementById('editDocId').value;
      if (docId) window.deleteAsset(docId);
    });
  }
  if (editDocTestLinkBtn) {
    editDocTestLinkBtn.addEventListener('click', () => {
      const spUrl = document.getElementById('editDocSpUrl').value.trim();
      if (!spUrl) {
        showToast("Please enter a SharePoint URL to test.");
        return;
      }
      window.open(spUrl, '_blank');
      showToast("Testing SharePoint link in new tab...");
    });
  }

  // Sample Report Modal Event Listeners
  const sampleReportModal = document.getElementById('sampleReportModal');
  const sampleReportModalClose = document.getElementById('sampleReportModalClose');
  const sampleReportModalCancel = document.getElementById('sampleReportModalCancel');
  const sampleReportModalSave = document.getElementById('sampleReportModalSave');
  if (sampleReportModalClose) sampleReportModalClose.addEventListener('click', () => closeModal(sampleReportModal));
  if (sampleReportModalCancel) sampleReportModalCancel.addEventListener('click', () => closeModal(sampleReportModal));
  if (sampleReportModalSave) sampleReportModalSave.addEventListener('click', window.saveNewSampleReport);


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
        if (errorMsg) {
          const span = errorMsg.querySelector('span');
          if (span) span.innerText = "Access denied: Only official @1cell.ai email domains are authorized.";
          errorMsg.style.display = 'flex';
        }
        showToast("Access denied: Only official @1cell.ai email domains are authorized.");
        return;
      }

      const normTeam = normalizeTeam(dept);

      // Marketing team authorization validation
      if (normTeam === TEAMS.MARKETING) {
        const cleanEmail = email.toLowerCase().trim();
        if (!authorizedMarketingEmails.includes(cleanEmail)) {
          if (emailInput) emailInput.classList.add('input-error');
          if (errorMsg) {
            const span = errorMsg.querySelector('span');
            if (span) span.innerText = "Access denied: Your email is not registered in the Marketing team. Choose another department.";
            errorMsg.style.display = 'flex';
          }
          showToast("Access denied: Email not registered in the Marketing team.");
          return;
        }
      }

      if (name && email && dept) {
        sessionStorage.setItem("authName", name);
        sessionStorage.setItem("authEmail", email);
        sessionStorage.setItem("authDept", dept);
        sessionStorage.setItem("authTeam", normTeam);

        // Map team to matching role view
        let targetRole = 'marketing_admin';
        if (normTeam === TEAMS.SCIENTIFIC) targetRole = 'medical';
        else if (normTeam === TEAMS.SALES) targetRole = 'sales';
        else if (normTeam === TEAMS.LEADERSHIP) targetRole = 'leadership';

        currentRole = targetRole;
        if (roleSelect) {
          roleSelect.value = targetRole;
        }

        checkAuth();
        updateUserBadge();
        updateSidebarCategories();
        renderRoute('dashboard');
        const teamLabel = normTeam === 'scientific' ? 'Scientific Team' : normTeam === 'marketing' ? 'Marketing Team' : `${dept} Team`;
        showToast(`Welcome to 1Cell.Ai, ${name} (${teamLabel})!`);
      }
    });
  }

  if (signOutBtn) {
    signOutBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      sessionStorage.removeItem("authName");
      sessionStorage.removeItem("authEmail");
      sessionStorage.removeItem("authDept");
      sessionStorage.removeItem("authTeam");
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
    authorInput.value = '1Cell.Ai';
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

  const roleSelectorWrapper = document.querySelector('.role-pill-selector');
  if (roleSelectorWrapper) {
    if (dept === 'Marketing' || dept === 'Leadership') {
      roleSelectorWrapper.style.display = '';
    } else {
      roleSelectorWrapper.style.display = 'none';
    }
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

  // Sections hidden across platform for now
  const hiddenRoutes = ['campaigns', 'sales-enablement', 'videos', 'brand-assets', 'templates', 'newsletters'];
  if (hiddenRoutes.includes(route)) {
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
    case 'report-library':
      renderReportLibrary();
      break;
    case 'publications':
      renderPublications();
      break;
    case 'speakers':
      renderSpeakerProfiles();
      break;
    case 'quiz':
      renderQuizPage();
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

// Dynamic render for product-wise SharePoint & OneDrive documents directory
function renderDashboardProductDocs(productName) {
  const container = document.getElementById('dashboardProductDocsContainer');
  if (!container) return;

  const userTeam = getCurrentUserTeam();
  const relatedDocs = db.documents.filter(d => d.product === productName && canTeamViewVisibility(userTeam, d.visibility || d.department));

  const productObj = db.products.find(p => p.id === productName);
  
  if (relatedDocs.length === 0) {
    container.innerHTML = `<div style="grid-column: 1 / -1; color: var(--text-tertiary); font-size: 13px; text-align: center; padding: 24px;">No documents registered in this product folder for your team (${userTeam === 'scientific' ? 'Scientific Team' : 'Marketing Team'}).</div>`;
    return;
  }

  let html = '';
  if (productObj) {
    html += `
      <div style="grid-column: 1 / -1; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px; background:var(--bg-secondary); border:1px solid var(--border-color); border-radius:10px; padding:10px 16px; margin-bottom:6px;">
        <div style="display:flex; align-items:center; gap:12px;">
          <div class="product-tile-logo-badge" style="height:38px; padding:4px 10px;">
            <img src="${productObj.logo}" alt="${productObj.name}" style="height:26px; max-width:140px; object-fit:contain;" onerror="this.onerror=null;this.src='assets/logos/logo_1cell.png';" />
          </div>
          <div>
            <div style="font-size:13.5px; font-weight:700; color:var(--text-primary);">${productObj.name} SharePoint & OneDrive Assets</div>
            <div style="font-size:12px; color:var(--text-secondary);">${relatedDocs.length} files accessible to your team</div>
          </div>
        </div>
        <div style="display:flex; align-items:center; gap:8px;">
          <button class="btn-primary" style="padding:5px 14px; font-size:11.5px; font-weight:600;" onclick="window.openProductMicrosite('${productObj.id}')">Open Product Hub Workspace →</button>
        </div>
      </div>
    `;
  }

  relatedDocs.forEach(doc => {
    let icon = '📄';
    if (doc.contentType === 'Brochure') icon = '📖';
    else if (doc.contentType === 'Whitepaper' || doc.contentType === 'WhitePaper') icon = '🧬';
    else if (doc.contentType === 'Case Study' || doc.contentType === 'Case Studies') icon = '🔬';
    else if (doc.contentType === 'Battlecard') icon = '⚔️';
    else if (doc.contentType === 'Presentation' || doc.contentType === 'Sales Deck') icon = '📊';
    else if (doc.contentType === 'Sample Report') icon = '📋';

    const biomarkerBadge = (doc.biomarker && doc.biomarker !== 'None') ? `<span class="badge badge-biomarker">${doc.biomarker}</span>` : '';

    html += `
      <div class="folder-doc-card" id="folder-card-${doc.id}" onclick="window.openSharePoint('${doc.id}')" style="cursor:pointer;" title="Click to view file in OneDrive/SharePoint">
        <div class="folder-doc-header">
          <span class="folder-doc-icon">${icon}</span>
          <div style="flex: 1;">
            <div class="folder-doc-title">${doc.title}</div>
            <div class="folder-doc-path" style="display:flex; align-items:center; gap:6px; flex-wrap:wrap; margin-top:4px;">
              ${biomarkerBadge}
              <span style="font-size:11px; color:var(--text-tertiary); margin-left:2px;">${doc.folderPath || 'Shared Documents'}</span>
            </div>
          </div>
        </div>
        <div class="folder-doc-actions">
          <button onclick="event.stopPropagation(); window.openSharePoint('${doc.id}')" class="btn-primary" style="padding:4px 12px; font-size:11px; font-weight:600;" title="Open document in OneDrive/SharePoint">
            View
          </button>
          <button onclick="event.stopPropagation(); window.previewDocument('${doc.id}')" title="Preview metadata and properties">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:13px;height:13px;">
              <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Details
          </button>
          <button onclick="event.stopPropagation(); window.openEditAssetModal('${doc.id}')" style="color: var(--accent-color);" title="Edit File & Direct Link">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:13px;height:13px;">
              <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
            </svg>
            Edit
          </button>
          <button onclick="event.stopPropagation(); window.deleteAsset('${doc.id}')" style="color:#ef4444;" title="Delete Content Card (Leaves OneDrive file untouched)">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:13px;height:13px;">
              <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
            Delete
          </button>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

// 1. Dashboard View

// Register New Asset Modal Trigger with Category Presets
window.triggerRegisterAssetModal = function(routeName) {
  const uploadForm = document.getElementById('uploadForm');
  if (uploadForm) {
    uploadForm.reset();
  }
  
  const categorySelect = document.getElementById('formCategory');
  if (categorySelect) {
    if (routeName === 'dashboard' || routeName === 'favorites' || routeName === 'company-assets') {
      categorySelect.value = 'company-assets';
    } else {
      categorySelect.value = routeName;
    }
  }

  // Pre-fill department based on user department or Corporate for company-assets
  const authDept = sessionStorage.getItem("authDept");
  const deptSelect = document.getElementById('formDept');
  if (deptSelect) {
    if (routeName === 'company-assets') {
      deptSelect.value = 'Corporate';
    } else if (authDept && ["Marketing", "Medical", "Product", "Scientific", "Sales", "HR", "Corporate"].includes(authDept)) {
      deptSelect.value = authDept;
    }
  }

  // Preset product to None (General / Corporate) for company-assets
  const productSelect = document.getElementById('formProduct');
  if (productSelect) {
    if (routeName === 'company-assets') {
      productSelect.value = '';
    }
  }

  // Update modal title for clarity
  const modalTitle = document.querySelector('#uploadModal .modal-title');
  if (modalTitle) {
    if (routeName === 'company-assets') {
      modalTitle.innerText = 'Register New Company Asset';
    } else {
      modalTitle.innerText = 'Create / Update Metadata Record';
    }
  }

  // Ensure default Cancer Type is None, Biomarker is None, and Owner is 1Cell.Ai
  const cancerSelect = document.getElementById('formCancer');
  if (cancerSelect) {
    cancerSelect.value = 'None';
  }
  const biomarkerSelect = document.getElementById('formBiomarker');
  if (biomarkerSelect) {
    biomarkerSelect.value = 'None';
  }
  const authorInput = document.getElementById('formAuthor');
  if (authorInput) {
    authorInput.value = '1Cell.Ai';
  }

  const uploadModal = document.getElementById('uploadModal');
  if (uploadModal) {
    openModal(uploadModal);
  }
};

// Category Header Generator with Register Asset Button
window.renderCategoryHeader = function(title, subtitle, routeName) {
  const authDept = sessionStorage.getItem("authDept");
  let dept = authDept;
  if (!dept) {
    if (currentRole === 'marketing_admin') dept = 'Marketing';
    else if (currentRole === 'sales') dept = 'Sales';
    else if (currentRole === 'medical') dept = 'Genomic Scientist';
    else if (currentRole === 'leadership') dept = 'Leadership';
  }

  let actionsHtml = '';
  if (dept === 'Marketing' || dept === 'Leadership') {
    actionsHtml = `
      <button class="btn-primary" onclick="window.triggerRegisterAssetModal('${routeName}')">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" style="width:16px;height:16px;margin-right:8px;display:inline-block;vertical-align:middle;">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        <span style="vertical-align:middle;">Register New Asset</span>
      </button>
    `;
  }

  return `
    <div class="welcome-banner" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
      <div>
        <h1 class="welcome-title">${title}</h1>
        <p class="welcome-subtitle">${subtitle}</p>
      </div>
      <div class="welcome-banner-actions">
        ${actionsHtml}
      </div>
    </div>
  `;
};

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

  // Conditionally render Admin uploads based on department: only Marketing and Leadership
  if (dept === 'Marketing' || dept === 'Leadership') {
    actionsHtml = `
      <button class="btn-primary" id="dashUploadBtn" onclick="window.triggerRegisterAssetModal('dashboard')">
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

    <!-- Product-wise SharePoint Folder Directory Tabs -->
    <div class="dashboard-section">
      <div class="section-title-row" style="margin-bottom: 12px;">
        <h2 class="section-headline">Quick Product Assets (SharePoint Directory)</h2>
      </div>
      
      <!-- Product Tabs Container -->
      <div class="product-tabs-container">
        ${db.products.map((p, idx) => `
          <button class="product-tab ${idx === 0 ? 'active' : ''}" data-product="${p.id}">${p.name}</button>
        `).join('')}
      </div>
      
      <!-- Folders Directory Content View -->
      <div id="dashboardProductDocsContainer" class="product-docs-folder-view">
        <!-- Rendered dynamically -->
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
                  <h4 style="font-size:13px; font-weight:600; margin-bottom: 2px;">${d.title}</h4>
                  <span style="font-size:11px; color:var(--text-tertiary);">${d.views || d.viewCount || 0} views • ${d.department}</span>
                </div>
              </div>
            `).join('')}
        </div>
      </div>
    </div>
  `;

  // Attach button triggers
  const dashUploadBtn = document.getElementById('dashUploadBtn');
  if (dashUploadBtn) {
    dashUploadBtn.addEventListener('click', () => {
      window.triggerRegisterAssetModal('dashboard');
    });
  }

  // Set up product tabs click handlers
  const tabs = workspaceViewport.querySelectorAll('.product-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const selectedProduct = tab.getAttribute('data-product');
      renderDashboardProductDocs(selectedProduct);
    });
  });

  // Initial render: check URL hash or default to oncoindx
  const initialHash = (window.location.hash || '').replace('#', '').toLowerCase();
  const matchedTab = initialHash && workspaceViewport.querySelector(`.product-tab[data-product="${initialHash}"]`);
  if (matchedTab) {
    tabs.forEach(t => t.classList.remove('active'));
    matchedTab.classList.add('active');
    renderDashboardProductDocs(initialHash);
  } else {
    renderDashboardProductDocs('oncoindx');
  }
}

// Helper to derive clean standard content category name for cards
function getCardCategoryLabel(doc) {
  const cat = getProductAssetCategory(doc);
  if (cat === 'about-product') return 'About Product';
  if (cat === 'evidence') return 'Evidence';
  if (cat === 'scientific') return 'Scientific';
  if (cat === 'training-sales') return 'Training & Sales';
  return 'Other';
}
window.getCardCategoryLabel = getCardCategoryLabel;

// Render document card template
function renderDocumentCard(doc) {
  const isFav = userFavorites.has(doc.id);
  const biomarkerBadge = (doc.biomarker && doc.biomarker !== 'None') ? `<span class="badge badge-biomarker">${doc.biomarker}</span>` : '';
  const productObj = doc.product ? db.products.find(p => p.id === doc.product) : null;
  const productTag = productObj ? `<span class="badge badge-prod" style="display:inline-flex; align-items:center; gap:4px;"><img src="assets/logos/sphere_icon.png" alt="" style="width:11px; height:11px; object-fit:contain; vertical-align:middle;" />${productObj.name}</span>` : (doc.product ? `<span class="badge badge-prod">${doc.product.toUpperCase()}</span>` : `<span class="badge badge-prod" style="background:#e8edf5; color:#1a365d; font-weight:600; display:inline-flex; align-items:center; gap:4px;"><img src="assets/logos/sphere_icon.png" alt="" style="width:11px; height:11px; object-fit:contain; vertical-align:middle;" />Corporate</span>`);

  return `
    <div class="doc-card" id="card-${doc.id}" onclick="window.openSharePoint('${doc.id}')" style="cursor:pointer;" title="Click to view file in OneDrive/SharePoint">
      <div class="card-header-bar">
        <div class="card-type-icon">
          ${doc.contentType === 'Video' ? '🎥' : doc.contentType === 'Sales Deck' || doc.contentType === 'Presentation' ? '📊' : doc.contentType === 'Sample Report' ? '📋' : '📄'}
        </div>
        <div class="card-tags">
          ${productTag}
          ${biomarkerBadge}
        </div>
      </div>
      <div class="card-body">
        <h3 class="card-title">${doc.title}</h3>
        <p class="card-description">${doc.description || ''}</p>
        <div class="card-metadata">
          <div class="meta-row">
            <span>Updated:</span>
            <span class="meta-value">${doc.updatedDate || doc.createdDate || 'Recent'}</span>
          </div>
        </div>
      </div>
      <div class="card-actions-bar" style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
        <button class="btn-primary" style="padding:5px 16px; font-size:11.5px; font-weight:600; display:inline-flex; align-items:center; gap:6px;" onclick="event.stopPropagation(); window.openSharePoint('${doc.id}')" title="View Document in OneDrive/SharePoint (View Only)">
          <span>View</span>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" style="width:12px;height:12px;">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
          </svg>
        </button>
        <div style="display:flex; gap: 4px; align-items:center;">
          <button class="card-action-btn" onclick="event.stopPropagation(); window.openEditAssetModal('${doc.id}')" title="Edit File & Direct Link">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
            </svg>
          </button>
          <button class="card-action-btn ${isFav ? 'active' : ''}" onclick="event.stopPropagation(); window.toggleFavorite('${doc.id}')" title="Bookmark Asset">
            <svg xmlns="http://www.w3.org/2000/svg" fill="${isFav ? 'currentColor' : 'none'}" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
            </svg>
          </button>
          <button class="card-action-btn" onclick="event.stopPropagation(); window.shareAsset('${doc.id}')" title="Copy Document Share Link">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186l5.572 3.285m-5.572-3.285L12.79 6.94m0 0a2.25 2.25 0 103.504-1.408 2.25 2.25 0 00-3.504 1.408zm0 10.12l3.504 1.409a2.25 2.25 0 101.076-2.186l-4.58-1.833z" />
            </svg>
          </button>
          <button class="card-action-btn" onclick="event.stopPropagation(); window.deleteAsset('${doc.id}')" title="Remove Card from Hub (Leaves OneDrive file untouched)" style="color:#ef4444;">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  `;
}

// Helper to determine if a document is purely a Company/Corporate asset (not a Product workspace asset)
function isCompanyAsset(d) {
  if (!d) return false;
  const prod = (d.product || '').toLowerCase().trim();
  // If document belongs to a specific product model, it is NEVER a company asset
  if (prod && prod !== 'company' && prod !== 'corporate' && prod !== 'none' && prod !== 'null') {
    return false;
  }
  // Exclude case studies, sample reports, and publications
  if (d.contentType === 'Case Study' || d.contentType === 'Sample Report' || d.contentType === 'Publication') {
    return false;
  }
  return prod === 'company' || prod === 'corporate' || (!prod && (d.category === 'company-assets' || d.department === 'Corporate'));
}
window.isCompanyAsset = isCompanyAsset;

// 2. Company Assets View
function renderCompanyAssets() {
  const userTeam = getCurrentUserTeam();
  const assets = db.documents.filter(d => isCompanyAsset(d) && canTeamViewVisibility(userTeam, d.visibility || d.department));

  workspaceViewport.innerHTML = `
    <div class="welcome-banner" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
      <div>
        <h1 class="welcome-title">Company Profile & Corporate Assets</h1>
        <p class="welcome-subtitle">Central collaborative repository for all company-wide documentation, brand identity assets, corporate presentations, legal agreements, and general resources.</p>
      </div>
      <div class="welcome-banner-actions">
        <button class="btn-primary" onclick="window.triggerRegisterAssetModal('company-assets')" style="display:inline-flex; align-items:center; gap:8px; padding:10px 18px; font-weight:600; box-shadow: var(--shadow-sm);">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" style="width:16px;height:16px;">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          <span>+ Add Company Asset</span>
        </button>
      </div>
    </div>

    <!-- Brand Story & Mission/Vision Section from Guidelines v3.0 -->
    <div style="display: grid; grid-template-columns: 1.2fr 1fr 1fr; gap: 24px; margin-bottom: 30px; align-items: stretch;">
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
      <div class="section-title-row" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom: 16px;">
        <div style="display:flex; align-items:center; gap:12px;">
          <h2 class="section-headline" style="margin:0;">Corporate Materials & Company Documents</h2>
          <span class="badge badge-dept" style="font-size:12px; padding:4px 10px; font-weight:600;">${assets.length} Accessible</span>
        </div>
        <div style="display:flex; align-items:center; gap:8px;">
          <button class="btn-outline" onclick="window.triggerRegisterAssetModal('company-assets')" style="font-size:12px; padding:6px 14px; font-weight:600; display:inline-flex; align-items:center; gap:6px;">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" style="width:13px;height:13px;">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span>+ Add Asset</span>
          </button>
        </div>
      </div>
      <div class="assets-grid">
        ${assets.length > 0 ? assets.map(d => renderDocumentCard(d)).join('') : `
          <div style="grid-column: 1 / -1; text-align: center; padding: 48px 24px; background: var(--bg-secondary); border: 2px dashed var(--border-color); border-radius: var(--radius-md);">
            <div style="font-size: 38px; margin-bottom: 12px;">📁</div>
            <h3 style="font-size: 16px; font-weight: 700; margin-bottom: 6px;">No Company Documents Found</h3>
            <p style="font-size: 13px; color: var(--text-secondary); max-width: 440px; margin: 0 auto 16px;">This tab holds all company-wide documents, corporate presentations, brand guidelines, and legal agreements. Click below to add the first asset.</p>
            <button class="btn-primary" onclick="window.triggerRegisterAssetModal('company-assets')">+ Add First Company Asset</button>
          </div>
        `}
      </div>
    </div>
  `;
}

// 3. Product Hub View
function renderProductHub() {
  workspaceViewport.innerHTML = `
    ${window.renderCategoryHeader ? window.renderCategoryHeader('1Cell.Ai Product Hub Workspaces', 'Detailed workspace microsites for every clinical genomics assay model.', 'products') : `
    <div class="welcome-banner">
      <div>
        <h1 class="welcome-title">1Cell.Ai Product Hub Workspaces</h1>
        <p class="welcome-subtitle">Detailed workspace microsites for every clinical genomics assay model.</p>
      </div>
    </div>
    `}

    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); gap: 24px;">
      ${db.products.map(p => {
        const docCount = db.documents.filter(d => d.product === p.id).length;
        const caseCount = db.cases.filter(c => c.relatedProduct === p.id).length;
        const pubCount = db.publications.filter(pub => pub.relatedProduct === p.id).length;
        return `
          <div class="quick-tile-card" style="align-items: flex-start; text-align: left; padding: 24px;" onclick="window.openProductMicrosite('${p.id}')">
            <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; margin-bottom: 16px;">
              <div class="product-tile-logo-badge">
                <img src="${p.logo}" alt="${p.name}" class="product-card-brand-logo" onerror="this.onerror=null;this.src='assets/logos/logo_1cell.png';" />
              </div>
              <span style="font-size: 11px; font-weight: 700; color: var(--accent-color); background: var(--accent-light); padding: 4px 10px; border-radius: 6px;">Explore →</span>
            </div>
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

// Product Microsite Workspace Detail view with 5 Standard Category Tabs:
// All Assets, About Product, Evidence, Scientific, Training & Sales Enablement, Other
window.openProductMicrosite = function(prodId) {
  currentMicrositeId = prodId;
  if (!currentMicrositeTab) currentMicrositeTab = 'all';

  const product = db.products.find(p => p.id === prodId);
  if (!product) return;

  const userTeam = getCurrentUserTeam();
  const allDocs = db.documents.filter(d => d.product === prodId && canTeamViewVisibility(userTeam, d.visibility || d.department));
  const aboutProductDocs = allDocs.filter(d => getProductAssetCategory(d) === 'about-product');
  const evidenceDocs = allDocs.filter(d => getProductAssetCategory(d) === 'evidence');
  const scientificDocs = allDocs.filter(d => getProductAssetCategory(d) === 'scientific');
  const trainingSalesDocs = allDocs.filter(d => getProductAssetCategory(d) === 'training-sales');
  const otherDocs = allDocs.filter(d => getProductAssetCategory(d) === 'other');

  const relatedCases = db.cases.filter(c => c.relatedProduct === prodId);
  const relatedReports = (db.reports || []).filter(r => r.product === prodId);
  const relatedPubs = db.publications.filter(p => p.relatedProduct === prodId);
  const relatedVideos = db.videos.filter(v => v.product === prodId);

  const totalEvidenceCount = evidenceDocs.length + relatedCases.length + relatedReports.length;
  const totalScientificCount = scientificDocs.length + relatedPubs.length;
  const totalTrainingSalesCount = trainingSalesDocs.length + relatedVideos.length;
  const totalOtherCount = otherDocs.length;
  const totalAllCount = allDocs.length + relatedCases.length + relatedReports.length + relatedPubs.length + relatedVideos.length;

  workspaceViewport.innerHTML = `
    <div class="product-workspace-header">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px; margin-bottom:16px;">
        <div style="display:flex; align-items:center; gap:16px;">
          <div class="product-microsite-logo-badge">
            <img src="${product.logo}" alt="${product.name} Logo" class="product-header-brand-logo" onerror="this.onerror=null;this.src='assets/logos/logo_1cell.png';" />
          </div>
          <div>
            <div class="product-tagline">1Cell.Ai Genomic Assays • Product Hub Workspace</div>
            <h1 class="product-name" style="margin-top:2px;">${product.name}</h1>
          </div>
        </div>
        <div style="display:flex; gap:10px; align-items:center;">
          <button class="btn-primary" onclick="window.triggerRegisterProductAsset('${prodId}', '${currentMicrositeTab}')" style="display:flex; align-items:center; gap:6px; padding:9px 18px; font-weight:600; box-shadow:var(--shadow-md);">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" style="width:16px;height:16px;">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span>Add New Asset</span>
          </button>
        </div>
      </div>

      <div class="product-title-row" style="margin-bottom:16px;">
        <p class="product-description-full" style="margin:0; flex:1;">${product.details || product.description}</p>
        <div class="product-stats" style="margin-left:auto;">
          <div class="product-stat-box">
            <div class="product-stat-num">${totalAllCount}</div>
            <div class="product-stat-lbl">Total Assets</div>
          </div>
          <div class="product-stat-box">
            <div class="product-stat-num">${aboutProductDocs.length}</div>
            <div class="product-stat-lbl">About Product</div>
          </div>
          <div class="product-stat-box">
            <div class="product-stat-num">${totalEvidenceCount}</div>
            <div class="product-stat-lbl">Evidence</div>
          </div>
          <div class="product-stat-box">
            <div class="product-stat-num">${totalScientificCount}</div>
            <div class="product-stat-lbl">Scientific</div>
          </div>
          <div class="product-stat-box">
            <div class="product-stat-num">${totalTrainingSalesCount}</div>
            <div class="product-stat-lbl">Training & Sales</div>
          </div>
          <div class="product-stat-box">
            <div class="product-stat-num">${totalOtherCount}</div>
            <div class="product-stat-lbl">Other</div>
          </div>
        </div>
      </div>

      <div class="product-tabs-row" style="display:flex; flex-wrap:wrap; gap:8px;">
        <button class="product-tab-btn ${currentMicrositeTab === 'all' ? 'active' : ''}" data-tab="all" onclick="window.switchProductTab(event, '${prodId}', 'all')">All Assets (${totalAllCount})</button>
        <button class="product-tab-btn ${currentMicrositeTab === 'about-product' ? 'active' : ''}" data-tab="about-product" onclick="window.switchProductTab(event, '${prodId}', 'about-product')">About Product (${aboutProductDocs.length})</button>
        <button class="product-tab-btn ${currentMicrositeTab === 'evidence' ? 'active' : ''}" data-tab="evidence" onclick="window.switchProductTab(event, '${prodId}', 'evidence')">Evidence (${totalEvidenceCount})</button>
        <button class="product-tab-btn ${currentMicrositeTab === 'scientific' ? 'active' : ''}" data-tab="scientific" onclick="window.switchProductTab(event, '${prodId}', 'scientific')">Scientific (${totalScientificCount})</button>
        <button class="product-tab-btn ${currentMicrositeTab === 'training-sales' ? 'active' : ''}" data-tab="training-sales" onclick="window.switchProductTab(event, '${prodId}', 'training-sales')">Training & Sales Enablement (${totalTrainingSalesCount})</button>
        <button class="product-tab-btn ${currentMicrositeTab === 'other' ? 'active' : ''}" data-tab="other" onclick="window.switchProductTab(event, '${prodId}', 'other')">Other (${totalOtherCount})</button>
      </div>
    </div>

    <div id="productTabContent" class="product-workspace-content"></div>
  `;

  renderProductTabContent(prodId, currentMicrositeTab);
};

// Render specific product category tab
function renderProductTabContent(prodId, tabName) {
  const container = document.getElementById('productTabContent');
  if (!container) return;

  const userTeam = getCurrentUserTeam();
  const product = db.products.find(p => p.id === prodId);
  const allDocs = db.documents.filter(d => d.product === prodId && canTeamViewVisibility(userTeam, d.visibility || d.department));

  const aboutProductDocs = allDocs.filter(d => getProductAssetCategory(d) === 'about-product');
  const evidenceDocs = allDocs.filter(d => getProductAssetCategory(d) === 'evidence');
  const scientificDocs = allDocs.filter(d => getProductAssetCategory(d) === 'scientific');
  const trainingSalesDocs = allDocs.filter(d => getProductAssetCategory(d) === 'training-sales');
  const otherDocs = allDocs.filter(d => getProductAssetCategory(d) === 'other');

  const relatedCases = db.cases.filter(c => c.relatedProduct === prodId);
  const relatedReports = (db.reports || []).filter(r => r.product === prodId);
  const relatedPubs = db.publications.filter(p => p.relatedProduct === prodId);
  const relatedVideos = db.videos.filter(v => v.product === prodId);

  const emptyState = (catName) => `
    <div style="text-align:center; padding:48px 24px; background:var(--card-bg); border:1px dashed var(--border-color); border-radius:12px; width:100%;">
      <div style="font-size:36px; margin-bottom:10px;">📁</div>
      <h3 style="font-size:16px; font-weight:700; margin-bottom:6px; color:var(--text-primary);">No ${catName} files registered for ${product.name}</h3>
      <p style="font-size:13px; color:var(--text-secondary); margin-bottom:18px;">Add a new ${catName} card with its direct OneDrive / SharePoint link to make it accessible to your team.</p>
      <button class="btn-primary" onclick="window.triggerRegisterProductAsset('${prodId}', '${tabName}')">
        + Add ${catName} Asset
      </button>
    </div>
  `;

  if (tabName === 'all') {
    let html = '<div class="assets-grid">';
    let renderedCount = 0;
    if (allDocs.length > 0) {
      html += allDocs.map(d => renderDocumentCard(d)).join('');
      renderedCount += allDocs.length;
    }
    const docIds = new Set(allDocs.map(d => d.id));
    if (relatedCases.length > 0) {
      relatedCases.filter(c => !docIds.has(c.id)).forEach(c => {
        html += renderDocumentCard({
          id: c.id,
          title: c.title,
          description: c.summary,
          department: 'Medical',
          product: c.relatedProduct,
          contentType: 'Case Studies',
          cancerType: c.cancerType,
          biomarker: c.biomarker,
          status: 'Approved',
          version: 'v1.0',
          author: c.doctor || '1Cell.Ai',
          owner: c.doctor || '1Cell.Ai',
          sharePointUrl: c.readMoreUrl || c.oneDriveUrl
        });
        renderedCount++;
      });
    }
    if (relatedReports.length > 0) {
      relatedReports.filter(r => !docIds.has(r.id)).forEach(r => {
        html += renderDocumentCard({
          id: r.id,
          title: r.title,
          description: r.summary,
          department: 'Medical',
          product: r.product,
          contentType: 'Sample Report',
          cancerType: r.cancerType,
          biomarker: r.biomarker,
          status: r.status || 'Approved',
          version: r.version || 'v1.0',
          author: r.author || '1Cell.Ai',
          owner: r.owner || '1Cell.Ai',
          sharePointUrl: r.sharePointUrl
        });
        renderedCount++;
      });
    }
    if (relatedPubs.length > 0) {
      relatedPubs.filter(p => !docIds.has(p.id)).forEach(pub => {
        html += `
          <div class="pub-item" style="grid-column: 1 / -1; cursor:pointer;" onclick="window.openSharePoint('${pub.id}')" title="Click to view publication in SharePoint">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:8px;">
              <div class="pub-journal">${pub.journal} (${pub.publishedDate})</div>
              <div style="display:flex; gap:6px; flex-wrap:wrap; align-items:center;">
                <span class="badge badge-prod">${(db.products.find(p => p.id === pub.relatedProduct) || {}).name || '1Cell.Ai'}</span>
              </div>
            </div>
            <h3 style="font-size:17px; font-weight:700; margin-bottom:8px;">${pub.title}</h3>
            <div class="pub-authors">${pub.authors}</div>
            <div class="pub-abstract-box"><strong>Abstract:</strong> ${pub.abstract}</div>
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
              <div class="pub-citation"><strong>Citation:</strong> ${pub.citation}</div>
              <div style="display:flex; gap:8px;">
                <button class="btn-outline" style="padding:6px 12px; font-size:12px;" onclick="event.stopPropagation(); window.openEditAssetModal('${pub.id}')">Edit</button>
                <button class="btn-outline" style="padding:6px 12px; font-size:12px; color:#ef4444; border-color:#fca5a5;" onclick="event.stopPropagation(); window.deleteAsset('${pub.id}')">Delete</button>
                <button class="btn-primary" style="padding:6px 16px; font-size:12px; font-weight:600;" onclick="event.stopPropagation(); window.openSharePoint('${pub.id}')">View</button>
              </div>
            </div>
          </div>
        `;
        renderedCount++;
      });
    }
    if (relatedVideos.length > 0) {
      relatedVideos.filter(v => !docIds.has(v.id)).forEach(vid => {
        html += `
          <div class="doc-card" onclick="window.openSharePoint('${vid.id}')" style="cursor:pointer;" title="Click to view video in SharePoint">
            <div class="video-card-thumbnail" onclick="window.openSharePoint('${vid.id}')" style="cursor:pointer;">
              <div class="video-play-icon">▶</div>
              <span class="video-duration">${vid.duration}</span>
            </div>
            <div class="card-body" style="padding:16px;">
              <h3 style="font-size:13.5px; font-weight:700; margin-bottom:6px;">${vid.title}</h3>
              <div style="display:flex; justify-content:space-between; font-size:11px; color:var(--text-tertiary); margin-bottom:8px;">
                <span>Speaker: ${vid.speaker}</span>
                <span>Type: ${vid.type}</span>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; border-top:1px solid var(--border-color); padding-top:8px;">
                <button class="btn-outline" style="padding:4px 8px; font-size:11px;" onclick="event.stopPropagation(); window.openEditAssetModal('${vid.id}')">Edit</button>
                <button class="btn-outline" style="padding:4px 8px; font-size:11px; color:#ef4444; border-color:#fca5a5;" onclick="event.stopPropagation(); window.deleteAsset('${vid.id}')">Delete</button>
                <button class="btn-primary" style="padding:4px 12px; font-size:11px; font-weight:600;" onclick="event.stopPropagation(); window.openSharePoint('${vid.id}')">View</button>
              </div>
            </div>
          </div>
        `;
        renderedCount++;
      });
    }
    html += '</div>';
    if (renderedCount === 0) {
      container.innerHTML = emptyState('All Assets');
    } else {
      container.innerHTML = html;
    }
  } else if (tabName === 'about-product') {
    if (aboutProductDocs.length === 0) {
      container.innerHTML = emptyState('About Product');
    } else {
      container.innerHTML = `
        <div class="assets-grid">
          ${aboutProductDocs.map(d => renderDocumentCard(d)).join('')}
        </div>
      `;
    }
  } else if (tabName === 'evidence') {
    const totalCount = evidenceDocs.length + relatedCases.length + relatedReports.length;
    if (totalCount === 0) {
      container.innerHTML = emptyState('Evidence');
    } else {
      let html = '<div class="assets-grid">';
      if (evidenceDocs.length > 0) {
        html += evidenceDocs.map(d => renderDocumentCard(d)).join('');
      }
      const docIds = new Set(evidenceDocs.map(d => d.id));
      if (relatedCases.length > 0) {
        relatedCases.filter(c => !docIds.has(c.id)).forEach(c => {
          html += renderDocumentCard({
            id: c.id,
            title: c.title,
            description: c.summary,
            department: 'Medical',
            product: c.relatedProduct,
            contentType: 'Case Studies',
            cancerType: c.cancerType,
            biomarker: c.biomarker,
            status: 'Approved',
            version: 'v1.0',
            author: c.doctor || '1Cell.Ai',
            owner: c.doctor || '1Cell.Ai',
            sharePointUrl: c.readMoreUrl || c.oneDriveUrl
          });
        });
      }
      if (relatedReports.length > 0) {
        relatedReports.filter(r => !docIds.has(r.id)).forEach(r => {
          html += renderDocumentCard({
            id: r.id,
            title: r.title,
            description: r.summary,
            department: 'Medical',
            product: r.product,
            contentType: 'Sample Report',
            cancerType: r.cancerType,
            biomarker: r.biomarker,
            status: r.status || 'Approved',
            version: r.version || 'v1.0',
            author: r.author || '1Cell.Ai',
            owner: r.owner || '1Cell.Ai',
            sharePointUrl: r.sharePointUrl
          });
        });
      }
      html += '</div>';
      container.innerHTML = html;
    }
  } else if (tabName === 'scientific') {
    const totalCount = scientificDocs.length + relatedPubs.length;
    if (totalCount === 0) {
      container.innerHTML = emptyState('Scientific');
    } else {
      let html = '<div class="assets-grid">';
      if (scientificDocs.length > 0) {
        html += scientificDocs.map(d => renderDocumentCard(d)).join('');
      }
      if (relatedPubs.length > 0) {
        html += relatedPubs.map(pub => `
          <div class="pub-item" style="grid-column: 1 / -1; cursor:pointer;" onclick="window.openSharePoint('${pub.id}')" title="Click to view publication in SharePoint">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:8px;">
              <div class="pub-journal">${pub.journal} (${pub.publishedDate})</div>
              <div style="display:flex; gap:6px; flex-wrap:wrap; align-items:center;">
                <span class="badge badge-prod">${(db.products.find(p => p.id === pub.relatedProduct) || {}).name || '1Cell.Ai'}</span>
              </div>
            </div>
            <h3 style="font-size:17px; font-weight:700; margin-bottom:8px;">${pub.title}</h3>
            <div class="pub-authors">${pub.authors}</div>
            <div class="pub-abstract-box"><strong>Abstract:</strong> ${pub.abstract}</div>
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
              <div class="pub-citation"><strong>Citation:</strong> ${pub.citation}</div>
              <div style="display:flex; gap:8px;">
                <button class="btn-outline" style="padding:6px 12px; font-size:12px;" onclick="event.stopPropagation(); window.openEditAssetModal('${pub.id}')">Edit</button>
                <button class="btn-outline" style="padding:6px 12px; font-size:12px; color:#ef4444; border-color:#fca5a5;" onclick="event.stopPropagation(); window.deleteAsset('${pub.id}')">Delete</button>
                <button class="btn-primary" style="padding:6px 16px; font-size:12px; font-weight:600;" onclick="event.stopPropagation(); window.openSharePoint('${pub.id}')">View</button>
              </div>
            </div>
          </div>
        `).join('');
      }
      html += '</div>';
      container.innerHTML = html;
    }
  } else if (tabName === 'training-sales') {
    const totalCount = trainingSalesDocs.length + relatedVideos.length;
    if (totalCount === 0) {
      container.innerHTML = emptyState('Training & Sales Enablement');
    } else {
      let html = '<div class="assets-grid">';
      if (trainingSalesDocs.length > 0) {
        html += trainingSalesDocs.map(d => renderDocumentCard(d)).join('');
      }
      if (relatedVideos.length > 0) {
        html += relatedVideos.map(vid => `
          <div class="doc-card" onclick="window.openSharePoint('${vid.id}')" style="cursor:pointer;" title="Click to view video in SharePoint">
            <div class="video-card-thumbnail" onclick="window.openSharePoint('${vid.id}')" style="cursor:pointer;">
              <div class="video-play-icon">▶</div>
              <span class="video-duration">${vid.duration}</span>
            </div>
            <div class="card-body" style="padding:16px;">
              <h3 style="font-size:13.5px; font-weight:700; margin-bottom:6px;">${vid.title}</h3>
              <div style="display:flex; justify-content:space-between; font-size:11px; color:var(--text-tertiary); margin-bottom:8px;">
                <span>Speaker: ${vid.speaker}</span>
                <span>Type: ${vid.type}</span>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; border-top:1px solid var(--border-color); padding-top:8px;">
                <button class="btn-outline" style="padding:4px 8px; font-size:11px;" onclick="event.stopPropagation(); window.openEditAssetModal('${vid.id}')">Edit</button>
                <button class="btn-outline" style="padding:4px 8px; font-size:11px; color:#ef4444; border-color:#fca5a5;" onclick="event.stopPropagation(); window.deleteAsset('${vid.id}')">Delete</button>
                <button class="btn-primary" style="padding:4px 12px; font-size:11px; font-weight:600;" onclick="event.stopPropagation(); window.openSharePoint('${vid.id}')">View</button>
              </div>
            </div>
          </div>
        `).join('');
      }
      html += '</div>';
      container.innerHTML = html;
    }
  } else if (tabName === 'other') {
    if (otherDocs.length === 0) {
      container.innerHTML = emptyState('Other');
    } else {
      container.innerHTML = `
        <div class="assets-grid">
          ${otherDocs.map(d => renderDocumentCard(d)).join('')}
        </div>
      `;
    }
  }
}

// Switch category tabs inside Product Workspace
window.switchProductTab = function(event, prodId, tabName) {
  currentMicrositeId = prodId;
  currentMicrositeTab = tabName;

  const tabs = document.querySelectorAll('.product-tab-btn');
  tabs.forEach(t => t.classList.remove('active'));
  if (event && event.currentTarget) {
    event.currentTarget.classList.add('active');
  } else if (event && event.target) {
    event.target.classList.add('active');
  } else {
    const matchBtn = document.querySelector(`.product-tab-btn[data-tab="${tabName}"]`);
    if (matchBtn) matchBtn.classList.add('active');
  }

  renderProductTabContent(prodId, tabName);
};

// Trigger Register Asset Modal pre-configured for a product and category tab
window.triggerRegisterProductAsset = function(prodId, categoryTab) {
  const uploadForm = document.getElementById('uploadForm');
  if (uploadForm) uploadForm.reset();

  const product = db.products.find(p => p.id === prodId);
  const currentTab = categoryTab || currentMicrositeTab || 'all';

  // Set Product
  const formProduct = document.getElementById('formProduct');
  if (formProduct && prodId) {
    formProduct.value = prodId;
  }

  // Set Category / ContentType based on active tab
  const formContentType = document.getElementById('formContentType');
  if (formContentType) {
    if (currentTab === 'about-product') formContentType.value = 'About Product';
    else if (currentTab === 'evidence') formContentType.value = 'Evidence';
    else if (currentTab === 'scientific') formContentType.value = 'Scientific';
    else if (currentTab === 'training-sales') formContentType.value = 'Training & Sales Enablement';
    else if (currentTab === 'other') formContentType.value = 'Other';
    else formContentType.value = 'About Product';
  }

  // Set category dropdown
  const formCategory = document.getElementById('formCategory');
  if (formCategory) {
    formCategory.value = 'product-hub';
  }

  // Set prefilled folder URL
  const formSpUrl = document.getElementById('formSpUrl');
  if (formSpUrl && product) {
    const prodFolder = product.name.replace(/[^a-zA-Z0-9]/g, '');
    formSpUrl.value = `https://ocdipl.sharepoint.com/sites/1Cell.AiMarketingSite/Shared%20Documents/${prodFolder}/`;
  }

  // Ensure default Cancer Type is None, Biomarker is None, and Owner is 1Cell.Ai
  const formCancer = document.getElementById('formCancer');
  if (formCancer) {
    formCancer.value = 'None';
  }
  const formBiomarker = document.getElementById('formBiomarker');
  if (formBiomarker) {
    formBiomarker.value = 'None';
  }
  const formAuthor = document.getElementById('formAuthor');
  if (formAuthor) {
    formAuthor.value = '1Cell.Ai';
  }

  const uploadModal = document.getElementById('uploadModal');
  if (uploadModal) openModal(uploadModal);
};

// 4. Case Library Route
function renderCaseLibrary() {
  workspaceViewport.innerHTML = `
${window.renderCategoryHeader('Clinical Case Library', 'Search real-world medical responses and genomics validation summaries.', 'case-library')}
    
    <div class="assets-grid">
      ${db.cases.map(c => `
        <div class="doc-card" onclick="window.openSharePoint('${c.id}')" style="cursor:pointer;" title="Click to view case in SharePoint">
          <div class="case-card-header">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px; margin-bottom:8px;">
              <div style="display:flex; gap:6px; flex-wrap:wrap; align-items:center;">
                <span class="badge badge-prod">${(db.products.find(p => p.id === c.relatedProduct) || {}).name || '1Cell.Ai'}</span>
                ${c.biomarker ? `<span class="badge badge-biomarker">${c.biomarker}</span>` : ''}
              </div>
            </div>
            <h3 style="font-size:16px; font-weight:700; margin-top:4px;">${c.title}</h3>
            <div class="case-hospital">${c.doctor} • ${c.hospital}</div>
          </div>
          <div class="card-body" style="padding-top:16px;">
            <div class="case-details-summary">${c.summary}</div>
            <div style="margin-bottom:14px;">
              <span style="font-size:10px; color:var(--text-tertiary); text-transform:uppercase;">Cancer Type</span>
              <div style="font-size:12px; font-weight:600; margin-top:2px;">${c.cancerType}</div>
            </div>
          </div>
          <div class="card-actions-bar">
            <button class="btn-outline" style="padding:6px 12px; font-size:11px;" onclick="event.stopPropagation(); window.openEditAssetModal('${c.id}')">Edit Link</button>
            <button class="btn-outline" style="padding:6px 12px; font-size:11px;" onclick="event.stopPropagation(); const matchedDoc = db.documents.find(d => d.title.toLowerCase().includes('${c.title}'.toLowerCase().substring(0, 15))); window.previewDocument(matchedDoc ? matchedDoc.id : (db.documents[0] ? db.documents[0].id : 'doc-041'))">Preview Metadata</button>
            <button class="btn-primary" style="padding:6px 16px; font-size:11px; font-weight:600;" onclick="event.stopPropagation(); window.openSharePoint('${c.id}')">View</button>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// 4.1. Report Library Route (1Cell.Ai Clinical Sample Reports)
let reportLibraryProductFilter = 'all';
let reportLibraryCancerFilter = 'all';
let reportLibrarySearchQuery = '';

window.setReportFilter = function(filterType, value) {
  if (filterType === 'product') reportLibraryProductFilter = value;
  if (filterType === 'cancer') reportLibraryCancerFilter = value;
  window.updateReportLibraryCards();
};

window.searchReports = function(query) {
  reportLibrarySearchQuery = (query || '').toLowerCase().trim();
  window.updateReportLibraryCards();
};

window.updateReportLibraryCards = function() {
  const container = document.getElementById('reportsGridContainer');
  const countEl = document.getElementById('reportsCountBadge');
  if (!container) return;

  const allReports = db.reports || [];
  const filtered = allReports.filter(r => {
    if (reportLibraryProductFilter !== 'all' && r.product !== reportLibraryProductFilter) return false;
    if (reportLibraryCancerFilter !== 'all') {
      if (!r.cancerType) return false;
      const rc = r.cancerType.toLowerCase();
      const fc = reportLibraryCancerFilter.toLowerCase();
      if (rc !== fc && !rc.includes(fc.replace(' cancer', '')) && !fc.includes(rc.replace(' cancer', ''))) return false;
    }
    if (reportLibrarySearchQuery) {
      const q = reportLibrarySearchQuery;
      const matchTitle = (r.title || '').toLowerCase().includes(q);
      const matchBiomarker = (r.biomarker || '').toLowerCase().includes(q);
      const matchCancer = (r.cancerType || '').toLowerCase().includes(q);
      const matchSummary = (r.summary || '').toLowerCase().includes(q);
      const prodObj = db.products.find(p => p.id === r.product);
      const matchProd = prodObj && prodObj.name.toLowerCase().includes(q);
      if (!matchTitle && !matchBiomarker && !matchCancer && !matchSummary && !matchProd) return false;
    }
    return true;
  });

  if (countEl) countEl.innerText = `${filtered.length} Reports Found`;

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align:center; padding: 48px 24px; background:var(--bg-secondary); border-radius:var(--radius-lg); border:1px dashed var(--border-color);">
        <div style="font-size:36px; margin-bottom:12px;">📋</div>
        <h3 style="font-size:16px; font-weight:700; margin-bottom:6px;">No Sample Reports Matched</h3>
        <p style="font-size:13px; color:var(--text-secondary); max-width:450px; margin:0 auto 16px;">No sample reports match your search criteria. You can clear filters or register a new clinical report.</p>
        <div style="display:flex; justify-content:center; gap:10px;">
          <button class="btn-outline" onclick="window.setReportFilter('product', 'all'); window.setReportFilter('cancer', 'all'); document.getElementById('reportSearchInput').value=''; window.searchReports('');">Clear Filters</button>
          <button class="btn-primary" onclick="window.triggerAddSampleReportModal('${reportLibraryProductFilter !== 'all' ? reportLibraryProductFilter : 'oncoindx'}', '${reportLibraryCancerFilter !== 'all' ? reportLibraryCancerFilter : 'None'}')">+ Add Sample Report</button>
        </div>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(r => {
    const prod = db.products.find(p => p.id === r.product);
    const prodName = prod ? prod.name : (r.product ? r.product.toUpperCase() : 'General');
    return `
      <div class="doc-card animate-fade-in" onclick="window.openSharePoint('${r.id}')" style="display:flex; flex-direction:column; justify-content:space-between; position:relative; cursor:pointer;" title="Click to view report in SharePoint">
        <div>
          <div class="case-card-header" style="display:flex; flex-direction:column; gap:6px;">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px;">
              <div style="display:flex; gap:6px; flex-wrap:wrap; align-items:center;">
                <span class="badge badge-prod">${prodName}</span>
                ${r.cancerType ? `<span class="badge" style="background-color:rgba(14,165,233,0.12); color:#0284c7; font-weight:600;">${r.cancerType}</span>` : ''}
              </div>
            </div>
            <h3 style="font-size:15.5px; font-weight:700; margin-top:8px; line-height:1.4; color:var(--text-primary); cursor:pointer;" onclick="window.openSharePoint('${r.id}')" title="Click to open report in SharePoint">${r.title}</h3>
          </div>
          
          <div class="card-body" style="padding-top:12px;">
            <div style="background-color:var(--bg-tertiary); border-radius:var(--radius-sm); padding:10px 12px; margin-bottom:12px; font-size:11.5px; border-left:3px solid var(--accent-color);">
              <div style="margin-bottom:4px;"><strong style="color:var(--text-secondary);">Target / Biomarker:</strong> <span style="font-weight:600; color:var(--text-primary);">${r.biomarker || 'Comprehensive Solid Tumor Profile'}</span></div>
              <div><strong style="color:var(--text-secondary);">Specimen:</strong> <span style="font-weight:500; color:var(--text-primary);">${r.specimen || 'FFPE Tumor Tissue'}</span></div>
            </div>

            <div class="case-details-summary" style="font-size:12.5px; line-height:1.5; color:var(--text-secondary); margin-bottom:12px;">
              ${r.summary || r.description || ''}
            </div>

            <div style="display:flex; justify-content:space-between; align-items:center; font-size:11px; color:var(--text-tertiary); padding-top:8px; border-top:1px solid var(--border-color); flex-wrap:wrap; gap:4px;">
              <span>Updated: <strong style="color:var(--text-secondary);">${r.updatedDate || r.createdDate || '2026'}</strong></span>
            </div>
          </div>
        </div>

        <div class="card-actions-bar" style="margin-top:14px; padding-top:12px; border-top:1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center; gap:6px;">
          <div style="display:flex; gap:6px;">
            <button class="btn-outline" style="padding:6px 10px; font-size:11px;" onclick="event.stopPropagation(); window.openEditAssetModal('${r.id}')" title="Edit SharePoint link or report metadata">
              Edit Link
            </button>
            <button class="btn-outline" style="padding:6px 10px; font-size:11px;" onclick="event.stopPropagation(); window.previewDocument('${r.id}')" title="Preview metadata">
              Preview
            </button>
            <button class="btn-outline" style="padding:6px 8px; font-size:11px; color:#ef4444; border-color:rgba(239,68,68,0.3);" onclick="event.stopPropagation(); window.deleteAsset('${r.id}')" title="Delete report">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:13px; height:13px;">
                <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
            </button>
          </div>
          <button class="btn-primary" style="padding:6px 16px; font-size:11px; font-weight:600; display:inline-flex; align-items:center; gap:6px;" onclick="event.stopPropagation(); window.openSharePoint('${r.id}')" title="View in SharePoint">
            <span>View</span>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" style="width:12px;height:12px;">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
            </svg>
          </button>
        </div>
      </div>
    `;
  }).join('');
};

function renderReportLibrary() {
  const allReports = db.reports || [];
  
  workspaceViewport.innerHTML = `
    <div class="welcome-banner" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
      <div>
        <h1 class="welcome-title">Clinical Sample Report Library</h1>
        <p class="welcome-subtitle">Search, view, and manage official 1Cell.Ai clinical NGS & liquid biopsy sample reports with verified SharePoint links.</p>
      </div>
      <div class="welcome-banner-actions">
        <button class="btn-primary" onclick="window.triggerAddSampleReportModal()" style="display:inline-flex; align-items:center; gap:8px;">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" style="width:16px;height:16px;">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          <span>+ Add Sample Report</span>
        </button>
      </div>
    </div>

    <!-- Filter & Search Controls Bar -->
    <div style="background-color:var(--bg-secondary); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:14px 18px; margin-bottom:20px; display:flex; flex-wrap:wrap; gap:14px; justify-content:space-between; align-items:center;">
      <div style="display:flex; flex-wrap:wrap; gap:12px; align-items:center; flex:1; min-width:280px;">
        <div style="position:relative; min-width:240px; flex:1;">
          <input type="text" id="reportSearchInput" placeholder="Search reports by biomarker, title, or cancer type..." style="width:100%; height:36px; border:1px solid var(--border-color); border-radius:var(--radius-sm); padding:0 12px 0 32px; font-size:12.5px; background:var(--bg-primary); color:var(--text-primary);" oninput="window.searchReports(this.value)">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:14px; height:14px; position:absolute; left:10px; top:11px; color:var(--text-tertiary);">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
        </div>

        <div style="display:flex; align-items:center; gap:6px;">
          <label style="font-size:11.5px; font-weight:600; color:var(--text-secondary); white-space:nowrap;">Product:</label>
          <select id="reportProductFilter" style="height:36px; border:1px solid var(--border-color); border-radius:var(--radius-sm); padding:0 8px; font-size:12px; background:var(--bg-primary); color:var(--text-primary);" onchange="window.setReportFilter('product', this.value)">
            <option value="all">All Products</option>
            ${db.products.map(p => `<option value="${p.id}" ${reportLibraryProductFilter === p.id ? 'selected' : ''}>${p.name}</option>`).join('')}
          </select>
        </div>

        <div style="display:flex; align-items:center; gap:6px;">
          <label style="font-size:11.5px; font-weight:600; color:var(--text-secondary); white-space:nowrap;">Cancer Type:</label>
          <select id="reportCancerFilter" style="height:36px; border:1px solid var(--border-color); border-radius:var(--radius-sm); padding:0 8px; font-size:12px; background:var(--bg-primary); color:var(--text-primary);" onchange="window.setReportFilter('cancer', this.value)">
            <option value="all">All Cancer Types</option>
            <option value="None" ${reportLibraryCancerFilter === 'None' ? 'selected' : ''}>None</option>
            <option value="Colorectal Cancer" ${reportLibraryCancerFilter === 'Colorectal Cancer' ? 'selected' : ''}>Colorectal Cancer</option>
            <option value="Lung Cancer" ${reportLibraryCancerFilter === 'Lung Cancer' ? 'selected' : ''}>Lung Cancer</option>
            <option value="Non specific Cancer" ${reportLibraryCancerFilter === 'Non specific Cancer' ? 'selected' : ''}>Non specific Cancer</option>
            <option value="Breast Cancer" ${reportLibraryCancerFilter === 'Breast Cancer' ? 'selected' : ''}>Breast Cancer</option>
            <option value="Pancreas Cancer" ${reportLibraryCancerFilter === 'Pancreas Cancer' ? 'selected' : ''}>Pancreas Cancer</option>
            <option value="Head & Neck Cancer" ${reportLibraryCancerFilter === 'Head & Neck Cancer' ? 'selected' : ''}>Head & Neck Cancer</option>
            <option value="Liver Cancer" ${reportLibraryCancerFilter === 'Liver Cancer' ? 'selected' : ''}>Liver Cancer</option>
            <option value="Ovary Cancer" ${reportLibraryCancerFilter === 'Ovary Cancer' ? 'selected' : ''}>Ovary Cancer</option>
            <option value="Stomach Cancer" ${reportLibraryCancerFilter === 'Stomach Cancer' ? 'selected' : ''}>Stomach Cancer</option>
            <option value="Hepatobiliary Cancer" ${reportLibraryCancerFilter === 'Hepatobiliary Cancer' ? 'selected' : ''}>Hepatobiliary Cancer</option>
            <option value="Endometrial Cancer" ${reportLibraryCancerFilter === 'Endometrial Cancer' ? 'selected' : ''}>Endometrial Cancer</option>
            <option value="Gall Bladder Cancer" ${reportLibraryCancerFilter === 'Gall Bladder Cancer' ? 'selected' : ''}>Gall Bladder Cancer</option>
            <option value="Prostate Cancer" ${reportLibraryCancerFilter === 'Prostate Cancer' ? 'selected' : ''}>Prostate Cancer</option>
            <option value="Urothelial Cancer" ${reportLibraryCancerFilter === 'Urothelial Cancer' ? 'selected' : ''}>Urothelial Cancer</option>
            <option value="Melanoma Cancer" ${reportLibraryCancerFilter === 'Melanoma Cancer' ? 'selected' : ''}>Melanoma Cancer</option>
            <option value="Gastrointestinal Cancer" ${reportLibraryCancerFilter === 'Gastrointestinal Cancer' ? 'selected' : ''}>Gastrointestinal Cancer</option>
            <option value="Oral Cancer" ${reportLibraryCancerFilter === 'Oral Cancer' ? 'selected' : ''}>Oral Cancer</option>
            <option value="Renal Cancer" ${reportLibraryCancerFilter === 'Renal Cancer' ? 'selected' : ''}>Renal Cancer</option>
          </select>
        </div>
      </div>

      <div id="reportsCountBadge" style="font-size:12px; font-weight:600; color:var(--text-secondary); background:var(--bg-tertiary); padding:6px 12px; border-radius:20px;">
        ${allReports.length} Reports
      </div>
    </div>

    <!-- Reports Grid Container -->
    <div class="assets-grid" id="reportsGridContainer"></div>
  `;

  window.updateReportLibraryCards();
}

// Function to trigger Add Sample Report Modal
window.triggerAddSampleReportModal = function(defaultProduct, defaultCancer) {
  const form = document.getElementById('sampleReportForm');
  if (form) form.reset();
  
  if (defaultProduct) {
    const prodEl = document.getElementById('srProduct');
    if (prodEl) prodEl.value = defaultProduct;
  }
  const cancerEl = document.getElementById('srCancerType');
  if (cancerEl) {
    cancerEl.value = defaultCancer || 'None';
  }

  const bioEl = document.getElementById('srBiomarker');
  if (bioEl) {
    bioEl.value = 'None';
  }

  const authorEl = document.getElementById('srAuthor');
  if (authorEl) {
    authorEl.value = '1Cell.Ai';
  }

  const modal = document.getElementById('sampleReportModal');
  if (modal) openModal(modal);
};

// Function to save new Sample Report
window.saveNewSampleReport = function() {
  const title = document.getElementById('srTitle').value.trim();
  const product = document.getElementById('srProduct').value;
  const cancerType = document.getElementById('srCancerType').value || 'None';
  let sharePointUrl = document.getElementById('srSharePointUrl').value.trim();
  const biomarker = (document.getElementById('srBiomarker').value || 'None').trim();
  const specimen = document.getElementById('srSpecimen').value;
  const authorEl = document.getElementById('srAuthor');
  const author = (authorEl ? authorEl.value.trim() : '') || '1Cell.Ai';
  const version = document.getElementById('srVersion').value.trim() || 'v1.0';
  const status = document.getElementById('srStatus').value;
  const summary = document.getElementById('srSummary').value.trim();

  if (!title || !sharePointUrl) {
    showToast("Report Title and SharePoint Document URL are required!");
    return;
  }

  if (!/^https?:\/\//i.test(sharePointUrl)) {
    sharePointUrl = 'https://' + sharePointUrl;
  }

  const newReport = {
    id: `report-${Date.now()}`,
    title,
    product,
    cancerType,
    biomarker: biomarker || 'None',
    specimen: specimen || 'FFPE Tumor Tissue',
    status,
    version,
    createdDate: new Date().toISOString().split('T')[0],
    updatedDate: new Date().toISOString().split('T')[0],
    author: author,
    owner: author,
    department: 'Medical',
    summary: summary || `Clinical diagnostic test report for ${cancerType} using ${product}.`,
    sharePointUrl,
    folderPath: `Shared Documents/Report Library/${cancerType}`,
    size: '3.0 MB',
    viewCount: 1
  };

  if (!db.reports) db.reports = [];
  db.reports.unshift(newReport);

  try {
    localStorage.setItem('1cell_custom_reports', JSON.stringify(db.reports));
  } catch (e) {
    console.warn('LocalStorage save failed:', e);
  }

  const modal = document.getElementById('sampleReportModal');
  if (modal) closeModal(modal);

  showToast(`Successfully registered sample report: "${title}"`);
  
  // Re-render report library view
  renderReportLibrary();
};


// 5. Publications Route
function renderPublications() {
  workspaceViewport.innerHTML = `
${window.renderCategoryHeader('Peer-Reviewed Publications', 'A library of clinical validity studies, poster presentations, and journal abstracts.', 'publications')}
    
    <div>
      ${db.publications.map(pub => `
        <div class="pub-item" onclick="window.openSharePoint('${pub.id}')" style="cursor:pointer;" title="Click to view publication in SharePoint">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:8px;">
            <div class="pub-journal">${pub.journal} • Published ${pub.publishedDate}</div>
            <div style="display:flex; gap:6px; flex-wrap:wrap; align-items:center;">
              <span class="badge badge-prod">${(db.products.find(p => p.id === pub.relatedProduct) || {}).name || '1Cell.Ai'}</span>
            </div>
          </div>
          <h3 style="font-size:18px; font-weight:700; margin-bottom:8px;">${pub.title}</h3>
          <div class="pub-authors">${pub.authors}</div>
          <div class="pub-abstract-box"><strong>Abstract:</strong> ${pub.abstract}</div>
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap: 12px;">
            <div class="pub-citation"><strong>Citation:</strong> ${pub.citation}</div>
            <div style="display:flex; gap:8px;">
              <button class="btn-outline" style="padding:8px 14px; font-size:12px;" onclick="event.stopPropagation(); window.openEditAssetModal('${pub.id}')">Edit Link</button>
              <button class="btn-outline" style="padding:8px 16px; font-size:12px;" onclick="event.stopPropagation(); const matchedDoc = db.documents.find(d => d.title.toLowerCase().includes('${pub.title}'.toLowerCase().substring(0, 15))); window.previewDocument(matchedDoc ? matchedDoc.id : (db.documents[0] ? db.documents[0].id : 'doc-041'))">Preview Metadata</button>
              <button class="btn-primary" style="padding:8px 16px; font-size:12px; font-weight:600; display:inline-flex; align-items:center; gap:6px;" onclick="event.stopPropagation(); window.openSharePoint('${pub.id}')">
                <span>View</span>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" style="width:12px;height:12px;">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
              </button>
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
  const assets = db.documents.filter(d => d.department === "Sales Enablement" || d.category === "sales-enablement");
  workspaceViewport.innerHTML = `
${window.renderCategoryHeader('Sales Enablement Portal', 'Obtain sales guidelines, pitch training presentations, and competitor battlecards for the 1Cell.Ai ASM team.', 'sales-enablement')}
    
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
${window.renderCategoryHeader('1Cell.Ai Digital Video Library', 'Browse doctor interviews, webinars, and genomics sequencing demo clips.', 'videos')}
    
    <div class="assets-grid">
      ${db.videos.map(vid => {
        const productObj = db.products.find(p => p.id === vid.product);
        const productName = productObj ? productObj.name : 'Corporate';
        return `
        <div class="doc-card" onclick="window.openSharePoint('${vid.id}')" style="cursor:pointer;" title="Click to view video in SharePoint">
          <div class="video-card-thumbnail">
            <div class="video-play-icon">▶</div>
            <span class="video-duration">${vid.duration}</span>
          </div>
          <div class="card-body" style="padding:16px;">
            <span class="badge badge-prod" style="align-self: flex-start; margin-bottom:8px;">${productName}</span>
            <h3 style="font-size:14px; font-weight:700; margin-bottom:6px;">${vid.title}</h3>
            <div style="display:flex; justify-content:space-between; font-size:11.5px; color:var(--text-tertiary); margin-top:auto; margin-bottom:8px;">
              <span>Speaker: ${vid.speaker}</span>
              <span>Type: ${vid.type}</span>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-top:8px; border-top:1px solid var(--border-color); padding-top:8px;">
              <button class="btn-outline" style="padding:4px 10px; font-size:11px;" onclick="event.stopPropagation(); window.openEditAssetModal('${vid.id}')">Edit Link</button>
              <button class="btn-primary" style="padding:4px 10px; font-size:11px;" onclick="event.stopPropagation(); window.openSharePoint('${vid.id}')">View</button>
            </div>
          </div>
        </div>
        `;
      }).join('')}
    </div>
  `;
}

// 8. Speaker Profiles Route
function renderSpeakerProfiles() {
  workspaceViewport.innerHTML = `
${window.renderCategoryHeader('Speaker Profiles & Medical Experts', 'Academic profiles and content assets linked to clinical key opinion leaders.', 'speakers')}
    
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
                ${spk.publications ? spk.publications.map(p => {
                  const title = typeof p === 'object' ? p.title : p;
                  const doc = db.documents.find(d => d.title.toLowerCase().includes(title.toLowerCase().substring(0, 15))) || db.publications.find(d => d.title.toLowerCase().includes(title.toLowerCase().substring(0, 15)));
                  const docId = doc ? doc.id : (db.documents[0] ? db.documents[0].id : 'doc-041');
                  const link = typeof p === 'object' ? (p.link || p.sharePointUrl) : '';
                  if (link) {
                    return `<div class="relation-item"><span>📄</span> <span style="cursor:pointer;" onclick="window.open('${link}', '_blank')">${title}</span></div>`;
                  } else {
                    return `<div class="relation-item"><span>📄</span> <span style="cursor:pointer;" onclick="window.previewDocument('${docId}')">${title}</span></div>`;
                  }
                }).join('') : ''}
                ${spk.presentations ? spk.presentations.map(p => {
                  const title = typeof p === 'object' ? p.title : p;
                  const doc = db.documents.find(d => d.title.toLowerCase().includes(title.toLowerCase().substring(0, 15))) || db.publications.find(d => d.title.toLowerCase().includes(title.toLowerCase().substring(0, 15)));
                  const docId = doc ? doc.id : (db.documents[0] ? db.documents[0].id : 'doc-041');
                  const link = typeof p === 'object' ? (p.link || p.sharePointUrl) : '';
                  if (link) {
                    return `<div class="relation-item"><span>📊</span> <span style="cursor:pointer;" onclick="window.open('${link}', '_blank')">${title}</span></div>`;
                  } else {
                    return `<div class="relation-item"><span>📊</span> <span style="cursor:pointer;" onclick="window.previewDocument('${docId}')">${title}</span></div>`;
                  }
                }).join('') : ''}
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
${window.renderCategoryHeader('Corporate Brand Assets & Guidelines', 'Core logos, fonts, templates, and corporate identities managed for external branding.', 'brand-assets')}
    
    <div class="assets-grid">
      ${db.brandAssets.map(asset => `
        <div class="doc-card" onclick="window.openSharePoint('${asset.id}')" style="cursor:pointer;" title="Click to view brand asset in SharePoint">
          <div class="card-header-bar">
            <div class="card-type-icon" style="overflow:hidden; display:flex; align-items:center; justify-content:center; background:#ffffff; border:1px solid rgba(0,0,0,0.06); padding:3px; border-radius:6px; width:44px; height:44px;">
              ${asset.category === 'Logos' && asset.downloadUrl && asset.downloadUrl.endsWith('.png') ? `<img src="${asset.downloadUrl}" alt="${asset.title}" style="max-height:28px; max-width:40px; object-fit:contain;" onerror="this.onerror=null;this.parentElement.innerHTML='🎨';" />` : '🎨'}
            </div>
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
          <div class="card-actions-bar" style="justify-content: space-between;">
            <button class="btn-primary" style="padding:6px 14px; font-size:11px; font-weight:600;" onclick="event.stopPropagation(); window.openSharePoint('${asset.id}')">View</button>
            <button class="btn-primary" style="padding:6px 12px; font-size:11px;" onclick="event.stopPropagation(); window.triggerDownload('${asset.title}')">Download Asset</button>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// Newsletters Route
function renderNewsletters() {
  workspaceViewport.innerHTML = `
${window.renderCategoryHeader('1Cell.Ai Corporate Newsletters', 'Browse monthly announcements, scientific highlights, and sales cycle briefs.', 'newsletters')}
    
    <div class="assets-grid">
      ${db.newsletters.map(news => renderDocumentCard(news)).join('')}
    </div>
  `;
}

// 10. Templates Route
function renderTemplates() {
  workspaceViewport.innerHTML = `
${window.renderCategoryHeader('Document Templates & Outlines', 'Pre-approved layouts for presentations, cases, publications, and creatives.', 'templates')}
    
    <div class="assets-grid">
      ${db.templates.map(temp => `
        <div class="doc-card" onclick="window.openSharePoint('${temp.id}')" style="cursor:pointer;" title="Click to view template in SharePoint">
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
          <div class="card-actions-bar" style="justify-content: space-between;">
            <button class="btn-primary" style="padding:6px 14px; font-size:11px; font-weight:600;" onclick="event.stopPropagation(); window.openSharePoint('${temp.id}')">View</button>
            <button class="btn-primary" style="padding:6px 12px; font-size:11px;" onclick="event.stopPropagation(); window.triggerDownload('${temp.title}')">Download Template</button>
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

        <!-- Filter Category -->
        <div class="filter-group">
          <span class="filter-group-label">Category</span>
          <div class="filter-options-list">
            ${['About Product', 'Evidence', 'Scientific', 'Training & Sales Enablement', 'Other'].map(t => `
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
            ${['Colorectal Cancer', 'Lung Cancer', 'Non specific Cancer', 'Breast Cancer', 'Pancreas Cancer', 'Head & Neck Cancer', 'Liver Cancer', 'Ovary Cancer', 'Stomach Cancer', 'Hepatobiliary Cancer', 'Endometrial Cancer', 'Gall Bladder Cancer', 'Prostate Cancer', 'Urothelial Cancer', 'Melanoma Cancer', 'Gastrointestinal Cancer', 'Oral Cancer', 'Renal Cancer'].map(c => `
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
            ${['CTC', 'ctDNA', 'EGFR', 'ERBB2', 'TP53', 'cDNA', 'PTEN', 'PIK3CA', 'PDLI', 'HRD', 'BRCA1/2', 'HRRI', 'MSI', 'MMR', 'MSH2', 'Lynch Syndrome', 'PGx', 'KRAS', 'DPYD', 'TYMS', 'UGTIAT', 'TMB', 'BRAF', 'APC', 'DNA', 'NFT', 'STKTT', 'NOTCH1/2', 'PARP', 'ATM', 'ARIDIA/B', 'IDHTI', 'CCND1/2', 'PALB2', 'ESRI', 'HER2'].map(b => `
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

// Centralized function to gather all searchable files across system
function getAllSearchableFiles() {
  const docs = (db.documents || []).map(d => ({
    ...d,
    sourceType: 'document',
    displayType: d.contentType || 'Document',
    version: d.version || 'v1.0',
    updatedDate: d.updatedDate || '2026-09',
    owner: d.owner || '1Cell Commercial Team',
    status: d.status || 'Approved',
    description: d.description || ''
  }));
  const reports = (db.reports || []).map(r => ({
    ...r,
    sourceType: 'report',
    contentType: 'Sample Report',
    displayType: 'Sample Report',
    department: 'Medical',
    owner: r.author || 'Clinical Genomics Laboratory',
    version: r.version || 'v1.0',
    updatedDate: r.date || '2026-09',
    status: 'Approved',
    description: r.description || `${r.cancerType || ''} clinical sample report for ${r.product ? r.product.toUpperCase() : '1Cell.Ai'}`
  }));
  const cases = (db.cases || []).map(c => ({
    ...c,
    sourceType: 'case',
    contentType: 'Case Study',
    displayType: 'Case Study',
    product: c.relatedProduct,
    department: 'Medical',
    description: c.summary || '',
    owner: c.doctor || 'Clinical Specialist',
    version: 'v1.0',
    updatedDate: c.date || '2026-09',
    status: 'Approved'
  }));
  const pubs = (db.publications || []).map(p => ({
    ...p,
    sourceType: 'publication',
    contentType: 'Publication',
    displayType: 'Publication',
    product: p.relatedProduct,
    department: 'Scientific',
    description: p.abstract || '',
    owner: p.authors || 'Research Team',
    version: 'v1.0',
    updatedDate: p.year ? String(p.year) : '2026',
    status: 'Approved'
  }));
  const videos = (db.videos || []).map(v => ({
    ...v,
    sourceType: 'video',
    contentType: 'Video',
    displayType: 'Video',
    department: 'Marketing',
    owner: v.speaker || 'Marketing',
    version: 'HD Video',
    updatedDate: v.date || '2026-09',
    status: 'Approved',
    description: v.description || ''
  }));
  const newsletters = (db.newsletters || []).map(n => ({
    ...n,
    sourceType: 'newsletter',
    displayType: 'Newsletter',
    department: 'Corporate',
    version: 'Issue',
    updatedDate: n.date || '2026-09',
    status: 'Approved'
  }));
  return [...docs, ...reports, ...cases, ...pubs, ...videos, ...newsletters];
}
window.getAllSearchableFiles = getAllSearchableFiles;

// Robust matcher for query against file metadata and product tagging
function matchFileToQuery(file, qRaw, matchedProductIds) {
  if (!qRaw) return true;
  const qLower = qRaw.toLowerCase().trim();
  const qClean = qLower.replace(/[^a-z0-9]/g, '');

  // 1. Tagged with matching product
  const fileProd = (file.product || file.relatedProduct || '').toLowerCase().trim();
  if (fileProd) {
    if (matchedProductIds && matchedProductIds.includes(fileProd)) return true;
    if (fileProd.includes(qClean) || qClean.includes(fileProd)) return true;
    const pObj = db.products.find(p => p.id === fileProd);
    if (pObj) {
      const pNameLower = pObj.name.toLowerCase();
      const pNameClean = pNameLower.replace(/[^a-z0-9]/g, '');
      if (pNameLower.includes(qLower) || pNameClean.includes(qClean) || qClean.includes(pNameClean)) {
        return true;
      }
    }
  }

  // 2. Title matching
  const title = (file.title || '').toLowerCase();
  const titleClean = title.replace(/[^a-z0-9]/g, '');
  if (title.includes(qLower) || (qClean.length > 2 && titleClean.includes(qClean))) return true;

  // 3. Content Type / Category matching
  const ct = (file.contentType || file.displayType || '').toLowerCase();
  if (ct.includes(qLower)) return true;

  // 4. Cancer Type matching
  const cancer = (file.cancerType || '').toLowerCase();
  if (cancer.includes(qLower)) return true;

  // 5. Biomarker matching
  const biomarker = (file.biomarker || '').toLowerCase();
  if (biomarker.includes(qLower)) return true;

  // 6. Description / Summary matching
  const desc = (file.description || file.summary || file.abstract || '').toLowerCase();
  if (desc.includes(qLower)) return true;

  // 7. Department / Author matching
  const dept = (file.department || '').toLowerCase();
  if (dept.includes(qLower)) return true;
  const author = (file.author || file.doctor || file.authors || file.speaker || file.owner || '').toLowerCase();
  if (author.includes(qLower)) return true;

  return false;
}
window.matchFileToQuery = matchFileToQuery;

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
  const qRaw = activeSearchQuery.trim();
  const qLower = qRaw.toLowerCase();
  const qClean = qLower.replace(/[^a-z0-9]/g, '');

  // Identify matching products
  const matchedProductIds = db.products.filter(p => {
    const pClean = p.id.toLowerCase().replace(/[^a-z0-9]/g, '');
    const pNameClean = p.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    return pClean.includes(qClean) || pNameClean.includes(qClean) || p.name.toLowerCase().includes(qLower);
  }).map(p => p.id);

  const allAssets = getAllSearchableFiles();
  const filtered = allAssets.filter(doc => {
    // 1. Text / Product Query Matching
    if (qRaw) {
      if (!matchFileToQuery(doc, qRaw, matchedProductIds)) {
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
    // 4. Content Type / Category filter
    if (activeFilters.contentType.length > 0) {
      const docCat = getProductAssetCategory(doc);
      const cardLabel = getCardCategoryLabel(doc);
      const match = activeFilters.contentType.some(f => {
        if (f === 'About Product' && (docCat === 'about-product' || doc.contentType === 'Brochure' || doc.contentType === 'About Product' || doc.contentType === 'One Pager')) return true;
        if (f === 'Evidence' && (docCat === 'evidence' || doc.contentType === 'Case Studies' || doc.contentType === 'Case Study' || doc.contentType === 'Sample Report' || doc.contentType === 'Clinical Evidence')) return true;
        if (f === 'Scientific' && (docCat === 'scientific' || doc.contentType === 'WhitePaper' || doc.contentType === 'Whitepaper' || doc.contentType === 'Publication')) return true;
        if (f === 'Training & Sales Enablement' && (docCat === 'training-sales' || doc.contentType === 'Sales Enablement' || doc.contentType === 'Presentation' || doc.contentType === 'Sales Deck' || doc.contentType === 'Battlecard' || doc.contentType === 'Playbook' || doc.contentType === 'Video')) return true;
        if (f === 'Other' && docCat === 'other') return true;
        return doc.contentType === f || cardLabel === f;
      });
      if (!match) return false;
    }
    // 5. Cancer Type filter
    if (activeFilters.cancerType.length > 0) {
      if (!doc.cancerType) return false;
      const docC = doc.cancerType.toLowerCase();
      const match = activeFilters.cancerType.some(c => {
        const cLower = c.toLowerCase();
        return docC === cLower || 
               docC.includes(cLower.replace(' cancer', '')) || 
               cLower.includes(docC.replace(' cancer', ''));
      });
      if (!match) return false;
    }
    // 6. Biomarker filter
    if (activeFilters.biomarker.length > 0) {
      if (!doc.biomarker) return false;
      const docB = doc.biomarker.toLowerCase();
      const match = activeFilters.biomarker.some(b => {
        const bLower = b.toLowerCase();
        return docB === bLower || docB.includes(bLower) || bLower.includes(docB);
      });
      if (!match) return false;
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
      resultsGrid.innerHTML = filtered.map(doc => renderDocumentCard(doc)).join('');
    }
  }
};

// Global search auto suggestions engine
function handleSearchInput(e) {
  const qRaw = e.target.value.trim();
  const qLower = qRaw.toLowerCase();
  const qClean = qLower.replace(/[^a-z0-9]/g, '');

  if (!qRaw) {
    suggestionsDropdown.style.display = 'none';
    return;
  }

  // Identify matching products
  const matchedProducts = db.products.filter(p => {
    const pClean = p.id.toLowerCase().replace(/[^a-z0-9]/g, '');
    const pNameClean = p.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    return pClean.includes(qClean) || pNameClean.includes(qClean) || p.name.toLowerCase().includes(qLower) || (p.description && p.description.toLowerCase().includes(qLower));
  });
  const matchedProductIds = matchedProducts.map(p => p.id);

  // Search across all files in system
  const allFiles = getAllSearchableFiles();
  const matchedFiles = allFiles.filter(f => matchFileToQuery(f, qRaw, matchedProductIds));

  if (matchedFiles.length === 0 && matchedProducts.length === 0) {
    suggestionsDropdown.innerHTML = `
      <div style="padding: 16px 20px; font-size:12.5px; color:var(--text-tertiary); text-align:center;">
        <div>🔍 No files found matching "<strong>${qRaw}</strong>"</div>
        <div style="font-size:11px; margin-top:4px; opacity:0.8;">Press Enter to search the full hub.</div>
      </div>
    `;
    suggestionsDropdown.style.display = 'block';
    return;
  }

  let html = '';

  // 1. Matching Product Workspaces
  if (matchedProducts.length > 0) {
    html += `
      <div class="search-suggestion-section">
        <div class="suggestion-header">Product Workspaces (${matchedProducts.length})</div>
        ${matchedProducts.map(p => {
          const taggedCount = allFiles.filter(f => (f.product === p.id || f.relatedProduct === p.id)).length;
          return `
          <div class="suggestion-item" onclick="window.openProductMicrosite('${p.id}'); suggestionsDropdown.style.display='none';">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 21a3 3 0 003-3v-4.5a3 3 0 00-3-3h-1.5V9a3 3 0 00-3-3h-3V4.5a3 3 0 00-3-3H4.5a3 3 0 00-3 3V18a3 3 0 003 3h15z" />
            </svg>
            <div style="display:flex; flex-direction:column; gap:2px; flex:1;">
              <span class="suggestion-text" style="font-weight:700;">${p.name} Workspace</span>
              <span style="font-size:11px; color:var(--text-tertiary);">${taggedCount} files tagged under this product</span>
            </div>
            <span class="suggestion-badge" style="background-color:rgba(0,120,212,0.1); color:#0078d4; font-weight:600;">Open Workspace ↗</span>
          </div>
        `;}).join('')}
      </div>
    `;
  }

  // 2. Matching Files & Documents tagged with product or matching query
  if (matchedFiles.length > 0) {
    const isProdSearch = matchedProducts.length > 0;
    const headerTitle = isProdSearch 
      ? `Files Tagged with ${matchedProducts[0].name} (${matchedFiles.length} files)`
      : `Matching Files & Documents (${matchedFiles.length})`;

    html += `
      <div class="search-suggestion-section">
        <div class="suggestion-header" style="display:flex; justify-content:space-between; align-items:center;">
          <span>${headerTitle}</span>
          <span style="font-size:10px; text-transform:none; color:var(--text-tertiary);">Click file to open SharePoint</span>
        </div>
        ${matchedFiles.map(d => {
          const prodObj = d.product ? db.products.find(p => p.id === d.product) : null;
          const prodBadge = prodObj ? `<span class="badge badge-prod" style="font-size:9.5px; padding:1px 6px;">${prodObj.name}</span>` : '';
          const icon = d.contentType === 'Video' ? '🎥' : d.contentType === 'Sample Report' ? '📋' : d.contentType === 'Case Study' ? '🔬' : d.contentType === 'Presentation' ? '📊' : '📄';

          return `
            <div class="suggestion-item" onclick="window.openSharePoint('${d.id}'); suggestionsDropdown.style.display='none';" title="Click to view file in SharePoint Online">
              <span style="font-size:15px; flex-shrink:0;">${icon}</span>
              <div style="display:flex; flex-direction:column; gap:2px; flex:1; min-width:0;">
                <span class="suggestion-text" style="font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${d.title}</span>
                <div style="display:flex; gap:6px; align-items:center; font-size:11px; color:var(--text-tertiary);">
                  ${prodBadge}
                  <span>${d.displayType || d.contentType}</span>
                  ${d.cancerType ? `• <span>${d.cancerType}</span>` : ''}
                </div>
              </div>
              <span class="suggestion-badge" style="background:#0078d4; color:#ffffff; font-weight:600; display:inline-flex; align-items:center; gap:3px;">
                <span>View</span>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" style="width:10px;height:10px;">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
              </span>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  // Footer: View all in Search Hub
  html += `
    <div style="padding:10px 16px; background-color:var(--bg-tertiary); border-top:1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center; font-size:11.5px; cursor:pointer;" onclick="window.triggerSearchHub('${qRaw}'); suggestionsDropdown.style.display='none';">
      <span style="font-weight:600; color:var(--text-primary);">View all ${matchedFiles.length} files in Search Hub</span>
      <span style="color:var(--text-tertiary);">Press <strong>Enter ↵</strong></span>
    </div>
  `;

  suggestionsDropdown.innerHTML = html;
  suggestionsDropdown.style.display = 'block';
}
window.handleSearchInput = handleSearchInput;
// 14. Preview Document Modal logic
window.previewDocument = function(docId) {
  const doc = db.documents.find(d => d.id === docId) || db.newsletters.find(n => n.id === docId) || (db.reports || []).find(r => r.id === docId);
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
  if (doc.id && doc.id.startsWith('report-')) {
    previewContentDisplay.innerHTML = `
      <div class="mock-pdf-page">
        <div class="mock-pdf-header">
          <span class="mock-pdf-logo">1Cell.Ai Clinical Genomics Laboratory</span>
          <span style="font-size:9px; color:#0078d4; font-weight:700;">OFFICIAL CLINICAL SAMPLE REPORT</span>
        </div>
        <h2 class="mock-pdf-title" style="font-size:18px;">${doc.title}</h2>
        <div style="display:flex; justify-content:space-between; margin-bottom:14px; font-size:11px; background:var(--bg-tertiary); padding:8px 12px; border-radius:6px; flex-wrap:wrap; gap:6px;">
          <span><strong>Product:</strong> ${doc.product ? doc.product.toUpperCase() : '1Cell NGS'}</span>
          <span><strong>Cancer Type:</strong> ${doc.cancerType || 'Solid Tumor'}</span>
          <span><strong>Author:</strong> ${doc.author || doc.owner || 'Clinical Genomics Laboratory'}</span>
          <span><strong>Specimen:</strong> ${doc.specimen || 'FFPE Tissue'}</span>
        </div>
        
        <div class="mock-pdf-section-title">Genomic Findings & Target Biomarkers</div>
        <div style="font-size:12px; padding:10px 12px; background:rgba(0,120,212,0.08); border-left:3px solid #0078d4; border-radius:4px; margin-bottom:14px;">
          <strong>Target Result:</strong> ${doc.biomarker || 'Actionable Alteration Identified'}
        </div>

        <div class="mock-pdf-section-title">Clinical Diagnostic Summary</div>
        <p style="font-size:12px; line-height:1.6; margin-bottom:16px;">${doc.summary || doc.description}</p>

        <div style="margin-top:20px; text-align:center;">
          <button class="btn-primary" onclick="window.open('${doc.sharePointUrl}', '_blank')" style="padding:8px 20px;">
            Open Complete Report in SharePoint Online
          </button>
        </div>
      </div>
    `;
  } else if (doc.contentType === 'Brochure' || doc.contentType === 'One Pager' || doc.contentType === 'Whitepaper' || doc.contentType === 'Clinical Evidence' || doc.contentType === 'FAQ') {
    // Mock PDF layout
    previewContentDisplay.innerHTML = `
      <div class="mock-pdf-page">
        <div class="mock-pdf-header">
          <span class="mock-pdf-logo">1Cell.Ai Genomic Assays</span>
          <span style="font-size:9px; color:#94a3b8;">OFFICIAL APPROVED DOCUMENT</span>
        </div>
        <h2 class="mock-pdf-title">${doc.title}</h2>
        <div style="font-size:11px; margin-bottom:12px; color:var(--text-secondary);"><strong>Category:</strong> ${getCardCategoryLabel(doc)} | <strong>Owner / Author:</strong> ${doc.owner || doc.author || '1Cell.Ai Team'} | <strong>Biomarker:</strong> ${doc.biomarker || 'General'}</div>
        
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

  const previewBtnEdit = document.getElementById('previewBtnEdit');
  if (previewBtnEdit) {
    previewBtnEdit.onclick = () => {
      closeModal(previewModal);
      window.openEditAssetModal(docId);
    };
  }

  // Open the Modal
  openModal(previewModal);
};

// Inspect SharePoint details modal
window.inspectSharepoint = function(docId) {
  const doc = db.documents.find(d => d.id === docId) || db.newsletters.find(n => n.id === docId) || (db.reports || []).find(r => r.id === docId);
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
      <label>Owner / Author</label>
      <div style="font-weight:600; color:var(--text-primary);">${doc.owner || doc.author || doc.doctor || doc.speaker || '1Cell.Ai Team'}</div>
    </div>
    <div class="form-group">
      <label>Version Sequence</label>
      <div>${doc.version || 'v1.0'}</div>
    </div>
    <div class="form-group">
      <label>Approval Status</label>
      <div style="color:var(--success); font-weight:600;">${doc.status || 'Approved'}</div>
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

  const spModalEditBtn = document.getElementById('spModalEditBtn');
  if (spModalEditBtn) {
    spModalEditBtn.onclick = () => {
      closeModal(sharepointModal);
      window.openEditAssetModal(docId);
    };
  }

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

// Universal Asset Registration function (persisted to Central Supabase Database)
async function handleMockUpload(e) {
  e.preventDefault();

  const category = document.getElementById('formCategory').value;
  const department = document.getElementById('formDept').value;
  const product = document.getElementById('formProduct').value || null;
  const contentType = document.getElementById('formContentType').value;
  const title = document.getElementById('formTitle').value.trim();
  const description = document.getElementById('formDesc').value.trim() || 'No description provided.';
  const region = document.getElementById('formRegion').value;
  const cancerType = document.getElementById('formCancer').value || 'None';
  const biomarker = document.getElementById('formBiomarker').value || 'None';
  const status = document.getElementById('formStatus').value;
  const version = document.getElementById('formVersion').value || 'v1.0';
  let sharePointUrl = document.getElementById('formSpUrl').value.trim();
  const authorEl = document.getElementById('formAuthor');
  const authorInput = (authorEl ? authorEl.value.trim() : '') || '1Cell.Ai';
  const size = '2.5 MB';

  // Target Team & Collaboration Scope defaults to 'all'
  const visibility = 'all';

  const userTeam = getCurrentUserTeam();
  const authDept = sessionStorage.getItem("authDept");
  const authName = sessionStorage.getItem("authName") || authorInput;
  const authEmail = sessionStorage.getItem("authEmail") || 'marketing@1cell.ai';
  let dept = authDept;
  if (!dept) {
    if (userTeam === 'marketing') dept = 'Marketing';
    else if (userTeam === 'scientific') dept = 'Genomic Scientist';
    else if (currentRole === 'sales') dept = 'Sales';
    else if (currentRole === 'leadership') dept = 'Leadership';
  }

  // Permission policy: ANY team member can add content inside Company Assets and Product Hub!
  if (category !== 'company-assets' && category !== 'product-hub' && category !== 'case-library' && category !== 'report-library') {
    if (dept !== 'Marketing' && dept !== 'Leadership' && dept !== 'Corporate') {
      showToast("Access restricted: Only authorized team members may register content in this section.");
      closeModal(uploadModal);
      return;
    }
  }

  if (!title || !sharePointUrl) {
    showToast("Please fill in all required fields.");
    return;
  }

  // Validate SharePoint / OneDrive URL
  const urlValidation = supabaseService.validateDocumentUrl(sharePointUrl);
  if (!urlValidation.valid) {
    showToast(urlValidation.message);
    const spInput = document.getElementById('formSpUrl');
    if (spInput) spInput.focus();
    return;
  }
  sharePointUrl = urlValidation.url;

  // Duplicate URL Protection
  const duplicate = await supabaseService.checkDuplicateUrl(sharePointUrl);
  if (duplicate) {
    showToast(`Duplicate Document: This OneDrive/SharePoint link is already registered under "${duplicate.title}".`);
    return;
  }

  const saveBtn = document.getElementById('uploadModalSave');
  const originalBtnText = saveBtn ? saveBtn.innerHTML : 'Register & Synchronize Card';
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span>Saving to Central Hub...</span>';
  }

  const newDocId = `asset-${Date.now()}`;
  const assetData = {
    id: newDocId,
    title,
    description,
    category,
    department,
    product_workspace: product,
    content_type: contentType,
    region,
    cancer_type: cancerType,
    biomarkers: biomarker,
    owner_author: authName,
    version,
    status,
    target_team: userTeam,
    collaboration_scope: visibility,
    sharepoint_url: sharePointUrl,
    sharepoint_folder_path: product ? `${department}/${contentType}s` : `Shared Documents/Corporate/${contentType}s`,
    created_by: authName,
    created_by_email: authEmail,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_deleted: false,
    extra_metadata: {
      size,
      downloadCount: 0,
      viewCount: 1,
      isPinned: false,
      isTrending: false,
      year: "2026"
    }
  };

  try {
    let createdRecord = null;
    if (isSupabaseConfigured()) {
      createdRecord = await supabaseService.createAsset(assetData);
    } else {
      createdRecord = assetData;
      console.warn('[Central DB] Supabase not yet configured. Card added locally in session.');
    }

    const card = mapSupabaseRowToCard(createdRecord);
    applyAssetToLocalDb(card);

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
    showToast(`Successfully registered "${title}" under ${product ? product.toUpperCase() : 'Company Assets'}!`);
    window.refreshCurrentView();
  } catch (err) {
    console.error('[handleMockUpload error]:', err);
    showToast(`Unable to save card: ${err.message}`);
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.innerHTML = originalBtnText;
    }
  }
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


// -------------------------------------------------------------
// Universal SharePoint, Editing & Asset Removal Core Functions
// -------------------------------------------------------------

// Universal SharePoint Link Opener & Redirector
window.openSharePoint = function(id) {
  if (!id) return;
  if (/^https?:\/\//i.test(id)) {
    window.open(id, '_blank');
    return;
  }
  // 0. Check clinical sample reports
  const rep = (db.reports || []).find(r => r.id === id);
  if (rep && (rep.sharePointUrl || rep.downloadUrl)) {
    let url = (rep.sharePointUrl || rep.downloadUrl).trim();
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    window.open(url, '_blank');
    showToast(`Redirecting to SharePoint: ${rep.title}`);
    return;
  }
  // 1. Check documents or newsletters
  const doc = db.documents.find(d => d.id === id) || db.newsletters.find(n => n.id === id);
  if (doc && (doc.sharePointUrl || doc.downloadUrl)) {
    let url = (doc.sharePointUrl || doc.downloadUrl).trim();
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    window.open(url, '_blank');
    showToast(`Redirecting to SharePoint: ${doc.title}`);
    return;
  }
  // 2. Check clinical cases
  const c = db.cases.find(item => item.id === id);
  if (c && (c.sharePointUrl || c.readMoreUrl)) {
    let url = (c.sharePointUrl || c.readMoreUrl).trim();
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    window.open(url, '_blank');
    showToast(`Opening in SharePoint: ${c.title}`);
    return;
  }
  // 3. Check publications
  const pub = db.publications.find(item => item.id === id);
  if (pub && (pub.sharePointUrl || pub.link)) {
    let url = (pub.sharePointUrl || pub.link).trim();
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    window.open(url, '_blank');
    showToast(`Opening in SharePoint: ${pub.title}`);
    return;
  }
  // 4. Check digital videos
  const vid = db.videos.find(item => item.id === id);
  if (vid && (vid.sharePointUrl || vid.videoUrl)) {
    let url = (vid.sharePointUrl || vid.videoUrl).trim();
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    window.open(url, '_blank');
    showToast(`Opening in SharePoint: ${vid.title}`);
    return;
  }
  // 5. Check brand assets or templates
  const brand = (db.brandAssets || []).find(b => b.id === id);
  if (brand && (brand.downloadUrl || brand.sharePointUrl)) {
    let url = (brand.sharePointUrl || brand.downloadUrl).trim();
    if (!/^https?:\/\//i.test(url) && !url.startsWith('assets/') && !url.startsWith('/')) url = 'https://' + url;
    window.open(url, '_blank');
    showToast(`Opening: ${brand.title}`);
    return;
  }
  const temp = (db.templates || []).find(t => t.id === id);
  if (temp && (temp.downloadUrl || temp.sharePointUrl)) {
    let url = (temp.sharePointUrl || temp.downloadUrl).trim();
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    window.open(url, '_blank');
    showToast(`Opening in SharePoint: ${temp.title}`);
    return;
  }
  showToast("SharePoint URL not configured for this item.");
};

// Universal Delete Asset function
window.deleteAsset = async function(id) {
  if (!id) return;
  
  let itemTitle = 'this content card';
  let isOneDrive = false;
  const doc = (db.documents || []).find(d => d.id === id);
  if (doc) {
    itemTitle = doc.title;
    if (doc.oneDriveUrl || (doc.sharePointUrl && (doc.sharePointUrl.includes('sharepoint.com') || doc.sharePointUrl.includes('onedrive') || doc.sharePointUrl.includes('1drv.ms')))) {
      isOneDrive = true;
    }
  }
  const c = (db.cases || []).find(item => item.id === id);
  if (c) {
    itemTitle = c.title;
    if (c.oneDriveUrl || (c.readMoreUrl && (c.readMoreUrl.includes('sharepoint.com') || c.readMoreUrl.includes('onedrive')))) isOneDrive = true;
  }
  const pub = (db.publications || []).find(item => item.id === id);
  if (pub) {
    itemTitle = pub.title;
    if (pub.oneDriveUrl || (pub.link && (pub.link.includes('sharepoint.com') || pub.link.includes('onedrive')))) isOneDrive = true;
  }
  const vid = (db.videos || []).find(item => item.id === id);
  if (vid) itemTitle = vid.title;
  const rep = (db.reports || []).find(r => r.id === id);
  if (rep) {
    itemTitle = rep.title;
    if (rep.oneDriveUrl || (rep.sharePointUrl && (rep.sharePointUrl.includes('sharepoint.com') || rep.sharePointUrl.includes('onedrive')))) isOneDrive = true;
  }
  const brand = (db.brandAssets || []).find(b => b.id === id);
  if (brand) itemTitle = brand.title;
  const temp = (db.templates || []).find(t => t.id === id);
  if (temp) itemTitle = temp.title;

  const safetyNote = isOneDrive
    ? '\n\nSafety Guarantee: Your underlying Microsoft OneDrive / SharePoint file will NOT be deleted or modified. Only this reference card is removed from the Content Hub.'
    : '';

  if (!confirm(`Are you sure you want to remove "${itemTitle}"? This will delete the card from the collaborative Content Hub.${safetyNote}`)) {
    return;
  }

  showToast(`Removing card "${itemTitle}" from Hub...`);

  // Central Database deletion via Supabase Free Tier
  if (supabaseService.isConfigured()) {
    try {
      await supabaseService.deleteAsset(id);
    } catch (dbErr) {
      console.warn('Central Supabase delete warning:', dbErr);
      showToast(`Warning: Cloud delete encountered an issue: ${dbErr.message}`);
    }
  }

  // Remove from local in-memory collections
  removeAssetFromLocalDb(id);

  // Sync fallback localStorage
  try {
    const deletedIds = JSON.parse(localStorage.getItem('1cell_deleted_asset_ids') || '[]');
    if (!deletedIds.includes(id)) {
      deletedIds.push(id);
      localStorage.setItem('1cell_deleted_asset_ids', JSON.stringify(deletedIds));
    }
    if (db.documents) localStorage.setItem('1cell_custom_documents', JSON.stringify(db.documents));
    if (db.cases) localStorage.setItem('1cell_custom_cases', JSON.stringify(db.cases));
    if (db.publications) localStorage.setItem('1cell_custom_pubs', JSON.stringify(db.publications));
    if (db.videos) localStorage.setItem('1cell_custom_videos', JSON.stringify(db.videos));
    if (db.reports) localStorage.setItem('1cell_custom_reports', JSON.stringify(db.reports));
  } catch (e) {}

  // Close Edit modal if open
  const editModal = document.getElementById('editAssetModal');
  if (editModal) closeModal(editModal);

  showToast(`Successfully removed "${itemTitle}" (OneDrive file remains untouched)`);
  window.refreshCurrentView();
};

// Open Edit Asset Modal pre-populated with document/file data
window.openEditAssetModal = function(id) {
  const editModal = document.getElementById('editAssetModal');
  if (!editModal) return;

  const ownerEl = document.getElementById('editDocOwner');

  const doc = (db.documents || []).find(d => String(d.id) === String(id));
  if (doc) {
    document.getElementById('editDocId').value = doc.id;
    document.getElementById('editItemType').value = 'document';
    document.getElementById('editDocTitle').value = doc.title || '';
    document.getElementById('editDocSpUrl').value = doc.sharePointUrl || doc.oneDriveUrl || '';
    document.getElementById('editDocFolderPath').value = doc.folderPath || '';
    document.getElementById('editDocProduct').value = doc.product || '';
    
    // Normalize category to standard 5 or specific
    let cat = doc.contentType || 'About Product';
    const sel = document.getElementById('editDocContentType');
    if (sel) {
      const exists = Array.from(sel.options).some(o => o.value.toLowerCase() === cat.toLowerCase());
      if (!exists) {
        const stdCat = getProductAssetCategory(doc);
        if (stdCat === 'about-product') cat = 'About Product';
        else if (stdCat === 'evidence') cat = 'Evidence';
        else if (stdCat === 'scientific') cat = 'Scientific';
        else if (stdCat === 'training-sales') cat = 'Training & Sales Enablement';
        else cat = 'Other';
      }
      sel.value = cat;
    }

    document.getElementById('editDocDept').value = doc.department || 'Marketing';
    if (ownerEl) ownerEl.value = doc.owner || doc.author || '1Cell.Ai';
    document.getElementById('editDocVersion').value = doc.version || 'v1.0';
    document.getElementById('editDocStatus').value = doc.status || 'Approved';
    document.getElementById('editDocDesc').value = doc.description || '';
    const cancerEl = document.getElementById('editDocCancer');
    if (cancerEl) cancerEl.value = doc.cancerType || 'None';
    const biomarkerEl = document.getElementById('editDocBiomarker');
    if (biomarkerEl) biomarkerEl.value = doc.biomarker || 'None';
  } else {
    // Check if case study
    const c = (db.cases || []).find(item => String(item.id) === String(id));
    if (c) {
      document.getElementById('editDocId').value = c.id;
      document.getElementById('editItemType').value = 'case';
      document.getElementById('editDocTitle').value = c.title || '';
      document.getElementById('editDocSpUrl').value = c.readMoreUrl || c.oneDriveUrl || '';
      document.getElementById('editDocFolderPath').value = `Clinical Cases/${c.cancerType || 'Solid Tumor'}`;
      document.getElementById('editDocProduct').value = c.relatedProduct || '';
      document.getElementById('editDocContentType').value = 'Evidence';
      document.getElementById('editDocDept').value = 'Medical';
      if (ownerEl) ownerEl.value = c.doctor || c.owner || '1Cell.Ai';
      document.getElementById('editDocVersion').value = 'v1.0';
      document.getElementById('editDocStatus').value = 'Approved';
      document.getElementById('editDocDesc').value = c.summary || '';
      const cancerEl = document.getElementById('editDocCancer');
      if (cancerEl) cancerEl.value = c.cancerType || 'None';
      const biomarkerEl = document.getElementById('editDocBiomarker');
      if (biomarkerEl) biomarkerEl.value = c.biomarker || 'None';
    } else {
      // Check if publication
      const pub = (db.publications || []).find(item => String(item.id) === String(id));
      if (pub) {
        document.getElementById('editDocId').value = pub.id;
        document.getElementById('editItemType').value = 'publication';
        document.getElementById('editDocTitle').value = pub.title || '';
        document.getElementById('editDocSpUrl').value = pub.link || pub.oneDriveUrl || '';
        document.getElementById('editDocFolderPath').value = `Publications/${pub.journal || 'Peer-Reviewed'}`;
        document.getElementById('editDocProduct').value = pub.relatedProduct || '';
        document.getElementById('editDocContentType').value = 'Scientific';
        document.getElementById('editDocDept').value = 'Scientific';
        if (ownerEl) ownerEl.value = pub.authors || pub.owner || '1Cell.Ai';
        document.getElementById('editDocVersion').value = 'v1.0';
        document.getElementById('editDocStatus').value = 'Approved';
        document.getElementById('editDocDesc').value = pub.abstract || '';
        const cancerEl = document.getElementById('editDocCancer');
        if (cancerEl) cancerEl.value = 'None';
        const biomarkerEl = document.getElementById('editDocBiomarker');
        if (biomarkerEl) biomarkerEl.value = 'None';
      } else {
        // Check if video
        const vid = (db.videos || []).find(item => String(item.id) === String(id));
        if (vid) {
          document.getElementById('editDocId').value = vid.id;
          document.getElementById('editItemType').value = 'video';
          document.getElementById('editDocTitle').value = vid.title || '';
          document.getElementById('editDocSpUrl').value = vid.videoUrl || vid.oneDriveUrl || '';
          document.getElementById('editDocFolderPath').value = 'Digital Videos';
          document.getElementById('editDocProduct').value = vid.product || '';
          document.getElementById('editDocContentType').value = 'Training & Sales Enablement';
          document.getElementById('editDocDept').value = 'Marketing';
          if (ownerEl) ownerEl.value = vid.speaker || vid.owner || '1Cell.Ai';
          document.getElementById('editDocVersion').value = 'v1.0';
          document.getElementById('editDocStatus').value = 'Approved';
          document.getElementById('editDocDesc').value = vid.description || '';
          const cancerEl = document.getElementById('editDocCancer');
          if (cancerEl) cancerEl.value = 'None';
          const biomarkerEl = document.getElementById('editDocBiomarker');
          if (biomarkerEl) biomarkerEl.value = 'None';
        } else {
          // Check if clinical sample report
          const rep = (db.reports || []).find(r => String(r.id) === String(id));
          if (rep) {
            document.getElementById('editDocId').value = rep.id;
            document.getElementById('editItemType').value = 'report';
            document.getElementById('editDocTitle').value = rep.title || '';
            document.getElementById('editDocSpUrl').value = rep.sharePointUrl || rep.oneDriveUrl || '';
            document.getElementById('editDocFolderPath').value = rep.folderPath || `Shared Documents/Report Library/${rep.cancerType || 'Clinical'}`;
            document.getElementById('editDocProduct').value = rep.product || '';
            document.getElementById('editDocContentType').value = 'Evidence';
            const cancerEl = document.getElementById('editDocCancer');
            if (cancerEl) cancerEl.value = rep.cancerType || 'None';
            const biomarkerEl = document.getElementById('editDocBiomarker');
            if (biomarkerEl) biomarkerEl.value = rep.biomarker || 'None';
            document.getElementById('editDocDept').value = 'Medical';
            if (ownerEl) ownerEl.value = rep.author || rep.owner || '1Cell.Ai';
            document.getElementById('editDocVersion').value = rep.version || 'v1.0';
            document.getElementById('editDocStatus').value = rep.status || 'Approved';
            document.getElementById('editDocDesc').value = rep.summary || rep.description || '';
          } else {
            // Check if brand asset
            const brand = (db.brandAssets || []).find(b => String(b.id) === String(id));
            if (brand) {
              document.getElementById('editDocId').value = brand.id;
              document.getElementById('editItemType').value = 'brand';
              document.getElementById('editDocTitle').value = brand.title || '';
              document.getElementById('editDocSpUrl').value = brand.sharePointUrl || brand.downloadUrl || brand.oneDriveUrl || '';
              document.getElementById('editDocFolderPath').value = brand.folderPath || 'Brand Guidelines & Assets';
              document.getElementById('editDocProduct').value = '';
              document.getElementById('editDocContentType').value = 'Other';
              document.getElementById('editDocDept').value = 'Corporate';
              if (ownerEl) ownerEl.value = brand.owner || brand.author || 'Brand Team';
              document.getElementById('editDocVersion').value = brand.version || 'v1.0';
              document.getElementById('editDocStatus').value = brand.status || 'Approved';
              document.getElementById('editDocDesc').value = brand.description || '';
            } else {
              // Check if template
              const temp = (db.templates || []).find(t => String(t.id) === String(id));
              if (temp) {
                document.getElementById('editDocId').value = temp.id;
                document.getElementById('editItemType').value = 'template';
                document.getElementById('editDocTitle').value = temp.title || '';
                document.getElementById('editDocSpUrl').value = temp.sharePointUrl || temp.downloadUrl || temp.oneDriveUrl || '';
                document.getElementById('editDocFolderPath').value = temp.folderPath || 'Templates';
                document.getElementById('editDocProduct').value = '';
                document.getElementById('editDocContentType').value = 'Other';
                document.getElementById('editDocDept').value = 'Corporate';
                if (ownerEl) ownerEl.value = temp.owner || temp.author || '1Cell.Ai';
                document.getElementById('editDocVersion').value = temp.version || 'v1.0';
                document.getElementById('editDocStatus').value = temp.status || 'Approved';
                document.getElementById('editDocDesc').value = temp.description || '';
              }
            }
          }
        }
      }
    }
  }

  openModal(editModal);
};

// Save edited asset and SharePoint URL
window.saveAssetEdit = async function() {
  const idEl = document.getElementById('editDocId');
  if (!idEl || !idEl.value) {
    showToast("Error: No card ID found to edit.");
    return;
  }
  const id = idEl.value;
  const itemType = (document.getElementById('editItemType') ? document.getElementById('editItemType').value : 'document');
  const title = (document.getElementById('editDocTitle') ? document.getElementById('editDocTitle').value.trim() : '');
  let spUrl = (document.getElementById('editDocSpUrl') ? document.getElementById('editDocSpUrl').value.trim() : '');
  const folderPath = (document.getElementById('editDocFolderPath') ? document.getElementById('editDocFolderPath').value.trim() : '');
  const product = (document.getElementById('editDocProduct') ? document.getElementById('editDocProduct').value : null) || null;
  const contentType = (document.getElementById('editDocContentType') ? document.getElementById('editDocContentType').value : 'About Product');
  const department = (document.getElementById('editDocDept') ? document.getElementById('editDocDept').value : 'Marketing');
  const ownerEl = document.getElementById('editDocOwner');
  const owner = ownerEl ? ownerEl.value.trim() : '';
  const version = (document.getElementById('editDocVersion') ? document.getElementById('editDocVersion').value.trim() : '') || 'v1.0';
  const status = (document.getElementById('editDocStatus') ? document.getElementById('editDocStatus').value : 'Approved');
  const desc = (document.getElementById('editDocDesc') ? document.getElementById('editDocDesc').value.trim() : '');
  const cancerEl = document.getElementById('editDocCancer');
  const biomarkerEl = document.getElementById('editDocBiomarker');
  const cancerVal = (cancerEl && cancerEl.value && cancerEl.value !== 'None') ? cancerEl.value : 'None';
  const biomarkerVal = (biomarkerEl && biomarkerEl.value && biomarkerEl.value !== 'None') ? biomarkerEl.value : 'None';

  // Target Team & Collaboration Scope defaults to 'all'
  const visibility = 'all';

  const userTeam = getCurrentUserTeam();
  const authName = sessionStorage.getItem("authName") || owner || '1Cell.Ai';

  if (!title || !spUrl) {
    showToast("Document Title and SharePoint / OneDrive URL are required!");
    return;
  }

  if (!/^https?:\/\//i.test(spUrl)) {
    spUrl = 'https://' + spUrl;
  }

  // Validate Document URL format
  const urlCheck = supabaseService.validateDocumentUrl(spUrl);
  if (!urlCheck.valid) {
    showToast(urlCheck.message || "Please provide a valid document URL.");
    return;
  }

  const saveBtn = document.getElementById('editAssetModalSave') || document.getElementById('editModalSave');
  const originalBtnText = saveBtn ? saveBtn.innerHTML : 'Save Changes';

  // Central Database update via Supabase Free Tier
  if (supabaseService.isConfigured()) {
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating Central Hub...';
    }

    try {
      await supabaseService.updateAsset(id, {
        title: title,
        description: desc,
        department: department,
        product_workspace: product,
        content_type: contentType,
        cancer_type: cancerVal,
        biomarkers: biomarkerVal,
        owner_author: owner || authName,
        version: version,
        status: status,
        target_team: 'all',
        collaboration_scope: 'all',
        sharepoint_url: spUrl,
        sharepoint_folder_path: folderPath || 'Shared Documents'
      });
    } catch (dbErr) {
      console.warn('Central Supabase update warning:', dbErr);
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalBtnText;
      }
    }
  }

  // Update in canonical db.documents
  if (!db.documents) db.documents = [];
  const docIdx = db.documents.findIndex(d => String(d.id) === String(id));
  const updatedDocData = {
    title: title,
    sharePointUrl: spUrl,
    oneDriveUrl: spUrl,
    visibility: 'all',
    folderPath: folderPath || 'Shared Documents',
    product: product,
    contentType: contentType,
    department: department,
    owner: owner || authName,
    author: owner || authName,
    version: version,
    status: status,
    description: desc,
    cancerType: cancerVal,
    biomarker: biomarkerVal,
    updatedDate: new Date().toISOString().split('T')[0],
    updated_at: new Date().toISOString()
  };

  if (docIdx >= 0) {
    db.documents[docIdx] = { ...db.documents[docIdx], ...updatedDocData };
  } else {
    db.documents.unshift({ id: id, ...updatedDocData });
  }
  try {
    localStorage.setItem('1cell_custom_documents', JSON.stringify(db.documents));
  } catch (e) {}

  // Update in specialized collections if applicable
  if (db.cases) {
    const cIdx = db.cases.findIndex(item => String(item.id) === String(id));
    if (cIdx >= 0) {
      db.cases[cIdx] = {
        ...db.cases[cIdx],
        title: title,
        readMoreUrl: spUrl,
        oneDriveUrl: spUrl,
        visibility: 'all',
        relatedProduct: product || db.cases[cIdx].relatedProduct,
        doctor: owner || authName,
        owner: owner || authName,
        summary: desc,
        description: desc,
        cancerType: cancerVal,
        biomarker: biomarkerVal,
        updated_at: new Date().toISOString()
      };
      try { localStorage.setItem('1cell_custom_cases', JSON.stringify(db.cases)); } catch (e) {}
    }
  }

  if (db.publications) {
    const pIdx = db.publications.findIndex(item => String(item.id) === String(id));
    if (pIdx >= 0) {
      db.publications[pIdx] = {
        ...db.publications[pIdx],
        title: title,
        link: spUrl,
        oneDriveUrl: spUrl,
        visibility: 'all',
        relatedProduct: product || db.publications[pIdx].relatedProduct,
        authors: owner || authName,
        owner: owner || authName,
        abstract: desc,
        description: desc,
        updated_at: new Date().toISOString()
      };
      try { localStorage.setItem('1cell_custom_pubs', JSON.stringify(db.publications)); } catch (e) {}
    }
  }

  if (db.videos) {
    const vIdx = db.videos.findIndex(item => String(item.id) === String(id));
    if (vIdx >= 0) {
      db.videos[vIdx] = {
        ...db.videos[vIdx],
        title: title,
        videoUrl: spUrl,
        oneDriveUrl: spUrl,
        visibility: 'all',
        product: product || db.videos[vIdx].product,
        speaker: owner || authName,
        owner: owner || authName,
        description: desc,
        summary: desc,
        updated_at: new Date().toISOString()
      };
      try { localStorage.setItem('1cell_custom_videos', JSON.stringify(db.videos)); } catch (e) {}
    }
  }

  if (db.reports) {
    const rIdx = db.reports.findIndex(r => String(r.id) === String(id));
    if (rIdx >= 0) {
      db.reports[rIdx] = {
        ...db.reports[rIdx],
        title: title,
        sharePointUrl: spUrl,
        oneDriveUrl: spUrl,
        visibility: 'all',
        folderPath: folderPath || db.reports[rIdx].folderPath,
        product: product || db.reports[rIdx].product,
        cancerType: cancerVal,
        biomarker: biomarkerVal,
        author: owner || authName,
        owner: owner || authName,
        summary: desc,
        description: desc,
        version: version || db.reports[rIdx].version,
        status: status || db.reports[rIdx].status,
        updatedDate: new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString()
      };
      try { localStorage.setItem('1cell_custom_reports', JSON.stringify(db.reports)); } catch (e) {}
    }
  }

  if (db.brandAssets) {
    const bIdx = db.brandAssets.findIndex(b => String(b.id) === String(id));
    if (bIdx >= 0) {
      db.brandAssets[bIdx] = {
        ...db.brandAssets[bIdx],
        title: title,
        sharePointUrl: spUrl,
        downloadUrl: spUrl,
        oneDriveUrl: spUrl,
        visibility: 'all',
        owner: owner || authName,
        author: owner || authName,
        description: desc,
        updated_at: new Date().toISOString()
      };
      try { localStorage.setItem('1cell_custom_brandAssets', JSON.stringify(db.brandAssets)); } catch (e) {}
    }
  }

  if (db.templates) {
    const tIdx = db.templates.findIndex(t => String(t.id) === String(id));
    if (tIdx >= 0) {
      db.templates[tIdx] = {
        ...db.templates[tIdx],
        title: title,
        sharePointUrl: spUrl,
        downloadUrl: spUrl,
        oneDriveUrl: spUrl,
        visibility: 'all',
        owner: owner || authName,
        author: owner || authName,
        description: desc,
        updated_at: new Date().toISOString()
      };
      try { localStorage.setItem('1cell_custom_templates', JSON.stringify(db.templates)); } catch (e) {}
    }
  }

  showToast(`Updated "${title}"! Direct link & metadata saved.`);
  const editModal = document.getElementById('editAssetModal');
  if (editModal) closeModal(editModal);

  // Refresh current view to instantly display updated cards
  window.refreshCurrentView();
};

// Re-render current active screen
window.refreshCurrentView = function() {
  // If user is inside a product microsite, re-render the microsite preserving the active tab
  if (currentMicrositeId && document.querySelector('.product-workspace-header')) {
    window.openProductMicrosite(currentMicrositeId);
    return;
  }

  const activeNav = document.querySelector('.sidebar .nav-item.active');
  const route = activeNav ? activeNav.getAttribute('data-route') : 'dashboard';
  
  if (route === 'dashboard') {
    const activeTab = document.querySelector('.product-tab.active');
    const selectedProd = activeTab ? activeTab.getAttribute('data-product') : 'oncoindx';
    renderDashboard();
    // Preserve active product folder tab
    const tabs = workspaceViewport.querySelectorAll('.product-tab');
    tabs.forEach(t => {
      if (t.getAttribute('data-product') === selectedProd) {
        t.classList.add('active');
      } else {
        t.classList.remove('active');
      }
    });
    renderDashboardProductDocs(selectedProd);
  } else {
    renderRoute(route);
  }
};
