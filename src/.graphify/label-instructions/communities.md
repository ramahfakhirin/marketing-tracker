# Community Labeling

Graphify is running in assistant/skill mode (no API key). You are the host
assistant (Claude Code / Codex / Gemini CLI). Read the community listing below
and write 2-5 word plain-language names for each.

## Language

Write every name in English (en). Do not switch languages.

## Communities

Community 0: getInitialSchools(, MarketingStatus, Dashboard.tsx, Dashboard(, DashboardProps, schoolsSeed.ts, RAW_SCHOOLS, SPECIAL_DATA
Community 1: getInitialTeamMembers(, TeamMember, App.tsx, App(, teamSeed.ts, main.tsx
Community 2: SURVEYED_DATABASE, SchoolDetailModal.tsx, SchoolDetailModal(, SchoolDetailModalProps, surveyedSchools.ts, SurveyedSchool
Community 3: ClosingProbability, CSVImportExport.tsx, CSVImportExport(, CSVImportExportProps
Community 4: SchoolRecord, TeamManagement.tsx, TeamManagement(, TeamManagementProps
Community 5: extractPhoneNumber(, generateWhatsAppLink(, phoneUtils.ts, formatIndonesianDate(
Community 6: Login.tsx, Login(, LoginProps
Community 7: SchoolList.tsx, SchoolList(, SchoolListProps
Community 8: UserRole, types.ts, MarketingStats

## Instructions

Write a single JSON object mapping each community id (as a string) to its
2-5 word name to: D:\NANO\marketing-tracker\src\.graphify\label-instructions\communities.json

Example:
```json
{
  "0": "Authentication Flow",
  "1": "Authentication Flow",
  "2": "Authentication Flow"
}
```

Then re-run `graphify update` (or `graphify label`) to ingest the names.
