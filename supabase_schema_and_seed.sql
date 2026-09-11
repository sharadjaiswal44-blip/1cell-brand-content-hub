-- ============================================================================
-- 1Cell.Ai Content Hub - Centralized Supabase Database Schema & Initial Seed
-- Table: public.content_assets
-- ============================================================================

-- 1. Create content_assets table
create table if not exists public.content_assets (
  id text primary key,
  title text not null,
  description text,
  category text not null,
  department text not null,
  product_workspace text,
  content_type text not null,
  region text default 'Global',
  cancer_type text default 'None',
  biomarkers text default 'None',
  owner_author text,
  version text default 'v1.0',
  status text default 'Approved',
  target_team text default 'marketing',
  collaboration_scope text default 'all',
  sharepoint_url text not null,
  sharepoint_folder_path text,
  created_by text,
  created_by_email text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  is_deleted boolean default false not null,
  extra_metadata jsonb default '{}'::jsonb
);

-- 2. Create Performance Indexes for Search & Filter queries
create index if not exists idx_content_assets_status on public.content_assets(status);
create index if not exists idx_content_assets_department on public.content_assets(department);
create index if not exists idx_content_assets_category on public.content_assets(category);
create index if not exists idx_content_assets_content_type on public.content_assets(content_type);
create index if not exists idx_content_assets_cancer_type on public.content_assets(cancer_type);
create index if not exists idx_content_assets_target_team on public.content_assets(target_team);
create index if not exists idx_content_assets_collaboration_scope on public.content_assets(collaboration_scope);
create index if not exists idx_content_assets_created_at on public.content_assets(created_at desc);
create index if not exists idx_content_assets_is_deleted on public.content_assets(is_deleted);
create index if not exists idx_content_assets_sharepoint_url on public.content_assets(sharepoint_url);

-- 3. Enable Supabase Realtime for instant cross-user synchronization
do $$
begin
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'content_assets'
  ) then
    alter publication supabase_realtime add table public.content_assets;
  end if;
exception when others then
  null;
end $$;

-- 4. Enable Row Level Security (RLS) & Define Access Policies
alter table public.content_assets enable row level security;

-- Clean up existing policies if re-running
drop policy if exists "Allow read active assets" on public.content_assets;
drop policy if exists "Allow insert assets" on public.content_assets;
drop policy if exists "Allow update assets" on public.content_assets;
drop policy if exists "Allow delete assets" on public.content_assets;

-- Read policy: Anyone with the public/anon key can read non-deleted assets
create policy "Allow read active assets" on public.content_assets 
  for select using (is_deleted = false);

-- Insert policy: Authorized team members can register new content cards
create policy "Allow insert assets" on public.content_assets 
  for insert with check (title is not null and sharepoint_url is not null);

-- Update policy: Authorized team members can update metadata and soft-delete cards
create policy "Allow update assets" on public.content_assets 
  for update using (true);

-- Delete policy: Allows explicit deletion if needed (though soft-delete is preferred)
create policy "Allow delete assets" on public.content_assets 
  for delete using (true);

-- ============================================================================
-- 5. Seed Existing Content Hub Cards (31 Docs, 20 Cases, 21 Pubs, 6 Vids, 11 Reports)
-- ============================================================================

insert into public.content_assets (
  id, title, description, category, department, product_workspace, content_type,
  region, cancer_type, biomarkers, owner_author, version, status,
  target_team, collaboration_scope, sharepoint_url, sharepoint_folder_path,
  created_by, created_by_email, created_at, updated_at, is_deleted, extra_metadata
) values (
  'doc-016',
  'OncoPredikt® BRS Product Brochure',
  'Official comprehensive product brochure for OncoPredikt® BRS detailing testing methodology, clinical indications, breast cancer risk scoring, and workflow specifications.',
  'company-assets',
  'Marketing',
  'oncopredikt',
  'Brochure',
  'Global',
  'Breast Cancer',
  'HRD | BRCA1/2',
  '1Cell.Ai',
  'v2.0',
  'Approved',
  'marketing',
  'all',
  'https://ocdipl.sharepoint.com/sites/1Cell.AiMarketingSite/Shared%20Documents/1Cell.Ai%20Marketing/1Cell.Ai%20Content/OncoPrediKt/OncoPredikt%20BRS%20Product%20Brochure.pdf',
  'Shared Documents/1Cell.Ai Marketing/1Cell.Ai Content/OncoPrediKt',
  'Marketing Operations',
  'team@1cell.ai',
  '2026-02-15T00:00:00.000Z',
  '2026-09-07T00:00:00.000Z',
  FALSE,
  '{"size": "2.8 MB", "downloadCount": 142, "viewCount": 390, "isPinned": true, "isTrending": true, "year": "2026"}'::jsonb
) on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  sharepoint_url = excluded.sharepoint_url,
  updated_at = excluded.updated_at;

insert into public.content_assets (
  id, title, description, category, department, product_workspace, content_type,
  region, cancer_type, biomarkers, owner_author, version, status,
  target_team, collaboration_scope, sharepoint_url, sharepoint_folder_path,
  created_by, created_by_email, created_at, updated_at, is_deleted, extra_metadata
) values (
  'doc-017',
  'OncoPredikt® BRS Comparative Study',
  'Clinical comparative study validating OncoPredikt® BRS analytical accuracy and concordant risk stratification against standard global genomic profiling benchmarks.',
  'company-assets',
  'Scientific',
  'oncopredikt',
  'Whitepaper',
  'Global',
  'Breast Cancer',
  'HRD',
  '1Cell.Ai',
  'v1.1',
  'Approved',
  'scientific',
  'all',
  'https://ocdipl.sharepoint.com/sites/1Cell.AiMarketingSite/Shared%20Documents/1Cell.Ai%20Marketing/1Cell.Ai%20Content/OncoPrediKt/OncoPredikt%20BRS%20Comparative%20Study.pdf',
  'Shared Documents/1Cell.Ai Marketing/1Cell.Ai Content/OncoPrediKt',
  'R&D Translational Team',
  'team@1cell.ai',
  '2026-03-10T00:00:00.000Z',
  '2026-09-07T00:00:00.000Z',
  FALSE,
  '{"size": "3.2 MB", "downloadCount": 98, "viewCount": 265, "isPinned": false, "isTrending": false, "year": "2026"}'::jsonb
) on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  sharepoint_url = excluded.sharepoint_url,
  updated_at = excluded.updated_at;

insert into public.content_assets (
  id, title, description, category, department, product_workspace, content_type,
  region, cancer_type, biomarkers, owner_author, version, status,
  target_team, collaboration_scope, sharepoint_url, sharepoint_folder_path,
  created_by, created_by_email, created_at, updated_at, is_deleted, extra_metadata
) values (
  'doc-018',
  'OncoPredikt® BRS Retrospective Study',
  'Multi-cohort retrospective validation study of OncoPredikt® BRS assessing recurrence risk prediction, distant recurrence free interval (DRFI), and chemotherapy benefit guidance.',
  'company-assets',
  'Medical',
  'oncopredikt',
  'Case Study',
  'Global',
  'Breast Cancer',
  'BRCA1/2',
  '1Cell.Ai',
  'v1.2',
  'Approved',
  'scientific',
  'all',
  'https://ocdipl.sharepoint.com/sites/1Cell.AiMarketingSite/Shared%20Documents/1Cell.Ai%20Marketing/1Cell.Ai%20Content/OncoPrediKt/OncoPredikt%20BRS%20Retrospective%20Study.pdf',
  'Shared Documents/1Cell.Ai Marketing/1Cell.Ai Content/OncoPrediKt',
  'Medical Affairs',
  'team@1cell.ai',
  '2026-03-22T00:00:00.000Z',
  '2026-09-07T00:00:00.000Z',
  FALSE,
  '{"size": "3.7 MB", "downloadCount": 114, "viewCount": 310, "isPinned": false, "isTrending": false, "year": "2026"}'::jsonb
) on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  sharepoint_url = excluded.sharepoint_url,
  updated_at = excluded.updated_at;

insert into public.content_assets (
  id, title, description, category, department, product_workspace, content_type,
  region, cancer_type, biomarkers, owner_author, version, status,
  target_team, collaboration_scope, sharepoint_url, sharepoint_folder_path,
  created_by, created_by_email, created_at, updated_at, is_deleted, extra_metadata
) values (
  'doc-019',
  'OncoPredikt® SABCS 2025 Scientific Poster',
  'Official scientific conference poster presentation presented at the San Antonio Breast Cancer Symposium (SABCS) detailing OncoPredikt® prospective multi-center trial data.',
  'company-assets',
  'Scientific',
  'oncopredikt',
  'Presentation',
  'Global',
  'Breast Cancer',
  'HRD | BRCA1/2',
  '1Cell.Ai',
  'v1.0',
  'Approved',
  'scientific',
  'all',
  'https://ocdipl.sharepoint.com/sites/1Cell.AiMarketingSite/Shared%20Documents/1Cell.Ai%20Marketing/1Cell.Ai%20Content/OncoPrediKt/SABCS25_Posterr.pdf',
  'Shared Documents/1Cell.Ai Marketing/1Cell.Ai Content/OncoPrediKt',
  'Translational Science Team',
  'team@1cell.ai',
  '2025-12-10T00:00:00.000Z',
  '2026-09-07T00:00:00.000Z',
  FALSE,
  '{"size": "4.5 MB", "downloadCount": 168, "viewCount": 440, "isPinned": false, "isTrending": true, "year": "2025"}'::jsonb
) on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  sharepoint_url = excluded.sharepoint_url,
  updated_at = excluded.updated_at;

insert into public.content_assets (
  id, title, description, category, department, product_workspace, content_type,
  region, cancer_type, biomarkers, owner_author, version, status,
  target_team, collaboration_scope, sharepoint_url, sharepoint_folder_path,
  created_by, created_by_email, created_at, updated_at, is_deleted, extra_metadata
) values (
  'doc-031',
  'OncoIndx® Prime+ Clinical Case Study: Breast Cancer',
  'Tissue-Liquid-Normal matching clinical case study evaluating whole transcriptomic profiling (25,000 genes) and somatic vs. germline variant distinction in advanced breast carcinoma.',
  'company-assets',
  'Medical',
  'primeplus',
  'Case Study',
  'Global',
  'Breast Cancer',
  'HRD | BRCA1/2',
  '1Cell.Ai',
  'v1.0',
  'Approved',
  'scientific',
  'all',
  'https://ocdipl.sharepoint.com/sites/1Cell.AiMarketingSite/Shared%20Documents/1Cell.Ai%20Marketing/1Cell.Ai%20Content/OncoIndx%20Prime%20Plus/Breast%20Cancer',
  'Shared Documents/1Cell.Ai Marketing/1Cell.Ai Content/OncoIndx Prime Plus/Breast Cancer',
  'Medical Affairs',
  'team@1cell.ai',
  '2026-04-10T00:00:00.000Z',
  '2026-09-07T00:00:00.000Z',
  FALSE,
  '{"size": "2.4 MB", "downloadCount": 86, "viewCount": 235, "isPinned": false, "isTrending": false, "year": "2026"}'::jsonb
) on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  sharepoint_url = excluded.sharepoint_url,
  updated_at = excluded.updated_at;

insert into public.content_assets (
  id, title, description, category, department, product_workspace, content_type,
  region, cancer_type, biomarkers, owner_author, version, status,
  target_team, collaboration_scope, sharepoint_url, sharepoint_folder_path,
  created_by, created_by_email, created_at, updated_at, is_deleted, extra_metadata
) values (
  'doc-032',
  'OncoIndx® Prime+ Clinical Case Study: Pancreatic Cancer',
  'Multi-specimen genomic and transcriptomic profiling resolving driver mutations, actionable somatic targets, and therapy resistance pathways in advanced pancreatic carcinoma.',
  'company-assets',
  'Medical',
  'primeplus',
  'Case Study',
  'Global',
  'Pancreas Cancer',
  'KRAS | TP53',
  '1Cell.Ai',
  'v1.0',
  'Approved',
  'scientific',
  'all',
  'https://ocdipl.sharepoint.com/sites/1Cell.AiMarketingSite/Shared%20Documents/1Cell.Ai%20Marketing/1Cell.Ai%20Content/OncoIndx%20Prime%20Plus/Pancreatic%20Cancer',
  'Shared Documents/1Cell.Ai Marketing/1Cell.Ai Content/OncoIndx Prime Plus/Pancreatic Cancer',
  'Medical Affairs',
  'team@1cell.ai',
  '2026-04-12T00:00:00.000Z',
  '2026-09-07T00:00:00.000Z',
  FALSE,
  '{"size": "2.1 MB", "downloadCount": 74, "viewCount": 205, "isPinned": false, "isTrending": false, "year": "2026"}'::jsonb
) on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  sharepoint_url = excluded.sharepoint_url,
  updated_at = excluded.updated_at;

insert into public.content_assets (
  id, title, description, category, department, product_workspace, content_type,
  region, cancer_type, biomarkers, owner_author, version, status,
  target_team, collaboration_scope, sharepoint_url, sharepoint_folder_path,
  created_by, created_by_email, created_at, updated_at, is_deleted, extra_metadata
) values (
  'doc-033',
  'OncoIndx® Prime+ Clinical Case Study: Cancer of Unknown Primary (CUP)',
  'RNA-based Whole Transcriptomic Sequencing (WTS) for tissue-of-origin resolution and actionable therapeutic target identification in metastatic cancer of unknown primary.',
  'company-assets',
  'Medical',
  'primeplus',
  'Case Study',
  'Global',
  'Non specific Cancer',
  'DNA | TMB',
  '1Cell.Ai',
  'v1.0',
  'Approved',
  'scientific',
  'all',
  'https://ocdipl.sharepoint.com/sites/1Cell.AiMarketingSite/Shared%20Documents/1Cell.Ai%20Marketing/1Cell.Ai%20Content/OncoIndx%20Prime%20Plus/CUP',
  'Shared Documents/1Cell.Ai Marketing/1Cell.Ai Content/OncoIndx Prime Plus/CUP',
  'Medical Affairs',
  'team@1cell.ai',
  '2026-04-15T00:00:00.000Z',
  '2026-09-07T00:00:00.000Z',
  FALSE,
  '{"size": "2.6 MB", "downloadCount": 92, "viewCount": 250, "isPinned": false, "isTrending": false, "year": "2026"}'::jsonb
) on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  sharepoint_url = excluded.sharepoint_url,
  updated_at = excluded.updated_at;

insert into public.content_assets (
  id, title, description, category, department, product_workspace, content_type,
  region, cancer_type, biomarkers, owner_author, version, status,
  target_team, collaboration_scope, sharepoint_url, sharepoint_folder_path,
  created_by, created_by_email, created_at, updated_at, is_deleted, extra_metadata
) values (
  'doc-034',
  'OncoIndx® Prime+ Clinical Case Study: Dual Primary Bladder & Prostate',
  'Simultaneous tissue and liquid biopsy profiling deconvoluting synchronous primary malignancies and clonal lineage distinction in complex multi-organ cancer presentation.',
  'company-assets',
  'Medical',
  'primeplus',
  'Case Study',
  'Global',
  'Prostate Cancer',
  'DNA | TP53',
  '1Cell.Ai',
  'v1.0',
  'Approved',
  'scientific',
  'all',
  'https://ocdipl.sharepoint.com/sites/1Cell.AiMarketingSite/Shared%20Documents/1Cell.Ai%20Marketing/1Cell.Ai%20Content/OncoIndx%20Prime%20Plus/Bladder%20and%20Prostate%20dual',
  'Shared Documents/1Cell.Ai Marketing/1Cell.Ai Content/OncoIndx Prime Plus/Bladder and Prostate dual',
  'Medical Affairs',
  'team@1cell.ai',
  '2026-04-18T00:00:00.000Z',
  '2026-09-07T00:00:00.000Z',
  FALSE,
  '{"size": "2.3 MB", "downloadCount": 68, "viewCount": 195, "isPinned": false, "isTrending": false, "year": "2026"}'::jsonb
) on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  sharepoint_url = excluded.sharepoint_url,
  updated_at = excluded.updated_at;

insert into public.content_assets (
  id, title, description, category, department, product_workspace, content_type,
  region, cancer_type, biomarkers, owner_author, version, status,
  target_team, collaboration_scope, sharepoint_url, sharepoint_folder_path,
  created_by, created_by_email, created_at, updated_at, is_deleted, extra_metadata
) values (
  'doc-035',
  'OncoIndx® Prime+ Clinical Case Study: Dual Primary Lung & Bladder',
  'Deconvoluting synchronous pulmonary and urothelial carcinoma using matched blood, liquid biopsy, and tissue FFPE sequencing to guide sequential targeted therapies.',
  'company-assets',
  'Medical',
  'primeplus',
  'Case Study',
  'Global',
  'Lung Cancer',
  'EGFR',
  '1Cell.Ai',
  'v1.0',
  'Approved',
  'scientific',
  'all',
  'https://ocdipl.sharepoint.com/sites/1Cell.AiMarketingSite/Shared%20Documents/1Cell.Ai%20Marketing/1Cell.Ai%20Content/OncoIndx%20Prime%20Plus/Lung%20and%20Bladder%20dual',
  'Shared Documents/1Cell.Ai Marketing/1Cell.Ai Content/OncoIndx Prime Plus/Lung and Bladder dual',
  'Medical Affairs',
  'team@1cell.ai',
  '2026-04-20T00:00:00.000Z',
  '2026-09-07T00:00:00.000Z',
  FALSE,
  '{"size": "2.5 MB", "downloadCount": 77, "viewCount": 210, "isPinned": false, "isTrending": false, "year": "2026"}'::jsonb
) on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  sharepoint_url = excluded.sharepoint_url,
  updated_at = excluded.updated_at;

insert into public.content_assets (
  id, title, description, category, department, product_workspace, content_type,
  region, cancer_type, biomarkers, owner_author, version, status,
  target_team, collaboration_scope, sharepoint_url, sharepoint_folder_path,
  created_by, created_by_email, created_at, updated_at, is_deleted, extra_metadata
) values (
  'doc-036',
  'OncoIndx® Prime+ Clinical Case Study: Mesothelioma',
  'Comprehensive molecular and transcriptomic analysis in malignant pleural mesothelioma differentiating germline BAP1 variants from somatic loss to guide PARP and immunotherapy strategies.',
  'company-assets',
  'Medical',
  'primeplus',
  'Case Study',
  'Global',
  'Non specific Cancer',
  'DNA | TP53',
  '1Cell.Ai',
  'v1.0',
  'Approved',
  'scientific',
  'all',
  'https://ocdipl.sharepoint.com/sites/1Cell.AiMarketingSite/Shared%20Documents/1Cell.Ai%20Marketing/1Cell.Ai%20Content/OncoIndx%20Prime%20Plus/Mesothelioma',
  'Shared Documents/1Cell.Ai Marketing/1Cell.Ai Content/OncoIndx Prime Plus/Mesothelioma',
  'Medical Affairs',
  'team@1cell.ai',
  '2026-04-22T00:00:00.000Z',
  '2026-09-07T00:00:00.000Z',
  FALSE,
  '{"size": "2.2 MB", "downloadCount": 65, "viewCount": 180, "isPinned": false, "isTrending": false, "year": "2026"}'::jsonb
) on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  sharepoint_url = excluded.sharepoint_url,
  updated_at = excluded.updated_at;

insert into public.content_assets (
  id, title, description, category, department, product_workspace, content_type,
  region, cancer_type, biomarkers, owner_author, version, status,
  target_team, collaboration_scope, sharepoint_url, sharepoint_folder_path,
  created_by, created_by_email, created_at, updated_at, is_deleted, extra_metadata
) values (
  'doc-037',
  'OncoIndx® Prime+ Clinical Case Study: Sarcomas',
  'Whole transcriptomic fusion detection and tissue-liquid concordance in rare soft tissue and bone sarcoma cases resolving diagnostic classification and kinase inhibitor eligibility.',
  'company-assets',
  'Medical',
  'primeplus',
  'Case Study',
  'Global',
  'Non specific Cancer',
  'DNA',
  '1Cell.Ai',
  'v1.0',
  'Approved',
  'scientific',
  'all',
  'https://ocdipl.sharepoint.com/sites/1Cell.AiMarketingSite/Shared%20Documents/1Cell.Ai%20Marketing/1Cell.Ai%20Content/OncoIndx%20Prime%20Plus/Sarcomas',
  'Shared Documents/1Cell.Ai Marketing/1Cell.Ai Content/OncoIndx Prime Plus/Sarcomas',
  'Medical Affairs',
  'team@1cell.ai',
  '2026-04-25T00:00:00.000Z',
  '2026-09-07T00:00:00.000Z',
  FALSE,
  '{"size": "2.7 MB", "downloadCount": 81, "viewCount": 220, "isPinned": false, "isTrending": false, "year": "2026"}'::jsonb
) on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  sharepoint_url = excluded.sharepoint_url,
  updated_at = excluded.updated_at;

insert into public.content_assets (
  id, title, description, category, department, product_workspace, content_type,
  region, cancer_type, biomarkers, owner_author, version, status,
  target_team, collaboration_scope, sharepoint_url, sharepoint_folder_path,
  created_by, created_by_email, created_at, updated_at, is_deleted, extra_metadata
) values (
  'doc-038',
  'OncoIndx® Prime+ Clinical Case Study: Squamous Cell Carcinoma',
  'Genomic driver mapping, PD-L1 expression, and pathway signature profiling in metastatic squamous cell carcinoma identifying synergistic immunotherapeutic combinations.',
  'company-assets',
  'Medical',
  'primeplus',
  'Case Study',
  'Global',
  'Head & Neck Cancer',
  'TP53 | PDLI',
  '1Cell.Ai',
  'v1.0',
  'Approved',
  'scientific',
  'all',
  'https://ocdipl.sharepoint.com/sites/1Cell.AiMarketingSite/Shared%20Documents/1Cell.Ai%20Marketing/1Cell.Ai%20Content/OncoIndx%20Prime%20Plus/Squamous%20Cell%20Carcinoma',
  'Shared Documents/1Cell.Ai Marketing/1Cell.Ai Content/OncoIndx Prime Plus/Squamous Cell Carcinoma',
  'Medical Affairs',
  'team@1cell.ai',
  '2026-04-28T00:00:00.000Z',
  '2026-09-07T00:00:00.000Z',
  FALSE,
  '{"size": "2.4 MB", "downloadCount": 89, "viewCount": 240, "isPinned": false, "isTrending": false, "year": "2026"}'::jsonb
) on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  sharepoint_url = excluded.sharepoint_url,
  updated_at = excluded.updated_at;

insert into public.content_assets (
  id, title, description, category, department, product_workspace, content_type,
  region, cancer_type, biomarkers, owner_author, version, status,
  target_team, collaboration_scope, sharepoint_url, sharepoint_folder_path,
  created_by, created_by_email, created_at, updated_at, is_deleted, extra_metadata
) values (
  'doc-041',
  'OncoCTC® Product Brochure',
  'Official brochure detailing the OncoCTC® platform, circulating tumor cell enumeration, single-cell multi-omic profiling, and clinical indications.',
  'company-assets',
  'Marketing',
  'oncoctc',
  'Brochure',
  'Global',
  'Non specific Cancer',
  'CTC',
  '1Cell.Ai',
  'v2.0',
  'Approved',
  'marketing',
  'all',
  'https://ocdipl.sharepoint.com/sites/1Cell.AiMarketingSite/Shared%20Documents/1Cell.Ai%20Marketing/1Cell.Ai%20Content/OncoCTC/OncoCTC_Brochure.pdf',
  'Shared Documents/1Cell.Ai Marketing/1Cell.Ai Content/OncoCTC',
  'Marketing Operations',
  'team@1cell.ai',
  '2026-03-01T00:00:00.000Z',
  '2026-09-07T00:00:00.000Z',
  FALSE,
  '{"size": "2.8 MB", "downloadCount": 165, "viewCount": 420, "isPinned": true, "isTrending": true, "year": "2026"}'::jsonb
) on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  sharepoint_url = excluded.sharepoint_url,
  updated_at = excluded.updated_at;

insert into public.content_assets (
  id, title, description, category, department, product_workspace, content_type,
  region, cancer_type, biomarkers, owner_author, version, status,
  target_team, collaboration_scope, sharepoint_url, sharepoint_folder_path,
  created_by, created_by_email, created_at, updated_at, is_deleted, extra_metadata
) values (
  'doc-042',
  'OncoCTC® Clinical Case Study: Early Resistance Detection',
  'Clinical case study demonstrating high-sensitivity identification of actionable DNA repair mutations and therapy resistance via live CTC genomics.',
  'company-assets',
  'Medical',
  'oncoctc',
  'Case Study',
  'Global',
  'Non specific Cancer',
  'HRD | CTC',
  '1Cell.Ai',
  'v1.2',
  'Approved',
  'scientific',
  'all',
  'https://ocdipl.sharepoint.com/sites/1Cell.AiMarketingSite/Shared%20Documents/1Cell.Ai%20Marketing/1Cell.Ai%20Content/OncoCTC/OncoCTC_CaseStudy.pdf',
  'Shared Documents/1Cell.Ai Marketing/1Cell.Ai Content/OncoCTC',
  'Medical Affairs',
  'team@1cell.ai',
  '2026-03-10T00:00:00.000Z',
  '2026-09-07T00:00:00.000Z',
  FALSE,
  '{"size": "2.1 MB", "downloadCount": 110, "viewCount": 295, "isPinned": false, "isTrending": false, "year": "2026"}'::jsonb
) on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  sharepoint_url = excluded.sharepoint_url,
  updated_at = excluded.updated_at;

insert into public.content_assets (
  id, title, description, category, department, product_workspace, content_type,
  region, cancer_type, biomarkers, owner_author, version, status,
  target_team, collaboration_scope, sharepoint_url, sharepoint_folder_path,
  created_by, created_by_email, created_at, updated_at, is_deleted, extra_metadata
) values (
  'doc-043',
  'OncoCTC® Technical Whitepaper: High-Purity Live CTC Capture',
  'Scientific whitepaper detailing zero-leukocyte background microfluidic capture, analytical validation, and multi-omic concordance across 5,000+ patients.',
  'company-assets',
  'Scientific',
  'oncoctc',
  'Whitepaper',
  'Global',
  'Non specific Cancer',
  'CTC',
  '1Cell.Ai',
  'v1.0',
  'Approved',
  'scientific',
  'all',
  'https://ocdipl.sharepoint.com/sites/1Cell.AiMarketingSite/Shared%20Documents/1Cell.Ai%20Marketing/1Cell.Ai%20Content/OncoCTC/OncoCTC_Whitepaper.pdf',
  'Shared Documents/1Cell.Ai Marketing/1Cell.Ai Content/OncoCTC',
  'R&D Translational Team',
  'team@1cell.ai',
  '2026-02-18T00:00:00.000Z',
  '2026-09-07T00:00:00.000Z',
  FALSE,
  '{"size": "3.4 MB", "downloadCount": 215, "viewCount": 540, "isPinned": false, "isTrending": false, "year": "2026"}'::jsonb
) on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  sharepoint_url = excluded.sharepoint_url,
  updated_at = excluded.updated_at;

insert into public.content_assets (
  id, title, description, category, department, product_workspace, content_type,
  region, cancer_type, biomarkers, owner_author, version, status,
  target_team, collaboration_scope, sharepoint_url, sharepoint_folder_path,
  created_by, created_by_email, created_at, updated_at, is_deleted, extra_metadata
) values (
  'doc-044',
  'OncoCTC® Competitor Battlecard vs. CellSearch & ctDNA',
  'Comprehensive sales battlecard highlighting OncoCTC advantages over CellSearch®, Parsortix®, and standard ctDNA fragmentomics assays.',
  'company-assets',
  'Sales',
  'oncoctc',
  'Battlecard',
  'Global',
  'Non specific Cancer',
  'CTC',
  '1Cell.Ai',
  'v2.1',
  'Approved',
  'marketing',
  'all',
  'https://ocdipl.sharepoint.com/sites/1Cell.AiMarketingSite/Shared%20Documents/1Cell.Ai%20Marketing/1Cell.Ai%20Content/OncoCTC/OncoCTC_Battlecard.pdf',
  'Shared Documents/1Cell.Ai Marketing/1Cell.Ai Content/OncoCTC',
  'Commercial Enablement',
  'team@1cell.ai',
  '2026-04-05T00:00:00.000Z',
  '2026-09-07T00:00:00.000Z',
  FALSE,
  '{"size": "1.7 MB", "downloadCount": 380, "viewCount": 810, "isPinned": false, "isTrending": false, "year": "2026"}'::jsonb
) on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  sharepoint_url = excluded.sharepoint_url,
  updated_at = excluded.updated_at;

insert into public.content_assets (
  id, title, description, category, department, product_workspace, content_type,
  region, cancer_type, biomarkers, owner_author, version, status,
  target_team, collaboration_scope, sharepoint_url, sharepoint_folder_path,
  created_by, created_by_email, created_at, updated_at, is_deleted, extra_metadata
) values (
  'doc-045',
  'OncoCTC® Product Details & Presentation',
  'Comprehensive presentation deck detailing OncoCTC single-cell multi-omic methodology, clinical indications, and turnaround protocols.',
  'company-assets',
  'Marketing',
  'oncoctc',
  'Presentation',
  'Global',
  'Non specific Cancer',
  'CTC',
  '1Cell.Ai',
  'v1.3',
  'Approved',
  'marketing',
  'all',
  'https://ocdipl.sharepoint.com/sites/1Cell.AiMarketingSite/Shared%20Documents/1Cell.Ai%20Marketing/1Cell.Ai%20Content/OncoCTC/OncoCTC_ProductDetails.pdf',
  'Shared Documents/1Cell.Ai Marketing/1Cell.Ai Content/OncoCTC',
  'Brand Operations',
  'team@1cell.ai',
  '2026-03-25T00:00:00.000Z',
  '2026-09-07T00:00:00.000Z',
  FALSE,
  '{"size": "4.8 MB", "downloadCount": 190, "viewCount": 470, "isPinned": false, "isTrending": false, "year": "2026"}'::jsonb
) on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  sharepoint_url = excluded.sharepoint_url,
  updated_at = excluded.updated_at;

insert into public.content_assets (
  id, title, description, category, department, product_workspace, content_type,
  region, cancer_type, biomarkers, owner_author, version, status,
  target_team, collaboration_scope, sharepoint_url, sharepoint_folder_path,
  created_by, created_by_email, created_at, updated_at, is_deleted, extra_metadata
) values (
  'doc-046',
  'OncoAlibrex® Product Brochure',
  'Official brochure detailing OncoAlibrex® real-time therapy monitoring, longitudinal molecular assessment, clinical indications, and antigen-independent monitoring.',
  'company-assets',
  'Marketing',
  'oncoalibrex',
  'Brochure',
  'Global',
  'Colorectal Cancer',
  'Longitudinal Molecular Monitoring | Real-Time Response',
  '1Cell.Ai',
  'v1.0',
  'Approved',
  'marketing',
  'all',
  'https://ocdipl.sharepoint.com/sites/1Cell.AiMarketingSite/Shared%20Documents/1Cell.Ai%20Marketing/1Cell.Ai%20Content/OncoAlibrex/OncoAlibrex%20Brochure.pdf',
  'Shared Documents/1Cell.Ai Marketing/1Cell.Ai Content/OncoAlibrex',
  'Marketing Operations',
  'team@1cell.ai',
  '2026-04-10T00:00:00.000Z',
  '2026-09-07T00:00:00.000Z',
  FALSE,
  '{"size": "2.5 MB", "downloadCount": 95, "viewCount": 280, "isPinned": false, "isTrending": false, "year": "2026"}'::jsonb
) on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  sharepoint_url = excluded.sharepoint_url,
  updated_at = excluded.updated_at;

insert into public.content_assets (
  id, title, description, category, department, product_workspace, content_type,
  region, cancer_type, biomarkers, owner_author, version, status,
  target_team, collaboration_scope, sharepoint_url, sharepoint_folder_path,
  created_by, created_by_email, created_at, updated_at, is_deleted, extra_metadata
) values (
  'doc-047',
  'OncoAlibrex® Stage IV Colorectal Cancer Case Study',
  'Clinical case study demonstrating longitudinal molecular monitoring with OncoAlibrex® during FOLFOX therapy in a Stage IV colorectal cancer patient without CEA expression.',
  'company-assets',
  'Medical',
  'oncoalibrex',
  'Case Study',
  'Global',
  'Colorectal Cancer',
  'KRAS | TP53',
  '1Cell.Ai',
  'v1.0',
  'Approved',
  'scientific',
  'all',
  'https://ocdipl.sharepoint.com/sites/1Cell.AiMarketingSite/Shared%20Documents/1Cell.Ai%20Marketing/1Cell.Ai%20Content/OncoAlibrex/OncoAlibrex%20Stage%20IV%20Colorectal%20Cancer%20Case%20study.pdf',
  'Shared Documents/1Cell.Ai Marketing/1Cell.Ai Content/OncoAlibrex',
  'Medical Affairs',
  'team@1cell.ai',
  '2026-04-15T00:00:00.000Z',
  '2026-09-07T00:00:00.000Z',
  FALSE,
  '{"size": "2.1 MB", "downloadCount": 78, "viewCount": 215, "isPinned": false, "isTrending": false, "year": "2026"}'::jsonb
) on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  sharepoint_url = excluded.sharepoint_url,
  updated_at = excluded.updated_at;

insert into public.content_assets (
  id, title, description, category, department, product_workspace, content_type,
  region, cancer_type, biomarkers, owner_author, version, status,
  target_team, collaboration_scope, sharepoint_url, sharepoint_folder_path,
  created_by, created_by_email, created_at, updated_at, is_deleted, extra_metadata
) values (
  'doc-048',
  'OncoAlibrex® Technical Whitepaper: Real-Time Therapy Monitoring',
  'Scientific whitepaper detailing the methodology, analytical sensitivity, and clinical escalation utility of longitudinal molecular tracking.',
  'company-assets',
  'Scientific',
  'oncoalibrex',
  'Whitepaper',
  'Global',
  'Colorectal Cancer',
  'DNA | ctDNA',
  '1Cell.Ai',
  'v1.0',
  'Approved',
  'scientific',
  'all',
  'https://ocdipl.sharepoint.com/sites/1Cell.AiMarketingSite/Shared%20Documents/1Cell.Ai%20Marketing/1Cell.Ai%20Content/OncoAlibrex/OncoAlibrex%20WhitePaper.pdf',
  'Shared Documents/1Cell.Ai Marketing/1Cell.Ai Content/OncoAlibrex',
  'R&D Translational Team',
  'team@1cell.ai',
  '2026-04-20T00:00:00.000Z',
  '2026-09-07T00:00:00.000Z',
  FALSE,
  '{"size": "3.1 MB", "downloadCount": 65, "viewCount": 190, "isPinned": false, "isTrending": false, "year": "2026"}'::jsonb
) on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  sharepoint_url = excluded.sharepoint_url,
  updated_at = excluded.updated_at;

insert into public.content_assets (
  id, title, description, category, department, product_workspace, content_type,
  region, cancer_type, biomarkers, owner_author, version, status,
  target_team, collaboration_scope, sharepoint_url, sharepoint_folder_path,
  created_by, created_by_email, created_at, updated_at, is_deleted, extra_metadata
) values (
  'doc-051',
  'OncoIncytes® Product Brochure',
  'Official comprehensive brochure detailing OncoIncytes® dual single-cell CTC multi-omics paired with cell-free ctDNA from a single blood tube to uncover emergent therapy resistance and clonal heterogeneity.',
  'company-assets',
  'Marketing',
  'oncoincytes',
  'Brochure',
  'Global',
  'Lung Cancer',
  'CTC | ctDNA | EGFR',
  '1Cell.Ai',
  'v1.0',
  'Approved',
  'marketing',
  'all',
  'https://ocdipl.sharepoint.com/sites/1Cell.AiMarketingSite/Shared%20Documents/1Cell.Ai%20Marketing/1Cell.Ai%20Content/OncoIncytes/OncoIncytes%20brochure.pdf',
  'Shared Documents/1Cell.Ai Marketing/1Cell.Ai Content/OncoIncytes',
  'Marketing Operations',
  'team@1cell.ai',
  '2026-05-01T00:00:00.000Z',
  '2026-09-07T00:00:00.000Z',
  FALSE,
  '{"size": "3.5 MB", "downloadCount": 175, "viewCount": 460, "isPinned": true, "isTrending": true, "year": "2026"}'::jsonb
) on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  sharepoint_url = excluded.sharepoint_url,
  updated_at = excluded.updated_at;

insert into public.content_assets (
  id, title, description, category, department, product_workspace, content_type,
  region, cancer_type, biomarkers, owner_author, version, status,
  target_team, collaboration_scope, sharepoint_url, sharepoint_folder_path,
  created_by, created_by_email, created_at, updated_at, is_deleted, extra_metadata
) values (
  'doc-052',
  'OncoIncytes® Technical Whitepaper: Multi-Omic Clonal Resolution',
  'Scientific whitepaper detailing technical validation, single-cell NGS concordance, and bypass pathway mutation discovery of the OncoIncytes multi-modal liquid biopsy platform.',
  'company-assets',
  'Scientific',
  'oncoincytes',
  'Whitepaper',
  'Global',
  'Lung Cancer',
  'CTC | ctDNA | EGFR | ERBB2',
  '1Cell.Ai',
  'v1.0',
  'Approved',
  'scientific',
  'all',
  'https://ocdipl.sharepoint.com/sites/1Cell.AiMarketingSite/Shared%20Documents/1Cell.Ai%20Marketing/1Cell.Ai%20Content/OncoIncytes/OncoIncytes%20Whitepaper.pdf',
  'Shared Documents/1Cell.Ai Marketing/1Cell.Ai Content/OncoIncytes',
  'Translational Science R&D',
  'team@1cell.ai',
  '2026-05-15T00:00:00.000Z',
  '2026-09-07T00:00:00.000Z',
  FALSE,
  '{"size": "4.1 MB", "downloadCount": 130, "viewCount": 350, "isPinned": false, "isTrending": false, "year": "2026"}'::jsonb
) on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  sharepoint_url = excluded.sharepoint_url,
  updated_at = excluded.updated_at;

insert into public.content_assets (
  id, title, description, category, department, product_workspace, content_type,
  region, cancer_type, biomarkers, owner_author, version, status,
  target_team, collaboration_scope, sharepoint_url, sharepoint_folder_path,
  created_by, created_by_email, created_at, updated_at, is_deleted, extra_metadata
) values (
  'doc-053',
  'OncoIncytes® Clinical Case Study (ASCO 2026)',
  'Landmark clinical case study presented at ASCO 2026 demonstrating how matched CTC + ctDNA profiling identified baseline EGFR bypass mutations predicting reduced progression-free survival in advanced NSCLC.',
  'company-assets',
  'Medical',
  'oncoincytes',
  'Case Study',
  'Global',
  'Lung Cancer',
  'EGFR | CTC | ctDNA',
  '1Cell.Ai',
  'v2.0',
  'Approved',
  'scientific',
  'all',
  'https://ocdipl.sharepoint.com/sites/1Cell.AiMarketingSite/Shared%20Documents/1Cell.Ai%20Marketing/1Cell.Ai%20Content/OncoIncytes/OncoIncytes%20Case%20Study%20ASCO%202026_V2.pdf',
  'Shared Documents/1Cell.Ai Marketing/1Cell.Ai Content/OncoIncytes',
  'Medical Affairs',
  'team@1cell.ai',
  '2026-06-02T00:00:00.000Z',
  '2026-09-07T00:00:00.000Z',
  FALSE,
  '{"size": "2.9 MB", "downloadCount": 220, "viewCount": 580, "isPinned": true, "isTrending": true, "year": "2026"}'::jsonb
) on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  sharepoint_url = excluded.sharepoint_url,
  updated_at = excluded.updated_at;

insert into public.content_assets (
  id, title, description, category, department, product_workspace, content_type,
  region, cancer_type, biomarkers, owner_author, version, status,
  target_team, collaboration_scope, sharepoint_url, sharepoint_folder_path,
  created_by, created_by_email, created_at, updated_at, is_deleted, extra_metadata
) values (
  'doc-054',
  'OncoIncytes® Platform Video Overview',
  'High-definition scientific and commercial walkthrough video explaining the microfluidic workflow, single-cell multi-omic profiling, and clinical benefits of the OncoIncytes platform.',
  'company-assets',
  'Sales',
  'oncoincytes',
  'Sales Enablement',
  'Global',
  'Non specific Cancer',
  'CTC | ctDNA',
  '1Cell.Ai',
  'v1.0',
  'Approved',
  'marketing',
  'all',
  'https://ocdipl.sharepoint.com/sites/1Cell.AiMarketingSite/Shared%20Documents/1Cell.Ai%20Marketing/1Cell.Ai%20Content/OncoIncytes/OncoIncytes%20Video.mp4',
  'Shared Documents/1Cell.Ai Marketing/1Cell.Ai Content/OncoIncytes',
  'Commercial Operations',
  'team@1cell.ai',
  '2026-06-15T00:00:00.000Z',
  '2026-09-07T00:00:00.000Z',
  FALSE,
  '{"size": "18.5 MB", "downloadCount": 195, "viewCount": 510, "isPinned": false, "isTrending": false, "year": "2026"}'::jsonb
) on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  sharepoint_url = excluded.sharepoint_url,
  updated_at = excluded.updated_at;

insert into public.content_assets (
  id, title, description, category, department, product_workspace, content_type,
  region, cancer_type, biomarkers, owner_author, version, status,
  target_team, collaboration_scope, sharepoint_url, sharepoint_folder_path,
  created_by, created_by_email, created_at, updated_at, is_deleted, extra_metadata
) values (
  'case-001',
  'Tissue Genomic Profiling in a Case of Endometrioid Adenocarcinoma of the Endometrium',
  'Hysterectomy findings and clinical sequencing matching treatment protocols.',
  'case-library',
  'Medical',
  'oncoindx',
  'Case Study',
  'Global',
  'Endometrial Cancer',
  'MSI-High',
  'Dr. Sandhay Iyer',
  'v1.0',
  'Approved',
  'scientific',
  'all',
  'https://1cell.ai/tissue-genomic-profiling-in-a-case-of-endometrioid-adenocarcinoma-of-the-endometrium/',
  'Clinical Cases/Endometrial Cancer',
  'Dr. Sandhay Iyer',
  'medical@1cell.ai',
  '2026-01-01T00:00:00.000Z',
  '2026-09-08T09:52:43.442Z',
  FALSE,
  '{"hospital": "1Cell.Ai Clinical Laboratory", "outcome": "Target Identified"}'::jsonb
) on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  sharepoint_url = excluded.sharepoint_url,
  updated_at = excluded.updated_at;

insert into public.content_assets (
  id, title, description, category, department, product_workspace, content_type,
  region, cancer_type, biomarkers, owner_author, version, status,
  target_team, collaboration_scope, sharepoint_url, sharepoint_folder_path,
  created_by, created_by_email, created_at, updated_at, is_deleted, extra_metadata
) values (
  'case-002',
  'High-Risk Endometrial Carcinosarcoma in a Heavily Pretreated Breast Cancer Survivor: Molecular Insights Guiding Targeted Strategies',
  'A 74-year-old female patient diagnosed with metastatic endometrioid carcinoma molecular risk reclassification.',
  'case-library',
  'Medical',
  'oncoindx',
  'Case Study',
  'Global',
  'Carcinosarcoma',
  'HRD',
  'Dr. Aarti Ramesh',
  'v1.0',
  'Approved',
  'scientific',
  'all',
  'https://1cell.ai/high-risk-endometrial-carcinosarcoma-in-a-heavily-pretreated-breast-cancer-survivor-molecular-insights-guiding-targeted-strategies/',
  'Clinical Cases/Carcinosarcoma',
  'Dr. Aarti Ramesh',
  'medical@1cell.ai',
  '2026-01-01T00:00:00.000Z',
  '2026-09-08T09:52:43.442Z',
  FALSE,
  '{"hospital": "Tata Memorial Centre", "outcome": "Guided Therapy"}'::jsonb
) on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  sharepoint_url = excluded.sharepoint_url,
  updated_at = excluded.updated_at;

insert into public.content_assets (
  id, title, description, category, department, product_workspace, content_type,
  region, cancer_type, biomarkers, owner_author, version, status,
  target_team, collaboration_scope, sharepoint_url, sharepoint_folder_path,
  created_by, created_by_email, created_at, updated_at, is_deleted, extra_metadata
) values (
  'case-003',
  'Comprehensive Tissue Genomic Profiling Reveals ALK-EML4 Fusion and TP53 Splice-Site Mutation in Metastatic Lung Adenocarcinoma',
  'Identifying Osimertinib sensitivity mutations in solid tumor samples.',
  'case-library',
  'Medical',
  'oncotarget',
  'Case Study',
  'Global',
  'Lung Adenocarcinoma',
  'ALK-EML4',
  'Dr. Sandhay Iyer',
  'v1.0',
  'Approved',
  'scientific',
  'all',
  'https://1cell.ai/comprehensive-tissue-genomic-profiling-reveals-alk-eml4-fusionand-tp53-splice-site-mutation-in-metastatic-lung-adenocarcinoma-2/',
  'Clinical Cases/Lung Adenocarcinoma',
  'Dr. Sandhay Iyer',
  'medical@1cell.ai',
  '2026-01-01T00:00:00.000Z',
  '2026-09-08T09:52:43.442Z',
  FALSE,
  '{"hospital": "1Cell.Ai Clinical Laboratory", "outcome": "Target Identified"}'::jsonb
) on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  sharepoint_url = excluded.sharepoint_url,
  updated_at = excluded.updated_at;

insert into public.content_assets (
  id, title, description, category, department, product_workspace, content_type,
  region, cancer_type, biomarkers, owner_author, version, status,
  target_team, collaboration_scope, sharepoint_url, sharepoint_folder_path,
  created_by, created_by_email, created_at, updated_at, is_deleted, extra_metadata
) values (
  'case-004',
  'Liquid Biopsy Reveals ERBB3-PIK3CA Activation and MYC Amplification Driving Resistance in Metastatic Cervical Cancer',
  'A 50-year-old female patient with poorly differentiated squamous cell carcinoma of the cervix.',
  'case-library',
  'Medical',
  'oncomonitor',
  'Case Study',
  'Global',
  'Cervical Cancer',
  'PIK3CA',
  'Medical Oncology Board',
  'v1.0',
  'Approved',
  'scientific',
  'all',
  'https://1cell.ai/liquid-biopsy-reveals-erbb3-pik3ca-activation-and-myc-amplification-driving-resistance-in-metastatic-cervical-cancer/',
  'Clinical Cases/Cervical Cancer',
  'Medical Oncology Board',
  'medical@1cell.ai',
  '2026-01-01T00:00:00.000Z',
  '2026-09-08T09:52:43.442Z',
  FALSE,
  '{"hospital": "1Cell.Ai Clinical Laboratory", "outcome": "Resistance Detected"}'::jsonb
) on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  sharepoint_url = excluded.sharepoint_url,
  updated_at = excluded.updated_at;

insert into public.content_assets (
  id, title, description, category, department, product_workspace, content_type,
  region, cancer_type, biomarkers, owner_author, version, status,
  target_team, collaboration_scope, sharepoint_url, sharepoint_folder_path,
  created_by, created_by_email, created_at, updated_at, is_deleted, extra_metadata
) values (
  'case-005',
  'Comprehensive Liquid Biopsy Profiling Reveals Dual PIK3CA and ESR1 Mutations in Hormone Receptor–Positive Metastatic Breast Carcinoma',
  '73-year-old female patient with invasive ductal carcinoma (IDC) and endocrine therapy resistance markers.',
  'case-library',
  'Medical',
  'oncomonitor',
  'Case Study',
  'Global',
  'Breast Carcinoma',
  'ESR1',
  'Dr. Aarti Ramesh',
  'v1.0',
  'Approved',
  'scientific',
  'all',
  'https://1cell.ai/comprehensive-liquid-biopsy-profiling-reveals-dual-pik3ca-and-esr1-mutations-in-hormone-receptor-positive-metastatic-breast-carcinoma-2/',
  'Clinical Cases/Breast Carcinoma',
  'Dr. Aarti Ramesh',
  'medical@1cell.ai',
  '2026-01-01T00:00:00.000Z',
  '2026-09-08T09:52:43.442Z',
  FALSE,
  '{"hospital": "Tata Memorial Centre", "outcome": "Guided Therapy"}'::jsonb
) on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  sharepoint_url = excluded.sharepoint_url,
  updated_at = excluded.updated_at;

insert into public.content_assets (
  id, title, description, category, department, product_workspace, content_type,
  region, cancer_type, biomarkers, owner_author, version, status,
  target_team, collaboration_scope, sharepoint_url, sharepoint_folder_path,
  created_by, created_by_email, created_at, updated_at, is_deleted, extra_metadata
) values (
  'case-006',
  'Molecular Drivers of Tumorigenesis and Metastasis in Squamous Cell Lung Carcinoma',
  '50-year-old male with scapular metastases profiling molecular drivers.',
  'case-library',
  'Medical',
  'oncoindx',
  'Case Study',
  'Global',
  'Squamous Lung Carcinoma',
  'TP53',
  'Dr. Sandhay Iyer',
  'v1.0',
  'Approved',
  'scientific',
  'all',
  'https://1cell.ai/molecular-drivers-of-tumorigenesis-and-metastasis-in-squamous-cell-lung-carcinoma/',
  'Clinical Cases/Squamous Lung Carcinoma',
  'Dr. Sandhay Iyer',
  'medical@1cell.ai',
  '2026-01-01T00:00:00.000Z',
  '2026-09-08T09:52:43.442Z',
  FALSE,
  '{"hospital": "1Cell.Ai Clinical Laboratory", "outcome": "Target Identified"}'::jsonb
) on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  sharepoint_url = excluded.sharepoint_url,
  updated_at = excluded.updated_at;

insert into public.content_assets (
  id, title, description, category, department, product_workspace, content_type,
  region, cancer_type, biomarkers, owner_author, version, status,
  target_team, collaboration_scope, sharepoint_url, sharepoint_folder_path,
  created_by, created_by_email, created_at, updated_at, is_deleted, extra_metadata
) values (
  'case-007',
  'A Tale of Two Primaries: Hepatocellular and Pancreatic Carcinomas Integrating Tissue and Liquid Biopsy Insights',
  'De-convoluting dual primary signals using matched tissue and blood sequencing.',
  'case-library',
  'Medical',
  'oncoindx',
  'Case Study',
  'Global',
  'Dual Primaries',
  'KRAS',
  'Dr. Sandhay Iyer',
  'v1.0',
  'Approved',
  'scientific',
  'all',
  'https://1cell.ai/a-tale-of-two-primaries-hepatocellular-and-pancreatic-carcinomas-integrating-tissue-and-liquid-biopsy-insights/',
  'Clinical Cases/Dual Primaries',
  'Dr. Sandhay Iyer',
  'medical@1cell.ai',
  '2026-01-01T00:00:00.000Z',
  '2026-09-08T09:52:43.442Z',
  FALSE,
  '{"hospital": "1Cell.Ai Clinical Laboratory", "outcome": "Target Identified"}'::jsonb
) on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  sharepoint_url = excluded.sharepoint_url,
  updated_at = excluded.updated_at;

insert into public.content_assets (
  id, title, description, category, department, product_workspace, content_type,
  region, cancer_type, biomarkers, owner_author, version, status,
  target_team, collaboration_scope, sharepoint_url, sharepoint_folder_path,
  created_by, created_by_email, created_at, updated_at, is_deleted, extra_metadata
) values (
  'case-008',
  'From Fragmented Results to Precision Care: An Endometrial Cancer Case Study',
  'Resolving diagnostic ambiguity in postmenopausal bleeding cases.',
  'case-library',
  'Medical',
  'oncoindx',
  'Case Study',
  'Global',
  'Endometrial Cancer',
  'MSI-High',
  'Dr. Aarti Ramesh',
  'v1.0',
  'Approved',
  'scientific',
  'all',
  'https://1cell.ai/from-fragmented-results-to-precision-carean-endometrial-cancer-case-study/',
  'Clinical Cases/Endometrial Cancer',
  'Dr. Aarti Ramesh',
  'medical@1cell.ai',
  '2026-01-01T00:00:00.000Z',
  '2026-09-08T09:52:43.442Z',
  FALSE,
  '{"hospital": "Tata Memorial Centre", "outcome": "Guided Therapy"}'::jsonb
) on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  sharepoint_url = excluded.sharepoint_url,
  updated_at = excluded.updated_at;

insert into public.content_assets (
  id, title, description, category, department, product_workspace, content_type,
  region, cancer_type, biomarkers, owner_author, version, status,
  target_team, collaboration_scope, sharepoint_url, sharepoint_folder_path,
  created_by, created_by_email, created_at, updated_at, is_deleted, extra_metadata
) values (
  'case-009',
  'Circulating Tumor Cell (CTC) Analysis Identifies Actionable DNA Repair Deficiency in Advanced NSCLC Undetected by ctDNA',
  '67-year-old male with Stage IV NSCLC resolving DNA repair deficiency variants.',
  'case-library',
  'Medical',
  'oncoctc',
  'Case Study',
  'Global',
  'Advanced NSCLC',
  'DNA Repair',
  'Dr. Gowhar Shafi',
  'v1.0',
  'Approved',
  'scientific',
  'all',
  'https://1cell.ai/circulating-tumor-cell-ctc-analysis-identifies-actionable-dna-repair-deficiency-in-advanced-nsclc-undetected-by-ctdna/',
  'Clinical Cases/Advanced NSCLC',
  'Dr. Gowhar Shafi',
  'medical@1cell.ai',
  '2026-01-01T00:00:00.000Z',
  '2026-09-08T09:52:43.442Z',
  FALSE,
  '{"hospital": "1Cell.Ai R&D Division", "outcome": "Target Identified"}'::jsonb
) on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  sharepoint_url = excluded.sharepoint_url,
  updated_at = excluded.updated_at;

insert into public.content_assets (
  id, title, description, category, department, product_workspace, content_type,
  region, cancer_type, biomarkers, owner_author, version, status,
  target_team, collaboration_scope, sharepoint_url, sharepoint_folder_path,
  created_by, created_by_email, created_at, updated_at, is_deleted, extra_metadata
) values (
  'case-010',
  'Rare or Uncommon Cancers: Where tissue-specific guidelines are limited and broad genomic insight is critical',
  '66-year-old male with chronic hepatitis B and rare presentation of tumor biology.',
  'case-library',
  'Medical',
  'oncoindx',
  'Case Study',
  'Global',
  'Rare Hepatocellular Carcinoma',
  'CGP',
  'Dr. Aarti Ramesh',
  'v1.0',
  'Approved',
  'scientific',
  'all',
  'https://1cell.ai/rare-or-uncommon-cancers-where-tissue-specific-guidelines-are-limited-and-broad-genomic-insight-is-critical/',
  'Clinical Cases/Rare Hepatocellular Carcinoma',
  'Dr. Aarti Ramesh',
  'medical@1cell.ai',
  '2026-01-01T00:00:00.000Z',
  '2026-09-08T09:52:43.442Z',
  FALSE,
  '{"hospital": "Tata Memorial Centre", "outcome": "Guided Therapy"}'::jsonb
) on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  sharepoint_url = excluded.sharepoint_url,
  updated_at = excluded.updated_at;

insert into public.content_assets (
  id, title, description, category, department, product_workspace, content_type,
  region, cancer_type, biomarkers, owner_author, version, status,
  target_team, collaboration_scope, sharepoint_url, sharepoint_folder_path,
  created_by, created_by_email, created_at, updated_at, is_deleted, extra_metadata
) values (
  'case-011',
  'Uncovering Tumor Evolution in Multi-Treated Breast Cancer Using Liquid Biopsy and Longitudinal NGS',
  '52-year-old pre-menopausal woman tracking somatic mutation updates.',
  'case-library',
  'Medical',
  'oncomonitor',
  'Case Study',
  'Global',
  'Breast Cancer',
  'Longitudinal',
  'Dr. Sandhay Iyer',
  'v1.0',
  'Approved',
  'scientific',
  'all',
  'https://1cell.ai/uncovering-tumor-evolution-in-multi-treated-breast-cancer-using-liquid-biopsy-and-longitudinal-ngs/',
  'Clinical Cases/Breast Cancer',
  'Dr. Sandhay Iyer',
  'medical@1cell.ai',
  '2026-01-01T00:00:00.000Z',
  '2026-09-08T09:52:43.442Z',
  FALSE,
  '{"hospital": "1Cell.Ai Clinical Laboratory", "outcome": "Target Identified"}'::jsonb
) on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  sharepoint_url = excluded.sharepoint_url,
  updated_at = excluded.updated_at;

insert into public.content_assets (
  id, title, description, category, department, product_workspace, content_type,
  region, cancer_type, biomarkers, owner_author, version, status,
  target_team, collaboration_scope, sharepoint_url, sharepoint_folder_path,
  created_by, created_by_email, created_at, updated_at, is_deleted, extra_metadata
) values (
  'case-012',
  'Genomic Profiling of Rapidly Dedifferentiating MSI-High Endometrial Carcinoma',
  '64-year-old female Grade 3 Endometrioid adenocarcinoma response monitoring.',
  'case-library',
  'Medical',
  'oncoindx',
  'Case Study',
  'Global',
  'MSI-High Endometrial Carcinoma',
  'MSI-High',
  'Dr. Aarti Ramesh',
  'v1.0',
  'Approved',
  'scientific',
  'all',
  'https://1cell.ai/genomic-profiling-of-rapidly-dedifferentiating-msi-highendometrial-carcinoma/',
  'Clinical Cases/MSI-High Endometrial Carcinoma',
  'Dr. Aarti Ramesh',
  'medical@1cell.ai',
  '2026-01-01T00:00:00.000Z',
  '2026-09-08T09:52:43.442Z',
  FALSE,
  '{"hospital": "Tata Memorial Centre", "outcome": "Guided Therapy"}'::jsonb
) on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  sharepoint_url = excluded.sharepoint_url,
  updated_at = excluded.updated_at;

insert into public.content_assets (
  id, title, description, category, department, product_workspace, content_type,
  region, cancer_type, biomarkers, owner_author, version, status,
  target_team, collaboration_scope, sharepoint_url, sharepoint_folder_path,
  created_by, created_by_email, created_at, updated_at, is_deleted, extra_metadata
) values (
  'case-013',
  'Multi-Omics Insights Driving Personalized Therapy in Breast Cancer',
  '55-year-old female neoadjuvant therapy response profiling.',
  'case-library',
  'Medical',
  'oncoindx',
  'Case Study',
  'Global',
  'Personalized Breast Cancer',
  'Multi-Omics',
  'Dr. Sandhay Iyer',
  'v1.0',
  'Approved',
  'scientific',
  'all',
  'https://1cell.ai/multi-omics-insights-driving-personalized-therapy-in-breast-cancer/',
  'Clinical Cases/Personalized Breast Cancer',
  'Dr. Sandhay Iyer',
  'medical@1cell.ai',
  '2026-01-01T00:00:00.000Z',
  '2026-09-08T09:52:43.442Z',
  FALSE,
  '{"hospital": "1Cell.Ai Clinical Laboratory", "outcome": "Target Identified"}'::jsonb
) on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  sharepoint_url = excluded.sharepoint_url,
  updated_at = excluded.updated_at;

insert into public.content_assets (
  id, title, description, category, department, product_workspace, content_type,
  region, cancer_type, biomarkers, owner_author, version, status,
  target_team, collaboration_scope, sharepoint_url, sharepoint_folder_path,
  created_by, created_by_email, created_at, updated_at, is_deleted, extra_metadata
) values (
  'case-014',
  'Molecular Risk Reclassification in Stage II Endometrial Carcinoma - When Biology Redefines Prognosis',
  '64-year-old female patient high-grade molecular reclassification.',
  'case-library',
  'Medical',
  'oncoindx',
  'Case Study',
  'Global',
  'Stage II Endometrial Carcinoma',
  'WHO Risk',
  'Dr. Aarti Ramesh',
  'v1.0',
  'Approved',
  'scientific',
  'all',
  'https://1cell.ai/molecular-risk-reclassification-in-stage-ii-endometrialcarcinoma-when-biology-redefines-prognosis/',
  'Clinical Cases/Stage II Endometrial Carcinoma',
  'Dr. Aarti Ramesh',
  'medical@1cell.ai',
  '2026-01-01T00:00:00.000Z',
  '2026-09-08T09:52:43.442Z',
  FALSE,
  '{"hospital": "Tata Memorial Centre", "outcome": "Guided Therapy"}'::jsonb
) on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  sharepoint_url = excluded.sharepoint_url,
  updated_at = excluded.updated_at;

insert into public.content_assets (
  id, title, description, category, department, product_workspace, content_type,
  region, cancer_type, biomarkers, owner_author, version, status,
  target_team, collaboration_scope, sharepoint_url, sharepoint_folder_path,
  created_by, created_by_email, created_at, updated_at, is_deleted, extra_metadata
) values (
  'case-015',
  'Metastatic Prostate Adenocarcinoma with TMPRSS2-ERG Fusion and MSI-High Immunogenic Profile',
  '70-year-old male with Gleason 9 prostate carcinoma immunotherapy response.',
  'case-library',
  'Medical',
  'oncoindx',
  'Case Study',
  'Global',
  'Metastatic Prostate Adenocarcinoma',
  'MSI-High',
  'Dr. Sandhay Iyer',
  'v1.0',
  'Approved',
  'scientific',
  'all',
  'https://1cell.ai/metastatic-prostate-adenocarcinoma-withtmprss2-erg-fusion-and-msi-high-immunogenic-profile/',
  'Clinical Cases/Metastatic Prostate Adenocarcinoma',
  'Dr. Sandhay Iyer',
  'medical@1cell.ai',
  '2026-01-01T00:00:00.000Z',
  '2026-09-08T09:52:43.442Z',
  FALSE,
  '{"hospital": "1Cell.Ai Clinical Laboratory", "outcome": "Target Identified"}'::jsonb
) on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  sharepoint_url = excluded.sharepoint_url,
  updated_at = excluded.updated_at;

insert into public.content_assets (
  id, title, description, category, department, product_workspace, content_type,
  region, cancer_type, biomarkers, owner_author, version, status,
  target_team, collaboration_scope, sharepoint_url, sharepoint_folder_path,
  created_by, created_by_email, created_at, updated_at, is_deleted, extra_metadata
) values (
  'case-016',
  'From Genomics to Therapy: A Precision Medicine Approach in Advanced Endometrial Cancer',
  'Hysterectomy genomic profiles guiding target selections.',
  'case-library',
  'Medical',
  'oncoindx',
  'Case Study',
  'Global',
  'Advanced Endometrial Cancer',
  'CGP',
  'Dr. Aarti Ramesh',
  'v1.0',
  'Approved',
  'scientific',
  'all',
  'https://1cell.ai/from-genomics-to-therapy-a-precision-medicine-approachin-advanced-endometrial-cancer/',
  'Clinical Cases/Advanced Endometrial Cancer',
  'Dr. Aarti Ramesh',
  'medical@1cell.ai',
  '2026-01-01T00:00:00.000Z',
  '2026-09-08T09:52:43.442Z',
  FALSE,
  '{"hospital": "Tata Memorial Centre", "outcome": "Guided Therapy"}'::jsonb
) on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  sharepoint_url = excluded.sharepoint_url,
  updated_at = excluded.updated_at;

insert into public.content_assets (
  id, title, description, category, department, product_workspace, content_type,
  region, cancer_type, biomarkers, owner_author, version, status,
  target_team, collaboration_scope, sharepoint_url, sharepoint_folder_path,
  created_by, created_by_email, created_at, updated_at, is_deleted, extra_metadata
) values (
  'case-017',
  'Concurrent Tissue–Liquid–Normal Matched Multi-Omics Analysis Enables Precision Targeting in Advanced Lung Cancer',
  'Matching solid biopsy genomic alterations to cell-free DNA signals.',
  'case-library',
  'Medical',
  'oncomonitor',
  'Case Study',
  'Global',
  'Advanced Lung Cancer',
  'Multi-Omics',
  'Dr. Gowhar Shafi',
  'v1.0',
  'Approved',
  'scientific',
  'all',
  'https://1cell.ai/case-study-05-lung-cancer-2/',
  'Clinical Cases/Advanced Lung Cancer',
  'Dr. Gowhar Shafi',
  'medical@1cell.ai',
  '2026-01-01T00:00:00.000Z',
  '2026-09-08T09:52:43.442Z',
  FALSE,
  '{"hospital": "1Cell.Ai R&D Division", "outcome": "Target Identified"}'::jsonb
) on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  sharepoint_url = excluded.sharepoint_url,
  updated_at = excluded.updated_at;

insert into public.content_assets (
  id, title, description, category, department, product_workspace, content_type,
  region, cancer_type, biomarkers, owner_author, version, status,
  target_team, collaboration_scope, sharepoint_url, sharepoint_folder_path,
  created_by, created_by_email, created_at, updated_at, is_deleted, extra_metadata
) values (
  'case-018',
  'Therapy resistance detected in colorectal cancer by single circulating tumor cell genomics',
  'Tracing therapy-resistance markers in CTCs missed by plasma DNA assays.',
  'case-library',
  'Medical',
  'oncoctc',
  'Case Study',
  'Global',
  'Therapy Resistant Colorectal Cancer',
  'CTC Genomics',
  'Dr. Aarti Ramesh',
  'v1.0',
  'Approved',
  'scientific',
  'all',
  'https://1cell.ai/therapy-resistance-detected-in-colorectal-cancer-by-single-circulating-tumor-cell-genomics/',
  'Clinical Cases/Therapy Resistant Colorectal Cancer',
  'Dr. Aarti Ramesh',
  'medical@1cell.ai',
  '2026-01-01T00:00:00.000Z',
  '2026-09-08T09:52:43.442Z',
  FALSE,
  '{"hospital": "Tata Memorial Centre", "outcome": "Guided Therapy"}'::jsonb
) on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  sharepoint_url = excluded.sharepoint_url,
  updated_at = excluded.updated_at;

insert into public.content_assets (
  id, title, description, category, department, product_workspace, content_type,
  region, cancer_type, biomarkers, owner_author, version, status,
  target_team, collaboration_scope, sharepoint_url, sharepoint_folder_path,
  created_by, created_by_email, created_at, updated_at, is_deleted, extra_metadata
) values (
  'case-019',
  'Single-Cell Genomics Reveals Resistance Signatures in Colorectal Cancer',
  'Abstract presentation on single circulating tumor cell genomics.',
  'case-library',
  'Medical',
  'oncoctc',
  'Case Study',
  'Global',
  'Metastatic Colorectal Cancer',
  'Single-Cell',
  'Dr. Gowhar Shafi',
  'v1.0',
  'Approved',
  'scientific',
  'all',
  'https://1cell.ai/single-cell-genomics-reveals-resistance-signatures-in-colorectal-cancer-2/',
  'Clinical Cases/Metastatic Colorectal Cancer',
  'Dr. Gowhar Shafi',
  'medical@1cell.ai',
  '2026-01-01T00:00:00.000Z',
  '2026-09-08T09:52:43.442Z',
  FALSE,
  '{"hospital": "1Cell.Ai R&D Division", "outcome": "Target Identified"}'::jsonb
) on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  sharepoint_url = excluded.sharepoint_url,
  updated_at = excluded.updated_at;

insert into public.content_assets (
  id, title, description, category, department, product_workspace, content_type,
  region, cancer_type, biomarkers, owner_author, version, status,
  target_team, collaboration_scope, sharepoint_url, sharepoint_folder_path,
  created_by, created_by_email, created_at, updated_at, is_deleted, extra_metadata
) values (
  'case-020',
  'Stage IV Colorectal Cancer — CEA-Negative Longitudinal Molecular Monitoring During FOLFOX',
  'A 65-year-old male with Stage IV colorectal cancer and liver/lung metastases who did not express CEA. OncoAlibrex provided antigen-independent longitudinal molecular monitoring during FOLFOX chemotherapy with an established escalation pathway to add cetuximab on progression.',
  'case-library',
  'Medical',
  'oncoalibrex',
  'Case Study',
  'Global',
  'Colorectal Cancer',
  'KRAS WT | CEA-Negative | Real-Time Monitoring',
  'Dr. Sandhay Iyer & Clinical Oncology Board',
  'v1.0',
  'Approved',
  'scientific',
  'all',
  'https://1cell.ai/oncoalibrex-colorectal-cancer-longitudinal-molecular-monitoring/',
  'Clinical Cases/Colorectal Cancer',
  'Dr. Sandhay Iyer & Clinical Oncology Board',
  'medical@1cell.ai',
  '2026-01-01T00:00:00.000Z',
  '2026-09-08T09:52:43.442Z',
  FALSE,
  '{"hospital": "1Cell.Ai Clinical Genomics Laboratory", "outcome": "Progression Tracked & Escalation Defined"}'::jsonb
) on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  sharepoint_url = excluded.sharepoint_url,
  updated_at = excluded.updated_at;

insert into public.content_assets (
  id, title, description, category, department, product_workspace, content_type,
  region, cancer_type, biomarkers, owner_author, version, status,
  target_team, collaboration_scope, sharepoint_url, sharepoint_folder_path,
  created_by, created_by_email, created_at, updated_at, is_deleted, extra_metadata
) values (
  'pub-001',
  'Potential of urine liquid biopsy in detecting of clinically relevant genomic alterations in advanced genitourinary cancers',
  'Detecting genitourinary biomarkers from non-invasive urine samples as a surrogate for plasma assays.',
  'publications',
  'Scientific',
  'oncomonitor',
  'Publication',
  'Global',
  'Solid Tumor',
  'None',
  'Khandare et al.',
  'v1.0',
  'Approved',
  'scientific',
  'all',
  'https://1cell.ai/potential-of-urine-liquid-biopsy-in-detecting-of-clinically-relevant-genomic-alterations-in-advanced-genitourinary-cancers/',
  'Publications/Journal of Liquid Biopsy',
  'Khandare et al.',
  'scientific@1cell.ai',
  '2026-01-01T00:00:00.000Z',
  '2026-09-08T09:52:43.443Z',
  FALSE,
  '{"journal": "Journal of Liquid Biopsy"}'::jsonb
) on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  sharepoint_url = excluded.sharepoint_url,
  updated_at = excluded.updated_at;

insert into public.content_assets (
  id, title, description, category, department, product_workspace, content_type,
  region, cancer_type, biomarkers, owner_author, version, status,
  target_team, collaboration_scope, sharepoint_url, sharepoint_folder_path,
  created_by, created_by_email, created_at, updated_at, is_deleted, extra_metadata
) values (
  'pub-002',
  'Single-Cell Circulating Tumor Cell Genomics Reveals KRAS-Independent Oncogenic Sub-Populations and Longitudinal Clonal Evolution in Metastatic Pancreatic Adenocarcinoma',
  'Elucidating tumor heterogeneity and treatment resistance pathways using single circulating cells.',
  'publications',
  'Scientific',
  'oncoctc',
  'Publication',
  'Global',
  'Solid Tumor',
  'None',
  'Shafi et al.',
  'v1.0',
  'Approved',
  'scientific',
  'all',
  'https://1cell.ai/single-cell-circulating-tumor-cell-genomics-reveals-kras-independent-oncogenic-sub-populations-and-longitudinal-clonal-evolution-in-metastatic-pancreatic-adenocarcinoma/',
  'Publications/Translational Oncology',
  'Shafi et al.',
  'scientific@1cell.ai',
  '2026-01-01T00:00:00.000Z',
  '2026-09-08T09:52:43.443Z',
  FALSE,
  '{"journal": "Translational Oncology"}'::jsonb
) on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  sharepoint_url = excluded.sharepoint_url,
  updated_at = excluded.updated_at;

insert into public.content_assets (
  id, title, description, category, department, product_workspace, content_type,
  region, cancer_type, biomarkers, owner_author, version, status,
  target_team, collaboration_scope, sharepoint_url, sharepoint_folder_path,
  created_by, created_by_email, created_at, updated_at, is_deleted, extra_metadata
) values (
  'pub-003',
  'Analytical Validation and Clinical Implementation of a 1080-Gene Comprehensive Genomic Profiling Assay with Integrated Cloud-Based Analysis for Solid Tumor Molecular Oncology',
  'Validating clinical accuracy and pipeline throughput of a comprehensive 1080-gene profiling test.',
  'publications',
  'Scientific',
  'oncoindx',
  'Publication',
  'Global',
  'Solid Tumor',
  'None',
  'Uttarwar et al.',
  'v1.0',
  'Approved',
  'scientific',
  'all',
  'https://1cell.ai/analytical-validation-and-clinical-implementation-of-a-1080-gene-comprehensive-genomic-profiling-assay-with-integrated-cloud-based-analysis-for-solid-tumor-molecular-oncology/',
  'Publications/Molecular Cancer Diagnostics',
  'Uttarwar et al.',
  'scientific@1cell.ai',
  '2026-01-01T00:00:00.000Z',
  '2026-09-08T09:52:43.443Z',
  FALSE,
  '{"journal": "Molecular Cancer Diagnostics"}'::jsonb
) on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  sharepoint_url = excluded.sharepoint_url,
  updated_at = excluded.updated_at;

insert into public.content_assets (
  id, title, description, category, department, product_workspace, content_type,
  region, cancer_type, biomarkers, owner_author, version, status,
  target_team, collaboration_scope, sharepoint_url, sharepoint_folder_path,
  created_by, created_by_email, created_at, updated_at, is_deleted, extra_metadata
) values (
  'pub-004',
  'OncoPredikt: A Deep-Learning Framework for Tumor Detection and Biomarker Quantification in Breast Cancer IHC Whole-Slide Images',
  'Deep learning models classifying whole-slide pathology images to predict biomarker boundaries.',
  'publications',
  'Scientific',
  'oncopredikt',
  'Publication',
  'Global',
  'Solid Tumor',
  'None',
  'Dr. Gowhar Shafi et al.',
  'v1.0',
  'Approved',
  'scientific',
  'all',
  'https://1cell.ai/abstract-78-9-aacr-annual-meeting-2026/',
  'Publications/AACR Annual Meeting',
  'Dr. Gowhar Shafi et al.',
  'scientific@1cell.ai',
  '2026-01-01T00:00:00.000Z',
  '2026-09-08T09:52:43.443Z',
  FALSE,
  '{"journal": "AACR Annual Meeting"}'::jsonb
) on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  sharepoint_url = excluded.sharepoint_url,
  updated_at = excluded.updated_at;

insert into public.content_assets (
  id, title, description, category, department, product_workspace, content_type,
  region, cancer_type, biomarkers, owner_author, version, status,
  target_team, collaboration_scope, sharepoint_url, sharepoint_folder_path,
  created_by, created_by_email, created_at, updated_at, is_deleted, extra_metadata
) values (
  'pub-005',
  'Precision Profiling of TP53 Alterations in Advanced Cancers: Real-World Evidence Linking Mutation Class to Genomic Instability and Co-occurring Actionable Drivers',
  'Real-world study connecting TP53 mutation classes to wider genomic instability profiles.',
  'publications',
  'Scientific',
  'oncoindx',
  'Publication',
  'Global',
  'Solid Tumor',
  'None',
  'Shafi et al.',
  'v1.0',
  'Approved',
  'scientific',
  'all',
  'https://1cell.ai/abstract-lb118-5-aacr-annual-meeting-2026/',
  'Publications/AACR Annual Meeting',
  'Shafi et al.',
  'scientific@1cell.ai',
  '2026-01-01T00:00:00.000Z',
  '2026-09-08T09:52:43.443Z',
  FALSE,
  '{"journal": "AACR Annual Meeting"}'::jsonb
) on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  sharepoint_url = excluded.sharepoint_url,
  updated_at = excluded.updated_at;

insert into public.content_assets (
  id, title, description, category, department, product_workspace, content_type,
  region, cancer_type, biomarkers, owner_author, version, status,
  target_team, collaboration_scope, sharepoint_url, sharepoint_folder_path,
  created_by, created_by_email, created_at, updated_at, is_deleted, extra_metadata
) values (
  'pub-006',
  'MIRAGE: A ctDNA Methylation-Driven Computational Algorithm Designed for Sensitive Detection of Minimal Residual Disease',
  'A cell-free DNA methylation trace algorithm improving sensitivity limits of post-surgery MRD assays.',
  'publications',
  'Scientific',
  'oncomonitor',
  'Publication',
  'Global',
  'Solid Tumor',
  'None',
  'Informatics Panel',
  'v1.0',
  'Approved',
  'scientific',
  'all',
  'https://1cell.ai/mirage-a-ctdna-methylation-driven-computational-algorithm/',
  'Publications/AACR Annual Meeting',
  'Informatics Panel',
  'scientific@1cell.ai',
  '2026-01-01T00:00:00.000Z',
  '2026-09-08T09:52:43.443Z',
  FALSE,
  '{"journal": "AACR Annual Meeting"}'::jsonb
) on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  sharepoint_url = excluded.sharepoint_url,
  updated_at = excluded.updated_at;

insert into public.content_assets (
  id, title, description, category, department, product_workspace, content_type,
  region, cancer_type, biomarkers, owner_author, version, status,
  target_team, collaboration_scope, sharepoint_url, sharepoint_folder_path,
  created_by, created_by_email, created_at, updated_at, is_deleted, extra_metadata
) values (
  'pub-007',
  'Enhancing Variant Interpretation Through Multi-Database and Systematic Variant Classification: Reducing Uncertainty in Clinical Genomics',
  'Using aggregated variant classifiers to resolve variant of uncertain significance (VUS) statuses.',
  'publications',
  'Scientific',
  'icore',
  'Publication',
  'Global',
  'Solid Tumor',
  'None',
  'Clinical Curation Board',
  'v1.0',
  'Approved',
  'scientific',
  'all',
  'https://1cell.ai/abstract-6272-2-aacr-annual-meeting-2026/',
  'Publications/AACR Annual Meeting',
  'Clinical Curation Board',
  'scientific@1cell.ai',
  '2026-01-01T00:00:00.000Z',
  '2026-09-08T09:52:43.443Z',
  FALSE,
  '{"journal": "AACR Annual Meeting"}'::jsonb
) on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  sharepoint_url = excluded.sharepoint_url,
  updated_at = excluded.updated_at;

insert into public.content_assets (
  id, title, description, category, department, product_workspace, content_type,
  region, cancer_type, biomarkers, owner_author, version, status,
  target_team, collaboration_scope, sharepoint_url, sharepoint_folder_path,
  created_by, created_by_email, created_at, updated_at, is_deleted, extra_metadata
) values (
  'pub-008',
  'Integrative Genomic Analysis Reveals Pharmacogenomic Determinants of Chemotherapy Response',
  'Tracking host pharmacogenomic alleles to predict toxicities and drug clearance dynamics.',
  'publications',
  'Scientific',
  'icore',
  'Publication',
  'Global',
  'Solid Tumor',
  'None',
  'Genomic Informatics Team',
  'v1.0',
  'Approved',
  'scientific',
  'all',
  'https://1cell.ai/abstract-3141-9-aacr-annual-meeting-2026/',
  'Publications/AACR Annual Meeting',
  'Genomic Informatics Team',
  'scientific@1cell.ai',
  '2026-01-01T00:00:00.000Z',
  '2026-09-08T09:52:43.443Z',
  FALSE,
  '{"journal": "AACR Annual Meeting"}'::jsonb
) on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  sharepoint_url = excluded.sharepoint_url,
  updated_at = excluded.updated_at;

insert into public.content_assets (
  id, title, description, category, department, product_workspace, content_type,
  region, cancer_type, biomarkers, owner_author, version, status,
  target_team, collaboration_scope, sharepoint_url, sharepoint_folder_path,
  created_by, created_by_email, created_at, updated_at, is_deleted, extra_metadata
) values (
  'pub-009',
  'Comprehensive Genomic Profiling Drives Precision Oncology and Expands Accessibility to Targeted Therapies in Uzbek Populations',
  'Demonstrating clinical utility and treatment modifications using CGP panels in Central Asia.',
  'publications',
  'Scientific',
  'oncoindx',
  'Publication',
  'Global',
  'Solid Tumor',
  'None',
  'Clinical Research Team',
  'v1.0',
  'Approved',
  'scientific',
  'all',
  'https://1cell.ai/abstract-2510-17-aacr-annual-meeting-2026/',
  'Publications/AACR Annual Meeting',
  'Clinical Research Team',
  'scientific@1cell.ai',
  '2026-01-01T00:00:00.000Z',
  '2026-09-08T09:52:43.443Z',
  FALSE,
  '{"journal": "AACR Annual Meeting"}'::jsonb
) on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  sharepoint_url = excluded.sharepoint_url,
  updated_at = excluded.updated_at;

insert into public.content_assets (
  id, title, description, category, department, product_workspace, content_type,
  region, cancer_type, biomarkers, owner_author, version, status,
  target_team, collaboration_scope, sharepoint_url, sharepoint_folder_path,
  created_by, created_by_email, created_at, updated_at, is_deleted, extra_metadata
) values (
  'pub-010',
  'OncoAlibrex: Ultrasensitive cfDNA Fragmentomics Assay for Early Treatment Response Assessment in Solid Tumors',
  'Tracing cell-free DNA size distribution dynamics to predict early responder states.',
  'publications',
  'Scientific',
  'oncoalibrex',
  'Publication',
  'Global',
  'Solid Tumor',
  'None',
  'Fragmentomics Group',
  'v1.0',
  'Approved',
  'scientific',
  'all',
  'https://1cell.ai/abstract-1035-3-aacr-annual-meeting-2026/',
  'Publications/AACR Annual Meeting',
  'Fragmentomics Group',
  'scientific@1cell.ai',
  '2026-01-01T00:00:00.000Z',
  '2026-09-08T09:52:43.443Z',
  FALSE,
  '{"journal": "AACR Annual Meeting"}'::jsonb
) on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  sharepoint_url = excluded.sharepoint_url,
  updated_at = excluded.updated_at;

insert into public.content_assets (
  id, title, description, category, department, product_workspace, content_type,
  region, cancer_type, biomarkers, owner_author, version, status,
  target_team, collaboration_scope, sharepoint_url, sharepoint_folder_path,
  created_by, created_by_email, created_at, updated_at, is_deleted, extra_metadata
) values (
  'pub-011',
  'Single live circulating tumor cells capture and their genomic profile reveal enriched mutations of PIK3CA and HRR pathway in breast cancer patients',
  'Capturing intact CTC profiles revealing homologous recombination pathway mutations in breast patients.',
  'publications',
  'Scientific',
  'oncoctc',
  'Publication',
  'Global',
  'Solid Tumor',
  'None',
  'Khandare et al.',
  'v1.0',
  'Approved',
  'scientific',
  'all',
  'https://1cell.ai/live-ctc-genomic-profile-pik3ca-hrr-breast/',
  'Publications/Liquid Biopsy Congress',
  'Khandare et al.',
  'scientific@1cell.ai',
  '2026-01-01T00:00:00.000Z',
  '2026-09-08T09:52:43.443Z',
  FALSE,
  '{"journal": "Liquid Biopsy Congress"}'::jsonb
) on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  sharepoint_url = excluded.sharepoint_url,
  updated_at = excluded.updated_at;

insert into public.content_assets (
  id, title, description, category, department, product_workspace, content_type,
  region, cancer_type, biomarkers, owner_author, version, status,
  target_team, collaboration_scope, sharepoint_url, sharepoint_folder_path,
  created_by, created_by_email, created_at, updated_at, is_deleted, extra_metadata
) values (
  'pub-012',
  'AI-Powered HRD Prediction from H&E Histopathology Images in Breast and Ovarian Cancer',
  'AI-based inference model calculating HRD scores from standard slide images.',
  'publications',
  'Scientific',
  'oncopredikt',
  'Publication',
  'Global',
  'Solid Tumor',
  'None',
  'Informatics Team',
  'v1.0',
  'Approved',
  'scientific',
  'all',
  'https://1cell.ai/ai-hrd-prediction-histopathology-breast-ovarian-cancer/',
  'Publications/Journal of Clinical Oncology',
  'Informatics Team',
  'scientific@1cell.ai',
  '2026-01-01T00:00:00.000Z',
  '2026-09-08T09:52:43.443Z',
  FALSE,
  '{"journal": "Journal of Clinical Oncology"}'::jsonb
) on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  sharepoint_url = excluded.sharepoint_url,
  updated_at = excluded.updated_at;

insert into public.content_assets (
  id, title, description, category, department, product_workspace, content_type,
  region, cancer_type, biomarkers, owner_author, version, status,
  target_team, collaboration_scope, sharepoint_url, sharepoint_folder_path,
  created_by, created_by_email, created_at, updated_at, is_deleted, extra_metadata
) values (
  'pub-013',
  'True live single circulating tumor cell capture with no leukocyte contaminant assay for multiomics in large cancer patient population',
  'Demonstrating high-purity single-cell CTC capture systems from raw blood samples.',
  'publications',
  'Scientific',
  'oncoctc',
  'Publication',
  'Global',
  'Solid Tumor',
  'None',
  'Actorius Group',
  'v1.0',
  'Approved',
  'scientific',
  'all',
  'https://1cell.ai/live-single-ctc-capture-multiomics-cancer/',
  'Publications/SABCS Annual Meeting',
  'Actorius Group',
  'scientific@1cell.ai',
  '2026-01-01T00:00:00.000Z',
  '2026-09-08T09:52:43.443Z',
  FALSE,
  '{"journal": "SABCS Annual Meeting"}'::jsonb
) on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  sharepoint_url = excluded.sharepoint_url,
  updated_at = excluded.updated_at;

insert into public.content_assets (
  id, title, description, category, department, product_workspace, content_type,
  region, cancer_type, biomarkers, owner_author, version, status,
  target_team, collaboration_scope, sharepoint_url, sharepoint_folder_path,
  created_by, created_by_email, created_at, updated_at, is_deleted, extra_metadata
) values (
  'pub-014',
  'Longitudinal ctDNA monitoring with resistance genomic signatures show poor prognosis in EGFR-mutated advanced NSCLC patients',
  'Tracking EGFR resistance patterns to predict disease progression.',
  'publications',
  'Scientific',
  'oncomonitor',
  'Publication',
  'Global',
  'Solid Tumor',
  'None',
  'Shafi et5 al.',
  'v1.0',
  'Approved',
  'scientific',
  'all',
  'https://1cell.ai/longitudinal-ctdna-egfr-nsclc-prognosis/',
  'Publications/ISLB Annual Congress',
  'Shafi et5 al.',
  'scientific@1cell.ai',
  '2026-01-01T00:00:00.000Z',
  '2026-09-08T09:52:43.443Z',
  FALSE,
  '{"journal": "ISLB Annual Congress"}'::jsonb
) on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  sharepoint_url = excluded.sharepoint_url,
  updated_at = excluded.updated_at;

insert into public.content_assets (
  id, title, description, category, department, product_workspace, content_type,
  region, cancer_type, biomarkers, owner_author, version, status,
  target_team, collaboration_scope, sharepoint_url, sharepoint_folder_path,
  created_by, created_by_email, created_at, updated_at, is_deleted, extra_metadata
) values (
  'pub-015',
  'Circulating tumor cells and clusters exhibiting PD-L1 expression in colorectal cancer patients',
  'Examining diagnostic PD-L1 thresholds on intact circulating tumor cells and microclusters.',
  'publications',
  'Scientific',
  'oncoctc',
  'Publication',
  'Global',
  'Solid Tumor',
  'None',
  'Khandare et al.',
  'v1.0',
  'Approved',
  'scientific',
  'all',
  'https://1cell.ai/circulating-tumor-cells-and-clusters-exhibiting-pd-l1-expression-in-colorectal-cancer-patients/',
  'Publications/Journal of Colorectal Cancer Research',
  'Khandare et al.',
  'scientific@1cell.ai',
  '2026-01-01T00:00:00.000Z',
  '2026-09-08T09:52:43.443Z',
  FALSE,
  '{"journal": "Journal of Colorectal Cancer Research"}'::jsonb
) on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  sharepoint_url = excluded.sharepoint_url,
  updated_at = excluded.updated_at;

insert into public.content_assets (
  id, title, description, category, department, product_workspace, content_type,
  region, cancer_type, biomarkers, owner_author, version, status,
  target_team, collaboration_scope, sharepoint_url, sharepoint_folder_path,
  created_by, created_by_email, created_at, updated_at, is_deleted, extra_metadata
) values (
  'pub-016',
  'ctDNA-based clinicogenomic analysis of advanced head and neck cancer patients treated with immune checkpoint inhibitors',
  'Serial monitoring of tumor mutations in blood to guide immunotherapy durations.',
  'publications',
  'Scientific',
  'oncomonitor',
  'Publication',
  'Global',
  'Solid Tumor',
  'None',
  'Uttarwar et al.',
  'v1.0',
  'Approved',
  'scientific',
  'all',
  'https://1cell.ai/ctdna-based-clinicogenomic-analysis-of-advanced-head-and-neck-cancer-patients-treated-with-immune-checkpoint-inhibitors/',
  'Publications/Journal of Precision Medicine',
  'Uttarwar et al.',
  'scientific@1cell.ai',
  '2026-01-01T00:00:00.000Z',
  '2026-09-08T09:52:43.443Z',
  FALSE,
  '{"journal": "Journal of Precision Medicine"}'::jsonb
) on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  sharepoint_url = excluded.sharepoint_url,
  updated_at = excluded.updated_at;

insert into public.content_assets (
  id, title, description, category, department, product_workspace, content_type,
  region, cancer_type, biomarkers, owner_author, version, status,
  target_team, collaboration_scope, sharepoint_url, sharepoint_folder_path,
  created_by, created_by_email, created_at, updated_at, is_deleted, extra_metadata
) values (
  'pub-017',
  'Using a dynamic blood flow device with affinity ligands to capture circulating tumor cells in cancer patients',
  'Validation of microfluidic flow cells capturing viable tumor cells using custom affinity tags.',
  'publications',
  'Scientific',
  'oncoctc',
  'Publication',
  'Global',
  'Solid Tumor',
  'None',
  'Actorius Research Group',
  'v1.0',
  'Approved',
  'scientific',
  'all',
  'https://1cell.ai/using-a-dynamic-blood-flow-device-with-affinity-ligands-to-capture-circulating-tumor-cells-in-cancer-patients/',
  'Publications/Rare Cell Research Journal',
  'Actorius Research Group',
  'scientific@1cell.ai',
  '2026-01-01T00:00:00.000Z',
  '2026-09-08T09:52:43.443Z',
  FALSE,
  '{"journal": "Rare Cell Research Journal"}'::jsonb
) on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  sharepoint_url = excluded.sharepoint_url,
  updated_at = excluded.updated_at;

insert into public.content_assets (
  id, title, description, category, department, product_workspace, content_type,
  region, cancer_type, biomarkers, owner_author, version, status,
  target_team, collaboration_scope, sharepoint_url, sharepoint_folder_path,
  created_by, created_by_email, created_at, updated_at, is_deleted, extra_metadata
) values (
  'pub-018',
  'Circulating tumor cell distribution and PD-L1 expression across cancer types: insights from 5,935 patients',
  'Large-cohort statistical trace verifying circulating tumor cell ranges across solid cancer lineages.',
  'publications',
  'Scientific',
  'oncoctc',
  'Publication',
  'Global',
  'Solid Tumor',
  'None',
  'Khandare et al.',
  'v1.0',
  'Approved',
  'scientific',
  'all',
  'https://1cell.ai/circulating-tumor-cell-distribution-and-pd-l1-expression-across-cancer-types-insights-from-5935-patients/',
  'Publications/ASCO Poster Presentation',
  'Khandare et al.',
  'scientific@1cell.ai',
  '2026-01-01T00:00:00.000Z',
  '2026-09-08T09:52:43.443Z',
  FALSE,
  '{"journal": "ASCO Poster Presentation"}'::jsonb
) on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  sharepoint_url = excluded.sharepoint_url,
  updated_at = excluded.updated_at;

insert into public.content_assets (
  id, title, description, category, department, product_workspace, content_type,
  region, cancer_type, biomarkers, owner_author, version, status,
  target_team, collaboration_scope, sharepoint_url, sharepoint_folder_path,
  created_by, created_by_email, created_at, updated_at, is_deleted, extra_metadata
) values (
  'pub-019',
  'PD-L1 expression on circulating tumor cells and CTC clusters as minimal residual disease in breast cancer patients',
  'Correlating residual circulating cells expressing checkpoint targets to relapse timelines.',
  'publications',
  'Scientific',
  'oncoctc',
  'Publication',
  'Global',
  'Solid Tumor',
  'None',
  'Shafi et al.',
  'v1.0',
  'Approved',
  'scientific',
  'all',
  'https://1cell.ai/pd-l1-expression-on-circulating-tumor-cells-and-ctc-clusters-as-minimal-cellular-residual-disease-in-breast-cancer-patients/',
  'Publications/Breast Cancer Research',
  'Shafi et al.',
  'scientific@1cell.ai',
  '2026-01-01T00:00:00.000Z',
  '2026-09-08T09:52:43.443Z',
  FALSE,
  '{"journal": "Breast Cancer Research"}'::jsonb
) on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  sharepoint_url = excluded.sharepoint_url,
  updated_at = excluded.updated_at;

insert into public.content_assets (
  id, title, description, category, department, product_workspace, content_type,
  region, cancer_type, biomarkers, owner_author, version, status,
  target_team, collaboration_scope, sharepoint_url, sharepoint_folder_path,
  created_by, created_by_email, created_at, updated_at, is_deleted, extra_metadata
) values (
  'pub-020',
  'Effect of cell proliferation pathway on accessibility to targeted therapeutics in the spectrum of co-occurring prognostic cellular pathways in pan-cancers',
  'Mapping downstream pathway overlaps to predict targeted treatment synergies.',
  'publications',
  'Scientific',
  'oncoindx',
  'Publication',
  'Global',
  'Solid Tumor',
  'None',
  'Informatics Team',
  'v1.0',
  'Approved',
  'scientific',
  'all',
  'https://1cell.ai/effect-of-cell-proliferation-pathway-on-accessibility-to-targeted-therapeutics-in-the-spectrum-of-co-occurring-prognostic-cellular-pathways-in-pan-cancers/',
  'Publications/Translational Oncology Reports',
  'Informatics Team',
  'scientific@1cell.ai',
  '2026-01-01T00:00:00.000Z',
  '2026-09-08T09:52:43.443Z',
  FALSE,
  '{"journal": "Translational Oncology Reports"}'::jsonb
) on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  sharepoint_url = excluded.sharepoint_url,
  updated_at = excluded.updated_at;

insert into public.content_assets (
  id, title, description, category, department, product_workspace, content_type,
  region, cancer_type, biomarkers, owner_author, version, status,
  target_team, collaboration_scope, sharepoint_url, sharepoint_folder_path,
  created_by, created_by_email, created_at, updated_at, is_deleted, extra_metadata
) values (
  'pub-021',
  'Mutational spectrum of cell proliferation genes as early predictive markers for aggressive disease in endometrial cancers',
  'Predicting aggressive endometrial tumor growth lines using early gene panel analysis.',
  'publications',
  'Scientific',
  'oncoindx',
  'Publication',
  'Global',
  'Solid Tumor',
  'None',
  'Genomics Panel',
  'v1.0',
  'Approved',
  'scientific',
  'all',
  'https://1cell.ai/mutational-spectrum-of-cell-proliferation-genes-as-early-predictive-markers-for-aggressive-disease-in-endometrial-cancers/',
  'Publications/Journal of Molecular Oncology',
  'Genomics Panel',
  'scientific@1cell.ai',
  '2026-01-01T00:00:00.000Z',
  '2026-09-08T09:52:43.443Z',
  FALSE,
  '{"journal": "Journal of Molecular Oncology"}'::jsonb
) on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  sharepoint_url = excluded.sharepoint_url,
  updated_at = excluded.updated_at;

insert into public.content_assets (
  id, title, description, category, department, product_workspace, content_type,
  region, cancer_type, biomarkers, owner_author, version, status,
  target_team, collaboration_scope, sharepoint_url, sharepoint_folder_path,
  created_by, created_by_email, created_at, updated_at, is_deleted, extra_metadata
) values (
  'vid-001',
  'Voices in Precision Oncology - Physician Interviews',
  '',
  'videos',
  'Marketing',
  'oncoindx',
  'Video',
  'Global',
  'None',
  'None',
  'Dr. Sandhay Iyer & Panel',
  'v1.0',
  'Approved',
  'marketing',
  'all',
  'https://www.youtube.com/@1CellAi',
  'Digital Videos',
  'Dr. Sandhay Iyer & Panel',
  'marketing@1cell.ai',
  '2026-01-01T00:00:00.000Z',
  '2026-09-08T09:52:43.443Z',
  FALSE,
  '{"duration": "32:15"}'::jsonb
) on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  sharepoint_url = excluded.sharepoint_url,
  updated_at = excluded.updated_at;

insert into public.content_assets (
  id, title, description, category, department, product_workspace, content_type,
  region, cancer_type, biomarkers, owner_author, version, status,
  target_team, collaboration_scope, sharepoint_url, sharepoint_folder_path,
  created_by, created_by_email, created_at, updated_at, is_deleted, extra_metadata
) values (
  'vid-002',
  'Mastering CTC Sample Collection & Technical Guidelines',
  '',
  'videos',
  'Marketing',
  'oncoctc',
  'Video',
  'Global',
  'None',
  'None',
  'Clinical Operations',
  'v1.0',
  'Approved',
  'marketing',
  'all',
  'https://www.youtube.com/@1CellAi',
  'Digital Videos',
  'Clinical Operations',
  'marketing@1cell.ai',
  '2026-01-01T00:00:00.000Z',
  '2026-09-08T09:52:43.443Z',
  FALSE,
  '{"duration": "08:45"}'::jsonb
) on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  sharepoint_url = excluded.sharepoint_url,
  updated_at = excluded.updated_at;

insert into public.content_assets (
  id, title, description, category, department, product_workspace, content_type,
  region, cancer_type, biomarkers, owner_author, version, status,
  target_team, collaboration_scope, sharepoint_url, sharepoint_folder_path,
  created_by, created_by_email, created_at, updated_at, is_deleted, extra_metadata
) values (
  'vid-003',
  'Best Practices for Blood Draws for Next-Generation Sequencing (NGS)',
  '',
  'videos',
  'Marketing',
  'oncoindx',
  'Video',
  'Global',
  'None',
  'None',
  'Informatics Operations',
  'v1.0',
  'Approved',
  'marketing',
  'all',
  'https://www.youtube.com/@1CellAi',
  'Digital Videos',
  'Informatics Operations',
  'marketing@1cell.ai',
  '2026-01-01T00:00:00.000Z',
  '2026-09-08T09:52:43.443Z',
  FALSE,
  '{"duration": "06:12"}'::jsonb
) on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  sharepoint_url = excluded.sharepoint_url,
  updated_at = excluded.updated_at;

insert into public.content_assets (
  id, title, description, category, department, product_workspace, content_type,
  region, cancer_type, biomarkers, owner_author, version, status,
  target_team, collaboration_scope, sharepoint_url, sharepoint_folder_path,
  created_by, created_by_email, created_at, updated_at, is_deleted, extra_metadata
) values (
  'vid-004',
  'Highlights from Precision Oncology Leadership Summit (POLES)',
  '',
  'videos',
  'Marketing',
  'oncoindx',
  'Video',
  'Global',
  'None',
  'None',
  'Mohan Uttarwar & Guests',
  'v1.0',
  'Approved',
  'marketing',
  'all',
  'https://www.youtube.com/@1CellAi',
  'Digital Videos',
  'Mohan Uttarwar & Guests',
  'marketing@1cell.ai',
  '2026-01-01T00:00:00.000Z',
  '2026-09-08T09:52:43.443Z',
  FALSE,
  '{"duration": "15:40"}'::jsonb
) on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  sharepoint_url = excluded.sharepoint_url,
  updated_at = excluded.updated_at;

insert into public.content_assets (
  id, title, description, category, department, product_workspace, content_type,
  region, cancer_type, biomarkers, owner_author, version, status,
  target_team, collaboration_scope, sharepoint_url, sharepoint_folder_path,
  created_by, created_by_email, created_at, updated_at, is_deleted, extra_metadata
) values (
  'vid-005',
  'Introduction to 1Cell.Ai Precision Diagnostics',
  '',
  'videos',
  'Marketing',
  'oncoindx',
  'Video',
  'Global',
  'None',
  'None',
  'Mohan Uttarwar (CEO)',
  'v1.0',
  'Approved',
  'marketing',
  'all',
  'https://www.youtube.com/@1CellAi',
  'Digital Videos',
  'Mohan Uttarwar (CEO)',
  'marketing@1cell.ai',
  '2026-01-01T00:00:00.000Z',
  '2026-09-08T09:52:43.443Z',
  FALSE,
  '{"duration": "04:30"}'::jsonb
) on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  sharepoint_url = excluded.sharepoint_url,
  updated_at = excluded.updated_at;

insert into public.content_assets (
  id, title, description, category, department, product_workspace, content_type,
  region, cancer_type, biomarkers, owner_author, version, status,
  target_team, collaboration_scope, sharepoint_url, sharepoint_folder_path,
  created_by, created_by_email, created_at, updated_at, is_deleted, extra_metadata
) values (
  'vid-006',
  'AI-Powered Digital Pathology: Biomarker Quantification',
  '',
  'videos',
  'Marketing',
  'oncopredikt',
  'Video',
  'Global',
  'None',
  'None',
  'Dr. Gowhar Shafi',
  'v1.0',
  'Approved',
  'marketing',
  'all',
  'https://www.youtube.com/@1CellAi',
  'Digital Videos',
  'Dr. Gowhar Shafi',
  'marketing@1cell.ai',
  '2026-01-01T00:00:00.000Z',
  '2026-09-08T09:52:43.443Z',
  FALSE,
  '{"duration": "12:50"}'::jsonb
) on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  sharepoint_url = excluded.sharepoint_url,
  updated_at = excluded.updated_at;

insert into public.content_assets (
  id, title, description, category, department, product_workspace, content_type,
  region, cancer_type, biomarkers, owner_author, version, status,
  target_team, collaboration_scope, sharepoint_url, sharepoint_folder_path,
  created_by, created_by_email, created_at, updated_at, is_deleted, extra_metadata
) values (
  'report-001',
  'OncoIndx® Comprehensive Genomic Profile - Non-Small Cell Lung Carcinoma (EGFR Exon 19 del)',
  'Lung Cancer Sample Report for ONCOINDX',
  'report-library',
  'Medical',
  'oncoindx',
  'Sample Report',
  'Global',
  'Lung Cancer',
  'EGFR exon 19 del (p.E746_A750del) | TMB-High (14.2 mut/Mb)',
  'Clinical Genomics Laboratory',
  'v2.2',
  'Approved',
  'scientific',
  'all',
  'https://1cell.ai',
  'Sample Reports/ONCOINDX',
  'Clinical Genomics Laboratory',
  'medical@1cell.ai',
  '2026-01-01T00:00:00.000Z',
  '2026-09-08T09:52:43.443Z',
  FALSE,
  '{}'::jsonb
) on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  sharepoint_url = excluded.sharepoint_url,
  updated_at = excluded.updated_at;

insert into public.content_assets (
  id, title, description, category, department, product_workspace, content_type,
  region, cancer_type, biomarkers, owner_author, version, status,
  target_team, collaboration_scope, sharepoint_url, sharepoint_folder_path,
  created_by, created_by_email, created_at, updated_at, is_deleted, extra_metadata
) values (
  'report-002',
  'OncoIndx® Prime+ Whole Exome & Transcriptome - Triple Negative Breast Cancer',
  'Breast Cancer Sample Report for PRIMEPLUS',
  'report-library',
  'Medical',
  'primeplus',
  'Sample Report',
  'Global',
  'Breast Cancer',
  'BRCA1 Pathogenic (c.68_69delAG) | High Neoantigen Burden',
  'Translational Genomics Team',
  'v2.0',
  'Approved',
  'scientific',
  'all',
  'https://1cell.ai',
  'Sample Reports/PRIMEPLUS',
  'Translational Genomics Team',
  'medical@1cell.ai',
  '2026-01-01T00:00:00.000Z',
  '2026-09-08T09:52:43.443Z',
  FALSE,
  '{}'::jsonb
) on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  sharepoint_url = excluded.sharepoint_url,
  updated_at = excluded.updated_at;

insert into public.content_assets (
  id, title, description, category, department, product_workspace, content_type,
  region, cancer_type, biomarkers, owner_author, version, status,
  target_team, collaboration_scope, sharepoint_url, sharepoint_folder_path,
  created_by, created_by_email, created_at, updated_at, is_deleted, extra_metadata
) values (
  'report-003',
  'OncoIndx® TBx cfDNA Liquid Biopsy - Metastatic Colorectal Carcinoma',
  'Colorectal Cancer Sample Report for ONCOINDXTBX',
  'report-library',
  'Medical',
  'oncoindxtbx',
  'Sample Report',
  'Global',
  'Colorectal Cancer',
  'KRAS p.G12D (VAF 2.4%) | BRAF Wild-Type | MSS',
  'Liquid Biopsy Unit',
  'v1.5',
  'Approved',
  'scientific',
  'all',
  'https://1cell.ai',
  'Sample Reports/ONCOINDXTBX',
  'Liquid Biopsy Unit',
  'medical@1cell.ai',
  '2026-01-01T00:00:00.000Z',
  '2026-09-08T09:52:43.443Z',
  FALSE,
  '{}'::jsonb
) on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  sharepoint_url = excluded.sharepoint_url,
  updated_at = excluded.updated_at;

insert into public.content_assets (
  id, title, description, category, department, product_workspace, content_type,
  region, cancer_type, biomarkers, owner_author, version, status,
  target_team, collaboration_scope, sharepoint_url, sharepoint_folder_path,
  created_by, created_by_email, created_at, updated_at, is_deleted, extra_metadata
) values (
  'report-004',
  'OncoIndx® 360° Endometrium Molecular Classification - Endometrioid Adenocarcinoma',
  'Endometrial Cancer Sample Report for ONCOINDX360',
  'report-library',
  'Medical',
  'oncoindx360',
  'Sample Report',
  'Global',
  'Endometrial Cancer',
  'POLE Exonuclease Domain Mutation (p.P286R) | Ultra-hypermutated',
  'Gynecologic Oncology Group',
  'v2.1',
  'Approved',
  'scientific',
  'all',
  'https://1cell.ai',
  'Sample Reports/ONCOINDX360',
  'Gynecologic Oncology Group',
  'medical@1cell.ai',
  '2026-01-01T00:00:00.000Z',
  '2026-09-08T09:52:43.443Z',
  FALSE,
  '{}'::jsonb
) on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  sharepoint_url = excluded.sharepoint_url,
  updated_at = excluded.updated_at;

insert into public.content_assets (
  id, title, description, category, department, product_workspace, content_type,
  region, cancer_type, biomarkers, owner_author, version, status,
  target_team, collaboration_scope, sharepoint_url, sharepoint_folder_path,
  created_by, created_by_email, created_at, updated_at, is_deleted, extra_metadata
) values (
  'report-005',
  'OncoHRD® Genomic Scarring & LOH Analysis - High-Grade Serous Ovarian Carcinoma',
  'Ovarian Cancer Sample Report for ONCOHRD',
  'report-library',
  'Medical',
  'oncohrd',
  'Sample Report',
  'Global',
  'Ovarian Cancer',
  'HRD Score: 62 (HRD Positive) | BRCA2 Somatic Inactivating Variant',
  'Clinical Oncology Pathology',
  'v3.0',
  'Approved',
  'scientific',
  'all',
  'https://1cell.ai',
  'Sample Reports/ONCOHRD',
  'Clinical Oncology Pathology',
  'medical@1cell.ai',
  '2026-01-01T00:00:00.000Z',
  '2026-09-08T09:52:43.443Z',
  FALSE,
  '{}'::jsonb
) on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  sharepoint_url = excluded.sharepoint_url,
  updated_at = excluded.updated_at;

insert into public.content_assets (
  id, title, description, category, department, product_workspace, content_type,
  region, cancer_type, biomarkers, owner_author, version, status,
  target_team, collaboration_scope, sharepoint_url, sharepoint_folder_path,
  created_by, created_by_email, created_at, updated_at, is_deleted, extra_metadata
) values (
  'report-006',
  'OncoTarget® Actionable Oncology Panel - Lung Adenocarcinoma',
  'Lung Cancer Sample Report for ONCOTARGET',
  'report-library',
  'Medical',
  'oncotarget',
  'Sample Report',
  'Global',
  'Lung Cancer',
  'EML4-ALK Fusion (Variant 1, E13;A20) | ROS1/RET Negative',
  'Rapid Response Diagnostics',
  'v1.2',
  'Approved',
  'scientific',
  'all',
  'https://1cell.ai',
  'Sample Reports/ONCOTARGET',
  'Rapid Response Diagnostics',
  'medical@1cell.ai',
  '2026-01-01T00:00:00.000Z',
  '2026-09-08T09:52:43.443Z',
  FALSE,
  '{}'::jsonb
) on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  sharepoint_url = excluded.sharepoint_url,
  updated_at = excluded.updated_at;

insert into public.content_assets (
  id, title, description, category, department, product_workspace, content_type,
  region, cancer_type, biomarkers, owner_author, version, status,
  target_team, collaboration_scope, sharepoint_url, sharepoint_folder_path,
  created_by, created_by_email, created_at, updated_at, is_deleted, extra_metadata
) values (
  'report-007',
  'OncoRisk® Hereditary Cancer Predisposition - Familial Breast & Ovarian Syndrome',
  'Breast Cancer Sample Report for ONCORISK',
  'report-library',
  'Medical',
  'oncorisk',
  'Sample Report',
  'Global',
  'Breast Cancer',
  'BRCA1 Germline Pathogenic Variant (c.5266dupC, p.Gln1756Profs*74)',
  'Medical Genetics Unit',
  'v1.8',
  'Approved',
  'scientific',
  'all',
  'https://1cell.ai',
  'Sample Reports/ONCORISK',
  'Medical Genetics Unit',
  'medical@1cell.ai',
  '2026-01-01T00:00:00.000Z',
  '2026-09-08T09:52:43.443Z',
  FALSE,
  '{}'::jsonb
) on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  sharepoint_url = excluded.sharepoint_url,
  updated_at = excluded.updated_at;

insert into public.content_assets (
  id, title, description, category, department, product_workspace, content_type,
  region, cancer_type, biomarkers, owner_author, version, status,
  target_team, collaboration_scope, sharepoint_url, sharepoint_folder_path,
  created_by, created_by_email, created_at, updated_at, is_deleted, extra_metadata
) values (
  'report-008',
  'OncoMonitor® Minimal Residual Disease & Recurrence Tracking - Colorectal Cancer',
  'Colorectal Cancer Sample Report for ONCOMONITOR',
  'report-library',
  'Medical',
  'oncomonitor',
  'Sample Report',
  'Global',
  'Colorectal Cancer',
  'ctDNA Positive (Tumor Fraction: 0.082%) | Timepoint T2 Post-Op',
  'Clinical Monitoring Division',
  'v2.0',
  'Approved',
  'scientific',
  'all',
  'https://1cell.ai',
  'Sample Reports/ONCOMONITOR',
  'Clinical Monitoring Division',
  'medical@1cell.ai',
  '2026-01-01T00:00:00.000Z',
  '2026-09-08T09:52:43.443Z',
  FALSE,
  '{}'::jsonb
) on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  sharepoint_url = excluded.sharepoint_url,
  updated_at = excluded.updated_at;

insert into public.content_assets (
  id, title, description, category, department, product_workspace, content_type,
  region, cancer_type, biomarkers, owner_author, version, status,
  target_team, collaboration_scope, sharepoint_url, sharepoint_folder_path,
  created_by, created_by_email, created_at, updated_at, is_deleted, extra_metadata
) values (
  'report-009',
  'OncoCTC® Rare Cell Enumeration & AR-V7 Phenotypic Profiling - Metastatic Prostate Cancer',
  'Prostate Cancer Sample Report for ONCOCTC',
  'report-library',
  'Medical',
  'oncoctc',
  'Sample Report',
  'Global',
  'Prostate Cancer',
  'CTC Count: 18 cells/7.5mL | AR-V7 Splice Variant Positive',
  'Rare Cell Analytics Laboratory',
  'v1.1',
  'Approved',
  'scientific',
  'all',
  'https://1cell.ai',
  'Sample Reports/ONCOCTC',
  'Rare Cell Analytics Laboratory',
  'medical@1cell.ai',
  '2026-01-01T00:00:00.000Z',
  '2026-09-08T09:52:43.443Z',
  FALSE,
  '{}'::jsonb
) on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  sharepoint_url = excluded.sharepoint_url,
  updated_at = excluded.updated_at;

insert into public.content_assets (
  id, title, description, category, department, product_workspace, content_type,
  region, cancer_type, biomarkers, owner_author, version, status,
  target_team, collaboration_scope, sharepoint_url, sharepoint_folder_path,
  created_by, created_by_email, created_at, updated_at, is_deleted, extra_metadata
) values (
  'report-010',
  'iCore® AI Genomic Intelligence & Variant Interpretation - Solid Tumor Pan-Cancer',
  'Pan Cancer Sample Report for ICORE',
  'report-library',
  'Medical',
  'icore',
  'Sample Report',
  'Global',
  'Pan Cancer',
  'MSI-High | POLE Mutation | TMB: 28.6 mut/Mb',
  'Bioinformatics & AI Platform',
  'v3.1',
  'Approved',
  'scientific',
  'all',
  'https://1cell.ai',
  'Sample Reports/ICORE',
  'Bioinformatics & AI Platform',
  'medical@1cell.ai',
  '2026-01-01T00:00:00.000Z',
  '2026-09-08T09:52:43.443Z',
  FALSE,
  '{}'::jsonb
) on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  sharepoint_url = excluded.sharepoint_url,
  updated_at = excluded.updated_at;

insert into public.content_assets (
  id, title, description, category, department, product_workspace, content_type,
  region, cancer_type, biomarkers, owner_author, version, status,
  target_team, collaboration_scope, sharepoint_url, sharepoint_folder_path,
  created_by, created_by_email, created_at, updated_at, is_deleted, extra_metadata
) values (
  'report-011',
  'OncoAlibrex® Real-Time Therapy Monitoring - Stage IV Metastatic Colorectal Carcinoma',
  'Colorectal Cancer Sample Report for ONCOALIBREX',
  'report-library',
  'Medical',
  'oncoalibrex',
  'Sample Report',
  'Global',
  'Colorectal Cancer',
  'KRAS Wild-Type | CEA-Negative | Molecular Tracking',
  'Clinical Molecular Monitoring Unit',
  'v1.0',
  'Approved',
  'scientific',
  'all',
  'https://1cell.ai',
  'Sample Reports/ONCOALIBREX',
  'Clinical Molecular Monitoring Unit',
  'medical@1cell.ai',
  '2026-01-01T00:00:00.000Z',
  '2026-09-08T09:52:43.443Z',
  FALSE,
  '{}'::jsonb
) on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  sharepoint_url = excluded.sharepoint_url,
  updated_at = excluded.updated_at;
