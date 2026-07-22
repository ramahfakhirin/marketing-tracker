# Node Description Batch 1 of 2

Graphify is running in assistant/skill mode (no API key). You are the host
assistant (Claude Code / Codex / Gemini CLI). Read the prompt below and write
your JSON answer to the answer file.

## Prompt

You are documenting nodes in a knowledge graph.
For each entry below, write ONE concise factual plain-language sentence
describing what it is or does. Use only the provided context.
For a code symbol (kind=code-symbol — a function, class, or constant),
describe what the function/symbol does based on its name, source location
and neighbors — e.g. "Resolves the configured ontology profile from graphify.yaml.".
Write every description in English (en). Do not switch languages.
No marketing language.
Respond ONLY with a JSON object mapping each node id (as a string) to its
one-sentence description — no prose, no markdown fences.

- "app": "App.tsx" | kind=code-symbol | source=App.tsx:L1 | neighbors=[App(), CSVImportExport.tsx, Dashboard.tsx, Login.tsx, SchoolDetailModal.tsx, SchoolList.tsx]
- "types": "types.ts" | kind=code-symbol | source=types.ts:L1 | neighbors=[App.tsx, CSVImportExport.tsx, Dashboard.tsx, Login.tsx, SchoolDetailModal.tsx, SchoolList.tsx]
- "components_schooldetailmodal": "SchoolDetailModal.tsx" | kind=code-symbol | source=components/SchoolDetailModal.tsx:L1 | neighbors=[App.tsx, SchoolDetailModal(), SchoolDetailModalProps, surveyedSchools.ts, SURVEYED_DATABASE, phoneUtils.ts]
- "components_schoollist": "SchoolList.tsx" | kind=code-symbol | source=components/SchoolList.tsx:L1 | neighbors=[App.tsx, SchoolList(), SchoolListProps, surveyedSchools.ts, SURVEYED_DATABASE, phoneUtils.ts]
- "types_schoolrecord": "SchoolRecord" | kind=code-symbol | source=types.ts:L6 | neighbors=[App.tsx, CSVImportExport.tsx, Dashboard.tsx, SchoolDetailModal.tsx, SchoolList.tsx, TeamManagement.tsx]
- "components_csvimportexport": "CSVImportExport.tsx" | kind=code-symbol | source=components/CSVImportExport.tsx:L1 | neighbors=[App.tsx, CSVImportExport(), CSVImportExportProps, types.ts, ClosingProbability, MarketingStatus]
- "components_teammanagement": "TeamManagement.tsx" | kind=code-symbol | source=components/TeamManagement.tsx:L1 | neighbors=[App.tsx, TeamManagement(), TeamManagementProps, types.ts, SchoolRecord, TeamMember]
- "data_schoolsseed": "schoolsSeed.ts" | kind=code-symbol | source=data/schoolsSeed.ts:L1 | neighbors=[App.tsx, getInitialSchools(), RAW_SCHOOLS, SPECIAL_DATA, types.ts, MarketingStatus]
- "types_marketingstatus": "MarketingStatus" | kind=code-symbol | source=types.ts:L1 | neighbors=[App.tsx, CSVImportExport.tsx, Dashboard.tsx, SchoolDetailModal.tsx, SchoolList.tsx, schoolsSeed.ts]
- "components_dashboard": "Dashboard.tsx" | kind=code-symbol | source=components/Dashboard.tsx:L1 | neighbors=[App.tsx, Dashboard(), DashboardProps, types.ts, MarketingStatus, SchoolRecord]
- "components_login": "Login.tsx" | kind=code-symbol | source=components/Login.tsx:L1 | neighbors=[App.tsx, Login(), LoginProps, types.ts, TeamMember, UserRole]
- "types_teammember": "TeamMember" | kind=code-symbol | source=types.ts:L29 | neighbors=[App.tsx, Login.tsx, SchoolDetailModal.tsx, TeamManagement.tsx, teamSeed.ts, types.ts]
- "data_surveyedschools": "surveyedSchools.ts" | kind=code-symbol | source=data/surveyedSchools.ts:L1 | neighbors=[App.tsx, SchoolDetailModal.tsx, SchoolList.tsx, SURVEYED_DATABASE, SurveyedSchool]
- "lib_phoneutils": "phoneUtils.ts" | kind=code-symbol | source=lib/phoneUtils.ts:L1 | neighbors=[SchoolDetailModal.tsx, SchoolList.tsx, extractPhoneNumber(), formatIndonesianDate(), generateWhatsAppLink()]
- "data_surveyedschools_surveyed_database": "SURVEYED_DATABASE" | kind=code-symbol | source=data/surveyedSchools.ts:L7 | neighbors=[App.tsx, SchoolDetailModal.tsx, SchoolList.tsx, surveyedSchools.ts]
- "data_teamseed": "teamSeed.ts" | kind=code-symbol | source=data/teamSeed.ts:L1 | neighbors=[App.tsx, getInitialTeamMembers(), types.ts, TeamMember]
- "lib_phoneutils_extractphonenumber": "extractPhoneNumber()" | kind=code-symbol | source=lib/phoneUtils.ts:L1 | neighbors=[SchoolDetailModal.tsx, SchoolList.tsx, phoneUtils.ts, generateWhatsAppLink()]
- "lib_phoneutils_generatewhatsapplink": "generateWhatsAppLink()" | kind=code-symbol | source=lib/phoneUtils.ts:L23 | neighbors=[SchoolDetailModal.tsx, SchoolList.tsx, phoneUtils.ts, extractPhoneNumber()]
- "types_closingprobability": "ClosingProbability" | kind=code-symbol | source=types.ts:L2 | neighbors=[CSVImportExport.tsx, SchoolDetailModal.tsx, SchoolList.tsx, types.ts]
- "types_userrole": "UserRole" | kind=code-symbol | source=types.ts:L4 | neighbors=[App.tsx, Login.tsx, TeamManagement.tsx, types.ts]
- "data_schoolsseed_getinitialschools": "getInitialSchools()" | kind=code-symbol | source=data/schoolsSeed.ts:L7 | neighbors=[App.tsx, schoolsSeed.ts]
- "data_teamseed_getinitialteammembers": "getInitialTeamMembers()" | kind=code-symbol | source=data/teamSeed.ts:L3 | neighbors=[App.tsx, teamSeed.ts]
- "app_app": "App()" | kind=code-symbol | source=App.tsx:L33 | neighbors=[App.tsx]
- "components_csvimportexport_csvimportexport": "CSVImportExport()" | kind=code-symbol | source=components/CSVImportExport.tsx:L20 | neighbors=[CSVImportExport.tsx]
- "components_csvimportexport_csvimportexportprops": "CSVImportExportProps" | kind=code-symbol | source=components/CSVImportExport.tsx:L14 | neighbors=[CSVImportExport.tsx]
- "components_dashboard_dashboard": "Dashboard()" | kind=code-symbol | source=components/Dashboard.tsx:L36 | neighbors=[Dashboard.tsx]
- "components_dashboard_dashboardprops": "DashboardProps" | kind=code-symbol | source=components/Dashboard.tsx:L29 | neighbors=[Dashboard.tsx]
- "components_login_login": "Login()" | kind=code-symbol | source=components/Login.tsx:L10 | neighbors=[Login.tsx]
- "components_login_loginprops": "LoginProps" | kind=code-symbol | source=components/Login.tsx:L5 | neighbors=[Login.tsx]
- "components_schooldetailmodal_schooldetailmodal": "SchoolDetailModal()" | kind=code-symbol | source=components/SchoolDetailModal.tsx:L35 | neighbors=[SchoolDetailModal.tsx]
- "components_schooldetailmodal_schooldetailmodalprops": "SchoolDetailModalProps" | kind=code-symbol | source=components/SchoolDetailModal.tsx:L25 | neighbors=[SchoolDetailModal.tsx]
- "components_schoollist_schoollist": "SchoolList()" | kind=code-symbol | source=components/SchoolList.tsx:L46 | neighbors=[SchoolList.tsx]
- "components_schoollist_schoollistprops": "SchoolListProps" | kind=code-symbol | source=components/SchoolList.tsx:L28 | neighbors=[SchoolList.tsx]
- "components_teammanagement_teammanagement": "TeamManagement()" | kind=code-symbol | source=components/TeamManagement.tsx:L13 | neighbors=[TeamManagement.tsx]
- "components_teammanagement_teammanagementprops": "TeamManagementProps" | kind=code-symbol | source=components/TeamManagement.tsx:L5 | neighbors=[TeamManagement.tsx]
- "data_schoolsseed_raw_schools": "RAW_SCHOOLS" | kind=code-symbol | source=data/schoolsSeed.ts:L3 | neighbors=[schoolsSeed.ts]
- "data_schoolsseed_special_data": "SPECIAL_DATA" | kind=code-symbol | source=data/schoolsSeed.ts:L5 | neighbors=[schoolsSeed.ts]
- "data_surveyedschools_surveyedschool": "SurveyedSchool" | kind=code-symbol | source=data/surveyedSchools.ts:L1 | neighbors=[surveyedSchools.ts]
- "lib_phoneutils_formatindonesiandate": "formatIndonesianDate()" | kind=code-symbol | source=lib/phoneUtils.ts:L31 | neighbors=[phoneUtils.ts]
- "main": "main.tsx" | kind=code-symbol | source=main.tsx:L1 | neighbors=[App.tsx]

## Instructions

Write a single JSON object mapping each node id to a one-sentence description
to: D:\NANO\marketing-tracker\src\.graphify\description-instructions\batch-000.json

Keep each description factual and concise (one sentence). No markdown, no prose
outside the JSON object. It is acceptable to omit a node if context is
insufficient — but include every node you can ground confidently.

Example answer format:
```json
{
  "node_id_1": "Resolves the configured ontology profile from graphify.yaml.",
  "node_id_2": "Colonel James Barclay, an antagonist in The Crooked Man."
}
```
