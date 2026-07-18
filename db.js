// 1Cell.Ai Content Hub Mock Database

const db = {
  products: [
    {
      id: "oncoindx",
      name: "OncoIndx Multimodal",
      description: "Our flagship comprehensive multimodal genomic and transcriptomic profiling assay for solid tumors.",
      details: "Integrates DNA, RNA, and digital pathology with AI-driven tumor microenvironment mapping to identify actionable targets, resistance mechanisms, and immunotherapy markers.",
      clinicalBenefits: [
        "Uncovers 30% more actionable targets than conventional DNA-only panels",
        "Predicts immunotherapy response via combined TMB, MSI, and TME profiling",
        "Provides structured reports with clinical trial matching"
      ],
      competitiveAdvantage: "Unlike basic panels, OncoIndx uses advanced RNA fusion detection and visualizes spatial tumor biology metrics.",
      tags: ["Multimodal", "Comprehensive", "Solid Tumor", "AI Profiling"]
    },
    {
      id: "oncopredikt",
      name: "OncoPredikt",
      description: "AI-based predictive response algorithm for chemotherapy and targeted regimens.",
      details: "Leverages machine learning models trained on millions of data points to forecast patient-specific drug efficacy and toxicity profiles, helping oncologists optimize chemotherapy selections.",
      clinicalBenefits: [
        "Reduces severe toxicity rates by up to 25%",
        "Identifies ineffective regimens early, saving critical therapy window",
        "Provides customized dosage optimization suggestions"
      ],
      competitiveAdvantage: "Utilizes historical multi-omic datasets coupled with real-world outcomes, offering superior accuracy over standard guideline checklists.",
      tags: ["AI", "Chemosensitivity", "Response Prediction"]
    },
    {
      id: "oncohrd",
      name: "OncoHRD",
      description: "Gold-standard Homologous Recombination Deficiency detection assay.",
      details: "Measures genomic scar scores (LOH, TAI, LST) to determine HRD status, providing critical guidance for PARP inhibitor therapy eligibility in ovarian, breast, prostate, and pancreatic cancers.",
      clinicalBenefits: [
        "Identifies patients likely to benefit from PARP inhibitors",
        "Calculates individual genomic instability score with high precision",
        "Fully validated against standard clinical trial benchmarks"
      ],
      competitiveAdvantage: "Offers a lower fail rate on low-purity samples compared to leading commercial competitors.",
      tags: ["HRD", "PARP Inhibitor", "Ovarian Cancer", "Breast Cancer"]
    },
    {
      id: "oncorisk",
      name: "OncoRisk",
      description: "Hereditary cancer panel for assessing germline risk variants.",
      details: "Analyzes up to 84 genes associated with hereditary cancer syndromes, offering patients and families proactive genetic guidance.",
      clinicalBenefits: [
        "Identifies inherited risk for breast, ovarian, colorectal, and other cancers",
        "Includes comprehensive pre- and post-test genetic counseling templates",
        "Clear, actionable reports outlining personalized screening protocols"
      ],
      competitiveAdvantage: "Integrates advanced variant interpretation powered by 1Cell's proprietary variant database.",
      tags: ["Hereditary", "Germline", "Risk Assessment"]
    },
    {
      id: "oncomonitor",
      name: "OncoMonitor",
      description: "Liquid biopsy assay for post-treatment monitoring and minimal residual disease (MRD) detection.",
      details: "Tracks patient-specific somatic mutations in cell-free DNA (cfDNA) to capture molecular relapse months before clinical or radiological recurrence.",
      clinicalBenefits: [
        "Detects recurrence up to 8 months ahead of standard imaging",
        "Non-invasive blood draw avoids repeated tissue biopsies",
        "Quantitative tracking of mutant allele fractions over time"
      ],
      competitiveAdvantage: "Achieves sensitivity down to 0.01% variant allele frequency (VAF) utilizing unique molecular identifiers.",
      tags: ["Liquid Biopsy", "MRD", "Monitoring", "cfDNA"]
    },
    {
      id: "oncotarget",
      name: "OncoTarget",
      description: "Rapid, targeted hotspot panel focusing on actionable mutations in common cancer types.",
      details: "A cost-effective, rapid NGS panel covering key therapeutic targets (EGFR, KRAS, BRAF, ALK, ROS1) to facilitate quick clinical decisions.",
      clinicalBenefits: [
        "Fast turn-around time (5 calendar days)",
        "Direct guidance for standard first-line targeted therapies",
        "High depth of coverage for accurate low-frequency variant detection"
      ],
      competitiveAdvantage: "Optimized workflow for small tissue biopsies with very low DNA input requirements.",
      tags: ["Rapid Panel", "Actionable Hotspots", "Targeted Therapy"]
    },
    {
      id: "primeplus",
      name: "Prime+",
      description: "Advanced companion diagnostic alignment service for complex immunotherapy mapping.",
      details: "Combines PD-L1 IHC, mismatch repair (MMR) status, tumor mutational burden (TMB), and gene expression signatures into a single clinical report.",
      clinicalBenefits: [
        "Unifies multiple immuno-oncology biomarkers into one actionable score",
        "Helps resolve ambiguous cases where PD-L1 and TMB are discordant",
        "Provides clear recommendations for immune checkpoint blockades"
      ],
      competitiveAdvantage: "Integrates spatial pathology analysis with genomic indicators for a multidimensional look at the TME.",
      tags: ["Immunotherapy", "Companion Dx", "Pathology + Genomics"]
    },
    {
      id: "icore",
      name: "iCore",
      description: "1Cell's core bioinformatic pipeline and cloud storage portal for clinical research.",
      details: "A secure, HIPAA-compliant platform for clinical trial sponsors and research institutions to manage genomic data, query variants, and generate automated drafts of scientific reports.",
      clinicalBenefits: [
        "Streamlines research workflows with raw FASTQ processing pipelines",
        "Secure remote access for multi-center clinical trials",
        "Comprehensive API documentation for seamless LIMS integration"
      ],
      competitiveAdvantage: "Ultra-fast pipeline times utilizing GPU-accelerated variant calling algorithms.",
      tags: ["Bioinformatics", "Cloud Portal", "Clinical Trials", "API"]
    }
  ],

  documents: [
    {
      id: "doc-asm-001",
      title: "1Cell.Ai ASM Sales Playbook 2026",
      description: "Official Area Sales Manager (ASM) strategy guide detailing pitch flows, pricing calculators, objection handling, and competitor matrix comparison models.",
      department: "Sales Enablement",
      product: null,
      cancerType: "Pan Cancer",
      biomarker: null,
      contentType: "Sales Playbook",
      region: "Global",
      status: "Approved",
      year: "2026",
      version: "v1.0",
      author: "Sales Enablement Team",
      owner: "Sales",
      createdDate: "2026-02-15",
      updatedDate: "2026-06-01",
      sharePointUrl: "https://ocdipl.sharepoint.com/sites/1Cell.AiMarketingSite/Shared%20Documents/Sales/1Cell_Ai_ASM_Playbook_2026.pdf",
      folderPath: "Shared Documents/Sales",
      size: "8.2 MB",
      downloadCount: 412,
      viewCount: 1105,
      isPinned: true,
      isTrending: true
    },
    {
      id: "doc-asm-002",
      title: "1Cell.Ai ASM Competitor Battlecard (Guardant360 vs OncoRisk)",
      description: "Comparison cheat sheet outlining sensitivity rates, covered biomarkers, pricing, and turn-around time advantages to win physician trials.",
      department: "Sales Enablement",
      product: "oncorisk",
      cancerType: "Pan Cancer",
      biomarker: "BRCA",
      contentType: "Objection Handling",
      region: "North America",
      status: "Approved",
      year: "2026",
      version: "v2.1",
      author: "Market Intelligence",
      owner: "Sales",
      createdDate: "2026-03-10",
      updatedDate: "2026-06-15",
      sharePointUrl: "https://ocdipl.sharepoint.com/sites/1Cell.AiMarketingSite/Shared%20Documents/OncoRisk/Battlecards_OncoRisk_vs_Guardant360.pdf",
      folderPath: "Shared Documents/OncoRisk",
      size: "2.1 MB",
      downloadCount: 295,
      viewCount: 840,
      isPinned: false,
      isTrending: true
    },
    {
      id: "doc-asm-003",
      title: "Reimbursement & Payer Coverage Objection Sheet",
      description: "Quick-reference response playbook mapping common insurance rejection excuses and prior-authorization appeal templates for ASMs.",
      department: "Sales Enablement",
      product: null,
      cancerType: "Pan Cancer",
      biomarker: null,
      contentType: "FAQ",
      region: "US Only",
      status: "Approved",
      year: "2026",
      version: "v1.4",
      author: "Payer Relations Team",
      owner: "Sales",
      createdDate: "2026-01-20",
      updatedDate: "2026-05-18",
      sharePointUrl: "https://ocdipl.sharepoint.com/sites/1Cell.AiMarketingSite/Shared%20Documents/Sales/Reimbursement_Objections_2026.pdf",
      folderPath: "Shared Documents/Sales",
      size: "1.5 MB",
      downloadCount: 189,
      viewCount: 512,
      isPinned: false,
      isTrending: false
    },
    {
      id: "doc-asm-004",
      title: "1Cell.Ai ASM Quarter Kickoff Presentation",
      description: "Q3 sales targets, compensation incentives, key hospital target lists, and regional marketing push presentation deck.",
      department: "Sales Enablement",
      product: null,
      cancerType: "Pan Cancer",
      biomarker: null,
      contentType: "Presentation",
      region: "Global",
      status: "Approved",
      year: "2026",
      version: "v1.0",
      author: "Sales Operations VP",
      owner: "Sales",
      createdDate: "2026-06-20",
      updatedDate: "2026-06-22",
      sharePointUrl: "https://ocdipl.sharepoint.com/sites/1Cell.AiMarketingSite/Shared%20Documents/Sales/ASM_Q3_Kickoff_Slides.pptx",
      folderPath: "Shared Documents/Sales",
      size: "14.5 MB",
      downloadCount: 78,
      viewCount: 220,
      isPinned: false,
      isTrending: false
    },
    {
      id: "doc-001",
      title: "OncoIndx Multimodal Product Brochure 2025",
      description: "Comprehensive product brochure explaining the multimodal assay, scientific foundation, clinical indications, and reporting format.",
      department: "Marketing",
      product: "oncoindx",
      cancerType: "Pan Cancer",
      biomarker: "PD-L1",
      contentType: "Brochure",
      region: "Global",
      status: "Approved",
      year: "2025",
      version: "v2.3",
      author: "Sarah Jenkins",
      owner: "Marketing Admin",
      createdDate: "2025-01-10",
      updatedDate: "2025-05-12",
      sharePointUrl: "https://ocdipl.sharepoint.com/sites/1Cell.AiMarketingSite/Shared%20Documents/OncoIndx/OncoIndx_Brochure_2025_v2.3.pdf",
      folderPath: "Shared Documents/OncoIndx",
      size: "4.8 MB",
      downloadCount: 342,
      viewCount: 1205,
      isPinned: true,
      isTrending: true
    },
    {
      id: "doc-002",
      title: "OncoIndx Clinical Utility Presentation",
      description: "Slide deck for medical representatives illustrating the diagnostic advantages and clinical cases of OncoIndx Multimodal.",
      department: "Sales",
      product: "oncoindx",
      cancerType: "Pan Cancer",
      biomarker: "MSI",
      contentType: "Sales Deck",
      region: "India",
      status: "Approved",
      year: "2025",
      version: "v1.8",
      author: "Rajesh Kumar",
      owner: "Sales Support",
      createdDate: "2025-02-15",
      updatedDate: "2025-06-20",
      sharePointUrl: "https://ocdipl.sharepoint.com/sites/1Cell.AiMarketingSite/Shared%20Documents/OncoIndx/OncoIndx_Clinical_Utility_v1.8.pptx",
      folderPath: "Shared Documents/OncoIndx",
      size: "14.2 MB",
      downloadCount: 198,
      viewCount: 654,
      isPinned: true,
      isTrending: false
    },
    {
      id: "doc-003",
      title: "OncoPredikt Efficacy Predictor One Pager",
      description: "A quick-read sales leave-behind summarizing how OncoPredikt improves chemotherapy success rates.",
      department: "Marketing",
      product: "oncopredikt",
      cancerType: "Colorectal",
      biomarker: "TMB",
      contentType: "One Pager",
      region: "Global",
      status: "Approved",
      year: "2025",
      version: "v1.2",
      author: "Emily Watson",
      owner: "Marketing Admin",
      createdDate: "2025-03-01",
      updatedDate: "2025-03-15",
      sharePointUrl: "https://ocdipl.sharepoint.com/sites/1Cell.AiMarketingSite/Shared%20Documents/OncoPredikt/OncoPredikt_OnePager_v1.2.pdf",
      folderPath: "Shared Documents/OncoPredikt",
      size: "1.2 MB",
      downloadCount: 89,
      viewCount: 310,
      isPinned: false,
      isTrending: false
    },
    {
      id: "doc-004",
      title: "OncoHRD Ovarian Cancer Clinical Evidence Paper",
      description: "Peer-reviewed analysis validating the homologous recombination deficiency scoring algorithms in ovarian cancer patients.",
      department: "Medical",
      product: "oncohrd",
      cancerType: "Ovarian",
      biomarker: "HRD",
      contentType: "Clinical Evidence",
      region: "US",
      status: "Approved",
      year: "2024",
      version: "v3.0",
      author: "Dr. Amanda Ross",
      owner: "Medical Affairs Coordinator",
      createdDate: "2024-09-12",
      updatedDate: "2024-11-05",
      sharePointUrl: "https://ocdipl.sharepoint.com/sites/1Cell.AiMarketingSite/Shared%20Documents/OncoHRD/OncoHRD_Ovarian_Validation_v3.pdf",
      folderPath: "Shared Documents/OncoHRD",
      size: "2.4 MB",
      downloadCount: 450,
      viewCount: 1540,
      isPinned: true,
      isTrending: true
    },
    {
      id: "doc-005",
      title: "1Cell.Ai Brand Guidelines Manual 2026",
      description: "Official guide containing corporate colors, logo usages, typography rules, and email signature guidelines.",
      department: "Corporate",
      product: null,
      cancerType: "Pan Cancer",
      biomarker: null,
      contentType: "Brand Asset",
      region: "Global",
      status: "Approved",
      year: "2026",
      version: "v4.0",
      author: "Creative Director",
      owner: "Marketing Admin",
      createdDate: "2026-01-05",
      updatedDate: "2026-01-05",
      sharePointUrl: "https://ocdipl.sharepoint.com/sites/1Cell.AiMarketingSite/Shared%20Documents/Corporate/1Cell_Brand_Guidelines_v4.pdf",
      folderPath: "Shared Documents/Corporate",
      size: "18.5 MB",
      downloadCount: 512,
      viewCount: 2201,
      isPinned: true,
      isTrending: true
    },
    {
      id: "doc-006",
      title: "OncoRisk Hereditary BRCA1/2 Testing FAQ",
      description: "Frequently Asked Questions sheet regarding BRCA mutation screening, clinical follow-ups, and patient reports.",
      department: "Medical",
      product: "oncorisk",
      cancerType: "Breast",
      biomarker: "BRCA",
      contentType: "FAQ",
      region: "India",
      status: "Approved",
      year: "2025",
      version: "v1.1",
      author: "Medical Affairs Team",
      owner: "Medical Affairs Coordinator",
      createdDate: "2025-01-20",
      updatedDate: "2025-04-18",
      sharePointUrl: "https://ocdipl.sharepoint.com/sites/1Cell.AiMarketingSite/Shared%20Documents/OncoRisk/OncoRisk_BRCA_FAQ_v1.1.pdf",
      folderPath: "Shared Documents/OncoRisk",
      size: "820 KB",
      downloadCount: 73,
      viewCount: 231,
      isPinned: false,
      isTrending: false
    },
    {
      id: "doc-007",
      title: "OncoMonitor Liquid Biopsy Case Study - Lung Cancer Recurrence",
      description: "Clinical case details showing how OncoMonitor detected an EGFR-mutant lung cancer recurrence 6 months before radiographic imaging.",
      department: "Medical",
      product: "oncomonitor",
      cancerType: "Lung",
      biomarker: "TMB",
      contentType: "Case Study",
      region: "Global",
      status: "Approved",
      year: "2025",
      version: "v2.0",
      author: "Dr. Nilesh Shah",
      owner: "Medical Affairs Coordinator",
      createdDate: "2025-03-10",
      updatedDate: "2025-05-24",
      sharePointUrl: "https://ocdipl.sharepoint.com/sites/1Cell.AiMarketingSite/Shared%20Documents/OncoMonitor/OncoMonitor_Lung_Recurrence_Case.pdf",
      folderPath: "Shared Documents/OncoMonitor",
      size: "1.9 MB",
      downloadCount: 165,
      viewCount: 689,
      isPinned: true,
      isTrending: true
    },
    {
      id: "doc-008",
      title: "OncoTarget Hotspot NGS panel validation data sheet",
      description: "Validation summary detailing the target genes, coverage metrics, and detection limits for the rapid hotspot panel.",
      department: "Scientific",
      product: "oncotarget",
      cancerType: "Pan Cancer",
      biomarker: "HER2",
      contentType: "Whitepaper",
      region: "Global",
      status: "Approved",
      year: "2025",
      version: "v1.5",
      author: "Dr. Vikram Seth",
      owner: "Scientific Team Leader",
      createdDate: "2025-02-18",
      updatedDate: "2025-02-18",
      sharePointUrl: "https://ocdipl.sharepoint.com/sites/1Cell.AiMarketingSite/Shared%20Documents/OncoTarget/OncoTarget_NGS_Validation_v1.5.pdf",
      folderPath: "Shared Documents/OncoTarget",
      size: "3.2 MB",
      downloadCount: 88,
      viewCount: 420,
      isPinned: false,
      isTrending: false
    },
    {
      id: "doc-009",
      title: "Prime+ Immunotherapy Matching Deck for Clinicians",
      description: "High-end clinical presentation detailer demonstrating the predictive value of combining PD-L1, TMB, and spatial genomics in solid tumors.",
      department: "Sales",
      product: "primeplus",
      cancerType: "Lung",
      biomarker: "PD-L1",
      contentType: "Sales Deck",
      region: "US",
      status: "Approved",
      year: "2025",
      version: "v2.1",
      author: "David Vance",
      owner: "Sales Support",
      createdDate: "2025-04-12",
      updatedDate: "2025-06-05",
      sharePointUrl: "https://ocdipl.sharepoint.com/sites/1Cell.AiMarketingSite/Shared%20Documents/PrimePlus/PrimePlus_Clinician_Deck_v2.1.pptx",
      folderPath: "Shared Documents/PrimePlus",
      size: "11.7 MB",
      downloadCount: 145,
      viewCount: 520,
      isPinned: false,
      isTrending: false
    },
    {
      id: "doc-010",
      title: "iCore Cloud Portal User Guide & API Documentation",
      description: "Detailed guide for laboratory partners detailing API endpoints, security compliance (HIPAA), and cohort export tools.",
      department: "Product",
      product: "icore",
      cancerType: "Pan Cancer",
      biomarker: null,
      contentType: "Training",
      region: "Global",
      status: "Approved",
      year: "2024",
      version: "v3.2",
      author: "Pooja Banerjee",
      owner: "Product Manager (iCore)",
      createdDate: "2024-11-20",
      updatedDate: "2025-03-01",
      sharePointUrl: "https://ocdipl.sharepoint.com/sites/1Cell.AiMarketingSite/Shared%20Documents/iCore/iCore_API_UserGuide_v3.2.pdf",
      folderPath: "Shared Documents/iCore",
      size: "6.1 MB",
      downloadCount: 110,
      viewCount: 390,
      isPinned: false,
      isTrending: false
    },
    {
      id: "doc-011",
      title: "India Q1 Oncologist Outreach Email Campaign Template",
      description: "Ready-to-use email communications template describing OncoIndx precision reports, personalized for regional clinical leaders.",
      department: "Sales",
      product: "oncoindx",
      cancerType: "Pan Cancer",
      biomarker: "HRD",
      contentType: "Email Template",
      region: "India",
      status: "Approved",
      year: "2025",
      version: "v1.0",
      author: "Amit Patel",
      owner: "Marketing Admin",
      createdDate: "2025-03-20",
      updatedDate: "2025-03-20",
      sharePointUrl: "https://ocdipl.sharepoint.com/sites/1Cell.AiMarketingSite/Shared%20Documents/OncoIndx/India_Q1_OncoIndx_Email_v1.html",
      folderPath: "Shared Documents/OncoIndx",
      size: "120 KB",
      downloadCount: 220,
      viewCount: 810,
      isPinned: false,
      isTrending: true
    },
    {
      id: "doc-012",
      title: "OncoHRD Breast Cancer Abstract - ESMO 2025 Poster",
      description: "Scientific poster presented at ESMO 2025 highlighting OncoHRD sensitivity in breast cancer patient cohorts.",
      department: "Scientific",
      product: "oncohrd",
      cancerType: "Breast",
      biomarker: "HRD",
      contentType: "Publication",
      region: "Global",
      status: "Approved",
      year: "2025",
      version: "v1.0",
      author: "Dr. Amanda Ross",
      owner: "Scientific Team Leader",
      createdDate: "2025-05-18",
      updatedDate: "2025-05-18",
      sharePointUrl: "https://ocdipl.sharepoint.com/sites/1Cell.AiMarketingSite/Shared%20Documents/OncoHRD/OncoHRD_ESMO_Breast_Poster.pdf",
      folderPath: "Shared Documents/OncoHRD",
      size: "8.5 MB",
      downloadCount: 289,
      viewCount: 940,
      isPinned: false,
      isTrending: true
    },
    {
      id: "doc-013",
      title: "Global Corporate Profile Deck 2026",
      description: "Company overview presentation template for prospective partners and leadership keynote talks.",
      department: "Corporate",
      product: null,
      cancerType: "Pan Cancer",
      biomarker: null,
      contentType: "Presentation",
      region: "Global",
      status: "Approved",
      year: "2026",
      version: "v1.0",
      author: "CEO Office",
      owner: "Marketing Admin",
      createdDate: "2026-01-02",
      updatedDate: "2026-01-02",
      sharePointUrl: "https://ocdipl.sharepoint.com/sites/1Cell.AiMarketingSite/Shared%20Documents/Corporate/1Cell_Global_Corporate_Profile_2026.pptx",
      folderPath: "Shared Documents/Corporate",
      size: "15.4 MB",
      downloadCount: 305,
      viewCount: 1450,
      isPinned: true,
      isTrending: false
    },
    {
      id: "doc-014",
      title: "WhatsApp Creative - OncoMonitor Liquid Biopsy Launch India",
      description: "Social media creative optimized for WhatsApp broadcasting to regional oncologists introducing CFDNA surveillance.",
      department: "Marketing",
      product: "oncomonitor",
      cancerType: "Pan Cancer",
      biomarker: null,
      contentType: "WhatsApp Creative",
      region: "India",
      status: "Approved",
      year: "2025",
      version: "v1.0",
      author: "Design Lead",
      owner: "Marketing Admin",
      createdDate: "2025-04-01",
      updatedDate: "2025-04-01",
      sharePointUrl: "https://ocdipl.sharepoint.com/sites/1Cell.AiMarketingSite/Shared%20Documents/OncoMonitor/OncoMonitor_WhatsApp_Creative.png",
      folderPath: "Shared Documents/OncoMonitor",
      size: "1.1 MB",
      downloadCount: 142,
      viewCount: 520,
      isPinned: false,
      isTrending: false
    },
    {
      id: "doc-015",
      title: "OncoPredikt Draft Training Manual",
      description: "Internal draft training document detailing AI machine learning thresholds for sales teams' query readiness.",
      department: "Product",
      product: "oncopredikt",
      cancerType: "Colorectal",
      biomarker: null,
      contentType: "Playbook",
      region: "Global",
      status: "Draft",
      year: "2026",
      version: "v0.4-Draft",
      author: "AI Engineering Lead",
      owner: "Product Manager (OncoPredikt)",
      createdDate: "2026-05-10",
      updatedDate: "2026-06-15",
      sharePointUrl: "https://ocdipl.sharepoint.com/sites/1Cell.AiMarketingSite/Shared%20Documents/OncoPredikt/OncoPredikt_Training_Manual_v0.4.pdf",
      folderPath: "Shared Documents/OncoPredikt",
      size: "4.1 MB",
      downloadCount: 14,
      viewCount: 45,
      isPinned: false,
      isTrending: false
    },
    {
      id: "doc-016",
      title: "1Cell Corporate Video Intro (High Res)",
      description: "Promotional video introduction clip summarizing the laboratory core and genomic sequencing capabilities.",
      department: "Corporate",
      product: null,
      cancerType: "Pan Cancer",
      biomarker: null,
      contentType: "Video",
      region: "Global",
      status: "Approved",
      year: "2025",
      version: "v1.0",
      author: "Media Agency",
      owner: "Marketing Admin",
      createdDate: "2025-05-01",
      updatedDate: "2025-05-01",
      sharePointUrl: "https://ocdipl.sharepoint.com/sites/1Cell.AiMarketingSite/Shared%20Documents/Corporate/1Cell_Corporate_Intro.mp4",
      folderPath: "Shared Documents/Corporate",
      size: "42.0 MB",
      downloadCount: 201,
      viewCount: 1104,
      isPinned: false,
      isTrending: false
    }
  ],

  cases: [
    {
      id: "case-101",
      title: "Exceptional Response to PARP Inhibitor Guided by OncoHRD",
      doctor: "Dr. Nilesh Shah",
      hospital: "HCG Cancer Centre, Mumbai",
      cancerType: "Ovarian",
      biomarker: "HRD",
      summary: "A 54-year-old female diagnosed with high-grade serous ovarian cancer. Standard therapies yielded partial response. Genomic profiling using OncoHRD demonstrated high genomic instability score (GIS > 42).",
      treatment: "Initiated maintenance therapy with Olaparib (PARP Inhibitor) based on the OncoHRD positive profile.",
      outcome: "Achieved sustained complete molecular and radiological response for over 18 months, with tolerable side-effects.",
      relatedProduct: "oncohrd",
      presentationUrl: "https://ocdipl.sharepoint.com/sites/1Cell.AiMarketingSite/Shared%20Documents/Corporate/OncoHRD_Ovarian_Presentation.pptx",
      pdfUrl: "https://ocdipl.sharepoint.com/sites/1Cell.AiMarketingSite/Shared%20Documents/Medical/OncoHRD_Ovarian_CaseReport.pdf",
      supportingPublication: "OncoHRD Ovarian Cancer Clinical Evidence Paper"
    },
    {
      id: "case-102",
      title: "Targeted EGFR T790M Monitoring via Liquid Biopsy",
      doctor: "Dr. Amanda Ross",
      hospital: "MD Anderson Cancer Center, Houston",
      cancerType: "Lung",
      biomarker: "TMB",
      summary: "A 62-year-old male with EGFR-mutated non-small cell lung cancer under EGFR TKI therapy. Liquid biopsy was scheduled every 2 months.",
      treatment: "Liquid biopsy using OncoMonitor identified emerging low VAF EGFR T790M mutations (0.05% allele fraction) after 9 months.",
      outcome: "Therapy was preemptively switched to Osimertinib prior to systemic radiological relapse, resulting in durable progression-free survival.",
      relatedProduct: "oncomonitor",
      presentationUrl: "https://ocdipl.sharepoint.com/sites/1Cell.AiMarketingSite/Shared%20Documents/Corporate/OncoMonitor_Lung_T790M_Presentation.pptx",
      pdfUrl: "https://ocdipl.sharepoint.com/sites/1Cell.AiMarketingSite/Shared%20Documents/Medical/OncoMonitor_Lung_T790M_Report.pdf",
      supportingPublication: "OncoMonitor Liquid Biopsy Case Study - Lung Cancer Recurrence"
    }
  ],

  publications: [
    {
      id: "pub-201",
      title: "Validation of a Multimodal Genomic and Pathology Classifier for Precision Oncology",
      journal: "Journal of Clinical Oncology (JCO)",
      authors: "Dr. Vikram Seth, Dr. Amanda Ross, Sarah Jenkins, et al.",
      publishedDate: "2025-04-12",
      keywords: ["Multimodal", "Pathology", "NGS", "Immunotherapy", "TME"],
      abstract: "Comprehensive profiling of solid tumors typically relies on isolated DNA sequencing. In this study, we validate OncoIndx Multimodal, which integrates DNA NGS, whole-transcriptome RNA-seq, and digital pathology. Analyzing 1,200 solid tumors, the multimodal assay expanded therapeutic matching opportunities by 32% compared to genomic profiling alone, highlighting fusions, spatial microenvironment metrics, and transcriptomic predictive markers.",
      summary: "This validation paper outlines how OncoIndx outperforms traditional panels by integrating transcriptomics (RNA fusions, pathway signatures) with digital pathology fusions.",
      relatedProduct: "oncoindx",
      relatedCases: ["case-102"],
      supportingPptUrl: "https://ocdipl.sharepoint.com/sites/1Cell.AiMarketingSite/Shared%20Documents/Corporate/JCO_Multimodal_Presentation.pptx",
      downloadPdfUrl: "https://ocdipl.sharepoint.com/sites/1Cell.AiMarketingSite/Shared%20Documents/Medical/JCO_Multimodal_Validation.pdf",
      citation: "Seth V, Ross A, Jenkins S, et al. Validation of a Multimodal Genomic and Pathology Classifier. J Clin Oncol. 2025;43(11):1124-1135."
    },
    {
      id: "pub-202",
      title: "Homologous Recombination Deficiency (HRD) Scoring Model in Epithelial Ovarian Cancers",
      journal: "Gynecologic Oncology",
      authors: "Dr. Amanda Ross, Dr. Nilesh Shah, et al.",
      publishedDate: "2024-09-08",
      keywords: ["HRD", "BRCA", "Ovarian", "Genomic Scar", "PARP"],
      abstract: "Homologous Recombination Deficiency (HRD) status serves as a key biomarker for PARP inhibitors. We evaluated the analytical validity of the OncoHRD algorithm, combining Loss of Heterozygosity (LOH), Telomeric Allelic Imbalance (TAI), and Large-Scale State Transitions (LST). OncoHRD achieved high clinical concordance with commercial reference assays (98% sensitivity) while retaining analytical performance on samples with tumor purity as low as 15%.",
      summary: "Peer-reviewed scientific validation of the 1Cell OncoHRD algorithm scoring engine showing high robustness under low tumor purity conditions.",
      relatedProduct: "oncohrd",
      relatedCases: ["case-101"],
      supportingPptUrl: "https://ocdipl.sharepoint.com/sites/1Cell.AiMarketingSite/Shared%20Documents/Corporate/GyneOnc_HRD_Presentation.pptx",
      downloadPdfUrl: "https://ocdipl.sharepoint.com/sites/1Cell.AiMarketingSite/Shared%20Documents/Medical/GyneOnc_HRD_Validation.pdf",
      citation: "Ross A, Shah N, et al. Homologous Recombination Deficiency (HRD) Scoring Model in Epithelial Ovarian Cancers. Gynecol Oncol. 2024;174:45-52."
    }
  ],

  campaigns: [
    {
      id: "camp-301",
      name: "OncoIndx Multi-Omics Outreach Campaign",
      objective: "Drive clinician awareness of whole transcriptome fusions in lung/colorectal solid tumors.",
      audience: "Medical Oncologists & Pathologists (Global)",
      platform: "LinkedIn / Email",
      creativeUrl: "https://ocdipl.sharepoint.com/sites/1Cell.AiMarketingSite/Shared%20Documents/Corporate/OncoIndx_ESMO_Creative.png",
      openRate: "34.2%",
      ctr: "5.8%",
      conversions: 180,
      assetsUsed: ["doc-001", "doc-002", "doc-011"],
      status: "Active"
    },
    {
      id: "camp-302",
      name: "Liquid Biopsy Surveillance Campaign - India",
      objective: "Acquire patient volume for OncoMonitor MRD surveillance tests post-chemotherapy.",
      audience: "Surgical and Medical Oncologists in Tier-1 Metro Cities",
      platform: "WhatsApp / Email",
      creativeUrl: "https://ocdipl.sharepoint.com/sites/1Cell.AiMarketingSite/Shared%20Documents/Corporate/OncoMonitor_Launch_Creative.jpg",
      openRate: "48.5%",
      ctr: "8.2%",
      conversions: 245,
      assetsUsed: ["doc-007", "doc-014"],
      status: "Active"
    }
  ],

  videos: [
    {
      id: "vid-401",
      title: "OncoIndx Spatial Pathology Demo",
      product: "oncoindx",
      speaker: "Dr. Vikram Seth",
      cancerType: "Pan Cancer",
      duration: "4m 12s",
      type: "Product",
      videoUrl: "https://ocdipl.sharepoint.com/sites/1Cell.AiMarketingSite/Shared%20Documents/OncoIndx/OncoIndx_SpatialPathology_Demo.mp4"
    },
    {
      id: "vid-402",
      title: "HRD Scoring Clinical Webinar",
      product: "oncohrd",
      speaker: "Dr. Amanda Ross",
      cancerType: "Ovarian",
      duration: "45m 30s",
      type: "Webinar",
      videoUrl: "https://ocdipl.sharepoint.com/sites/1Cell.AiMarketingSite/Shared%20Documents/OncoHRD/HRD_Clinical_Webinar.mp4"
    },
    {
      id: "vid-403",
      title: "OncoMonitor MRD Detection Process Explainer",
      product: "oncomonitor",
      speaker: "Pooja Banerjee",
      cancerType: "Pan Cancer",
      duration: "5m 20s",
      type: "Explainer",
      videoUrl: "https://ocdipl.sharepoint.com/sites/1Cell.AiMarketingSite/Shared%20Documents/OncoMonitor/OncoMonitor_MRD_Explainer.mp4"
    }
  ],

  speakers: [
    {
      id: "spk-501",
      name: "Dr. Amanda Ross",
      hospital: "MD Anderson Cancer Center, Houston",
      specialization: "Gynecologic Oncology, Cancer Genomics",
      contact: "amanda.ross@1cell.ai",
      photo: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=300&h=300",
      publications: [
        "Homologous Recombination Deficiency (HRD) Scoring Model in Epithelial Ovarian Cancers",
        "Validation of a Multimodal Genomic and Pathology Classifier for Precision Oncology"
      ],
      videos: [
        "HRD Scoring Clinical Webinar"
      ],
      presentations: [
        "OncoHRD Breast Cancer Abstract - ESMO 2025 Poster"
      ],
      cases: [
        "Targeted EGFR T790M Monitoring via Liquid Biopsy"
      ]
    },
    {
      id: "spk-502",
      name: "Dr. Nilesh Shah",
      hospital: "HCG Cancer Centre, Mumbai",
      specialization: "Medical Oncologist, Immunotherapy Specialist",
      contact: "nilesh.shah@hcgoncology.com",
      photo: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=300&h=300",
      publications: [
        "Homologous Recombination Deficiency (HRD) Scoring Model in Epithelial Ovarian Cancers"
      ],
      videos: [],
      presentations: [
        "OncoIndx Clinical Utility Presentation"
      ],
      cases: [
        "Exceptional Response to PARP Inhibitor Guided by OncoHRD"
      ]
    },
    {
      id: "spk-503",
      name: "Dr. Vikram Seth",
      hospital: "Apollo Cancer Institute, New Delhi",
      specialization: "Clinical Pathologist & Computational Biology lead",
      contact: "vikram.seth@apollo.edu",
      photo: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=300&h=300",
      publications: [
        "Validation of a Multimodal Genomic and Pathology Classifier for Precision Oncology"
      ],
      videos: [
        "OncoIndx Spatial Pathology Demo"
      ],
      presentations: [
        "OncoTarget Hotspot NGS panel validation data sheet"
      ],
      cases: []
    }
  ],

  brandAssets: [
    {
      id: "brand-601",
      title: "1Cell.Ai Primary Corporate Logo (Vector SVG)",
      category: "Logos",
      fileType: "SVG",
      downloadUrl: "https://ocdipl.sharepoint.com/sites/1Cell.AiMarketingSite/Shared%20Documents/Corporate/1Cell_Primary_Logo.svg"
    },
    {
      id: "brand-602",
      title: "1Cell.Ai Corporate Brand Palette Cheat Sheet",
      category: "Brand Colors",
      fileType: "PDF",
      downloadUrl: "https://ocdipl.sharepoint.com/sites/1Cell.AiMarketingSite/Shared%20Documents/Corporate/1Cell_Color_Palette_2026.pdf"
    },
    {
      id: "brand-603",
      title: "Corporate PowerPoint Slides Template (16:9)",
      category: "PowerPoint Templates",
      fileType: "POTX",
      downloadUrl: "https://ocdipl.sharepoint.com/sites/1Cell.AiMarketingSite/Shared%20Documents/Corporate/1Cell_Corporate_SlideTemplate_v4.potx"
    },
    {
      id: "brand-604",
      title: "Executive Email Signature Signature Boilerplate",
      category: "Email Signatures",
      fileType: "HTML",
      downloadUrl: "https://ocdipl.sharepoint.com/sites/1Cell.AiMarketingSite/Shared%20Documents/Corporate/1Cell_EmailSignature_Template.html"
    }
  ],

  templates: [
    {
      id: "temp-701",
      title: "Standard Case Study Template",
      category: "Case",
      downloadUrl: "https://ocdipl.sharepoint.com/sites/1Cell.AiMarketingSite/Shared%20Documents/Corporate/1Cell_CaseStudy_BlankTemplate.docx"
    },
    {
      id: "temp-702",
      title: "Scientific Poster Layout (Landscape 4x3)",
      category: "Presentation",
      downloadUrl: "https://ocdipl.sharepoint.com/sites/1Cell.AiMarketingSite/Shared%20Documents/Corporate/1Cell_ScientificPoster_Layout.pptx"
    },
    {
      id: "temp-703",
      title: "Clinical Trial Abstract Word Document Outline",
      category: "Publication",
      downloadUrl: "https://ocdipl.sharepoint.com/sites/1Cell.AiMarketingSite/Shared%20Documents/Corporate/1Cell_PublicationAbstract_Outline.docx"
    },
    {
      id: "temp-704",
      title: "WhatsApp Creative Marketing Grid Template",
      category: "Creative",
      downloadUrl: "https://ocdipl.sharepoint.com/sites/1Cell.AiMarketingSite/Shared%20Documents/Corporate/WhatsApp_Campaign_Grid.psd"
    }
  ],

  analytics: {
    totalAssets: 48,
    assetsAddedThisMonth: 12,
    assetsByDepartment: {
      "Marketing": 14,
      "Medical": 12,
      "Product": 8,
      "Scientific": 10,
      "Sales": 4
    },
    assetsByProduct: {
      "oncoindx": 12,
      "oncohrd": 9,
      "oncomonitor": 8,
      "oncopredikt": 6,
      "oncorisk": 5,
      "oncotarget": 4,
      "primeplus": 3,
      "icore": 1
    },
    telemetry: {
      downloads: 1845,
      views: 7420,
      mostPopular: [
        { title: "1Cell.Ai Brand Guidelines Manual 2026", views: 2201, downloads: 512 },
        { title: "OncoHRD Ovarian Cancer Clinical Evidence Paper", views: 1540, downloads: 450 },
        { title: "OncoIndx Multimodal Product Brochure 2025", views: 1205, downloads: 342 }
      ],
      mostActiveContributors: [
        { name: "Sarah Jenkins", count: 18, department: "Marketing" },
        { name: "Dr. Amanda Ross", count: 14, department: "Medical" },
        { name: "Pooja Banerjee", count: 9, department: "Product" }
      ],
      mostSearchedKeywords: [
        "HRD guidelines", "OncoIndx brochures", "Breast cancer trials", "BRCA case studies", "Liquid biopsy pricing"
      ]
    }
  },

  quizzes: [
    {
      id: "quiz-001",
      title: "1Cell.Ai OncoIndx Assay Knowledge",
      description: "Evaluate your understanding of the multimodal OncoIndx assay, including detection mechanisms, biomarker integrations, and turnaround times.",
      questions: [
        {
          text: "What makes the OncoIndx assay uniquely 'multimodal' compared to standard panels?",
          options: [
            "It combines blood testing with saliva testing.",
            "It integrates DNA sequencing, whole-transcriptome RNA sequencing, and digital pathology features.",
            "It requires multiple tissue biopsies from different tumor sites.",
            "It uses both PCR and microfluidics on the same chip."
          ],
          correctIndex: 1,
          explanation: "OncoIndx is multimodal because it integrates genomic DNA variants, transcriptomic RNA fusions/signatures, and digital slide scanning path-features in a single classifier model."
        },
        {
          text: "What is the standard turnaround time (TAT) guarantee that ASMs should communicate for OncoIndx?",
          options: [
            "3 to 5 calendar days",
            "10 to 12 calendar days",
            "21 calendar days",
            "30 calendar days"
          ],
          correctIndex: 1,
          explanation: "1Cell.Ai guarantees a clinical turnaround time of 10 to 12 calendar days from tissue receipt in our Pune/Sunnyvale labs."
        },
        {
          text: "Which biomarker signature does OncoIndx measure via transcriptome RNA expression levels?",
          options: [
            "Homologous Recombination Deficiency (HRD)",
            "Tumor Mutational Burden (TMB)",
            "Micro-Satellite Instability (MSI) & immune infiltration signatures",
            "ALK receptor tyrosine kinase mutations"
          ],
          correctIndex: 2,
          explanation: "OncoIndx leverages RNA-seq data to quantify transcript expression levels mapping MSI and immune microenvironment signatures."
        },
        {
          text: "True or False: ASMs can promise that OncoIndx requires zero tissue sample and is fully liquid-biopsy based.",
          options: [
            "True - it is fully liquid biopsy.",
            "False - OncoIndx requires a formalin-fixed paraffin-embedded (FFPE) tissue slice.",
            "True - but only for breast cancer assays.",
            "False - it is based on hair follicle DNA."
          ],
          correctIndex: 1,
          explanation: "OncoIndx is a tissue-based solid tumor assay requiring a minimum tumor content FFPE block or slide slices, not a liquid biopsy."
        }
      ]
    },
    {
      id: "quiz-002",
      title: "Clinical Positioning & Competitor Battlecards",
      description: "Test your positioning competency when pitching to oncologists and handling objections regarding Guardant360 or FoundationOne.",
      questions: [
        {
          text: "How should an ASM position 1Cell.Ai's OncoRisk panel against Guardant360?",
          options: [
            "Highlight that OncoRisk is cheaper but takes twice as long.",
            "Explain that OncoRisk analyzes germline genetics + somatic mutation pathways for comprehensive inherited cancer tracking.",
            "Claim that Guardant360 does not test blood samples.",
            "Say that OncoRisk has FDA approval while Guardant360 does not."
          ],
          correctIndex: 1,
          explanation: "OncoRisk differs by assessing both hereditary germline susceptibility genes and somatic cancer-driving pathways simultaneously."
        },
        {
          text: "What is the primary clinical objection ASMs face regarding insurance coverage, and how is it addressed?",
          options: [
            "Insurance never pays; doctors must collect cash up front.",
            "Prior-authorizations are rejected; 1Cell.Ai provides a dedicated Payer Relations Appeals concierge to handle pre-auth appeals.",
            "Insurance covers everything; no patient forms are needed.",
            "1Cell.Ai has a partnership with government funds to make tests entirely free."
          ],
          correctIndex: 1,
          explanation: "Our concierge Payer Appeals team handles prior-authorizations and appeals, lowering patient out-of-pocket stress."
        },
        {
          text: "If a physician asks why they should order OncoHRD instead of a simple BRCA1/2 PCR test, what is the best pitch?",
          options: [
            "BRCA1/2 tests are outdated and shouldn't be used.",
            "OncoHRD provides a genomic scar score identifying PARP inhibitor benefit even in BRCA-wildtype ovarian cancers.",
            "OncoHRD is a faster test than PCR.",
            "OncoHRD is done entirely in the hospital clinic."
          ],
          correctIndex: 1,
          explanation: "OncoHRD goes beyond BRCA mutation testing by scoring genome-wide scars, identifying double the patients who benefit from PARP inhibitors."
        },
        {
          text: "Which argument represents the core value proposition of 1Cell.Ai's scientific approach?",
          options: [
            "We are the only company using AI in medical science.",
            "Democratizing precision oncology by merging genomics and pathologic data into actionable, affordable reports.",
            "We can cure 100% of solid tumor cancers.",
            "Our reports are the longest and have the most pages."
          ],
          correctIndex: 1,
          explanation: "1Cell.Ai's mission is to democratize precision oncology by making combined tissue multiomics actionable, accessible, and affordable."
        }
      ]
    }
  ],

  leaderboard: [
    { rank: 1, name: "Rajesh Kumar", points: 240, attempted: 6 },
    { rank: 2, name: "Sarah Jenkins", points: 200, attempted: 5 },
    { rank: 3, name: "Dr. Amanda Ross", points: 180, attempted: 4 },
    { rank: 4, name: "Devin Thorne", points: 140, attempted: 3 },
    { rank: 5, name: "Emily Chen", points: 100, attempted: 2 },
    { rank: 6, name: "Suresh Pillai", points: 80, attempted: 2 }
  ]
};
export default db;
