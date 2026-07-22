# Graph Report - src  (2026-07-21)

## Corpus Check
- Corpus is ~16.763 words - fits in a single context window. You may not need a graph.

## Summary
- 41 nodes · 85 edges · 9 communities detected
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output
- Edge kinds: imports: 33 · contains: 28 · imports_from: 23 · calls: 1


## Input Scope
- Requested: all
- Resolved: all (source: configured-default)
- Included files: 13 · Candidates: recursive
- Excluded: 0 untracked · 0 ignored · 0 sensitive · 0 missing committed

## Graph Freshness
- Built from Git commit: `055ebab`
- Compare this hash to `git rev-parse HEAD` before trusting freshness-sensitive graph output.
## God Nodes (most connected - your core abstractions)
1. `SchoolRecord` - 8 edges
2. `MarketingStatus` - 7 edges
3. `TeamMember` - 6 edges
4. `SURVEYED_DATABASE` - 4 edges
5. `extractPhoneNumber()` - 4 edges
6. `generateWhatsAppLink()` - 4 edges
7. `ClosingProbability` - 4 edges
8. `UserRole` - 4 edges
9. `getInitialSchools()` - 2 edges
10. `getInitialTeamMembers()` - 2 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Communities

### Community 0 - "Community 0"
Cohesion: 0.25
Nodes (5): DashboardProps, getInitialSchools(), RAW_SCHOOLS, SPECIAL_DATA, MarketingStatus

### Community 1 - "Community 1"
Cohesion: 0.47
Nodes (2): getInitialTeamMembers(), TeamMember

### Community 2 - "Community 2"
Cohesion: 0.40
Nodes (3): SchoolDetailModalProps, SURVEYED_DATABASE, SurveyedSchool

### Community 3 - "Community 3"
Cohesion: 0.50
Nodes (2): CSVImportExportProps, ClosingProbability

### Community 4 - "Community 4"
Cohesion: 0.50
Nodes (2): TeamManagementProps, SchoolRecord

### Community 5 - "Community 5"
Cohesion: 0.67
Nodes (2): extractPhoneNumber(), generateWhatsAppLink()

### Community 6 - "Community 6"
Cohesion: 0.67
Nodes (1): LoginProps

### Community 7 - "Community 7"
Cohesion: 0.67
Nodes (1): SchoolListProps

### Community 8 - "Community 8"
Cohesion: 0.67
Nodes (2): MarketingStats, UserRole

## Knowledge Gaps
- **10 isolated node(s):** `CSVImportExportProps`, `DashboardProps`, `LoginProps`, `SchoolDetailModalProps`, `SchoolListProps` (+5 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 1`** (2 nodes): `getInitialTeamMembers()`, `TeamMember`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 3`** (2 nodes): `CSVImportExportProps`, `ClosingProbability`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 4`** (2 nodes): `TeamManagementProps`, `SchoolRecord`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 5`** (2 nodes): `extractPhoneNumber()`, `generateWhatsAppLink()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 6`** (1 nodes): `LoginProps`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 7`** (1 nodes): `SchoolListProps`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 8`** (2 nodes): `MarketingStats`, `UserRole`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `SchoolRecord` connect `Community 4` to `Community 1`, `Community 3`, `Community 0`, `Community 2`, `Community 7`, `Community 8`?**
  _High betweenness centrality (0.059) - this node is a cross-community bridge._
- **Why does `MarketingStatus` connect `Community 0` to `Community 1`, `Community 3`, `Community 2`, `Community 7`, `Community 8`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **Why does `TeamMember` connect `Community 1` to `Community 6`, `Community 2`, `Community 4`, `Community 8`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **What connects `CSVImportExportProps`, `DashboardProps`, `LoginProps` to the rest of the system?**
  _10 weakly-connected nodes found - possible documentation gaps or missing edges._