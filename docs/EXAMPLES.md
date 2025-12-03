````markdown
# Enhanced Examples for Multi-Board Kanban Plugin

This document shows how to use the enhanced kanban plugin with multiple boards, custom columns, and configurable properties.

## Multiple Board Examples

### 1. Personal Task Management Board
**Board Configuration:**
- Name: "Personal Tasks"
- Tag Filter: `#personal`
- Columns: `Inbox`, `Today`, `This Week`, `Someday`, `Done`
- Visible Properties: `title`, `created`, `priority`, `energy`

**Example Notes:**

```markdown
---
status: "Today"
priority: "high"
energy: "low"
---

# Call dentist for appointment

Need to schedule a cleaning appointment.

#personal
```

```markdown
---
status: "This Week"
priority: "medium"
energy: "high"
context: "computer"
---

# Update portfolio website

Add recent projects and refresh design.

#personal
```

### 2. Work Project Board
**Board Configuration:**
- Name: "Project Alpha"
- Tag Filter: `#project-alpha`
- Columns: `Backlog`, `Sprint`, `In Review`, `Testing`, `Deployed`
- Visible Properties: `title`, `assignee`, `priority`, `story-points`

**Example Notes:**

```markdown
---
status: "Sprint"
assignee: "Sarah"
priority: "critical"
story-points: 8
epic: "User Authentication"
---

# Implement OAuth 2.0 login

Add Google and GitHub OAuth integration for user login.

## Acceptance Criteria
- [ ] Google OAuth integration
- [ ] GitHub OAuth integration
- [ ] Error handling
- [ ] Unit tests

#project-alpha
```

### 3. Content Creation Board
**Board Configuration:**
- Name: "Blog Content"
- Tag Filter: `#blog`
- Columns: `Ideas`, `Outline`, `Draft`, `Review`, `Published`
- Visible Properties: `title`, `created`, `target-date`, `word-count`

**Example Notes:**

```markdown
---
status: "Draft"
target-date: "2024-02-15"
word-count: 1200
category: "tutorial"
---

# How to Build a Kanban Board in Obsidian

A comprehensive guide to creating and using kanban boards for productivity.

#blog
```

### 4. Research Board
**Board Configuration:**
- Name: "Research Papers"
- Tag Filter: `#research`
- Columns: `To Read`, `Reading`, `Notes`, `Analysis`, `Complete`
- Visible Properties: `title`, `authors`, `journal`, `year`

**Example Notes:**

```markdown
---
status: "Reading"
authors: "Smith, J. & Doe, A."
journal: "Journal of Productivity"
year: 2024
doi: "10.1000/xyz123"
---

# Kanban Methodology in Knowledge Work

Research on applying kanban principles to intellectual work.

#research
```

## Advanced Board Features

### Custom Column Management

You can add custom columns to any board:

1. **Via Column Header**: Click the ⋯ button in any column header → "Add New Column"
2. **Via Settings**: Go to Settings → Kanban Board → select your board → "Add Custom Column"

Example custom columns:
- **Bug Tracking**: `Reported`, `Investigating`, `Fixing`, `Testing`, `Closed`
- **Sales Pipeline**: `Lead`, `Qualified`, `Proposal`, `Negotiation`, `Closed`
- **Learning**: `Planned`, `Learning`, `Practicing`, `Teaching`, `Mastered`

### Creating New Cards

Use the + button in column headers to quickly create new cards:

1. Click + in desired column
2. Enter card title
3. Card is created with appropriate frontmatter
4. Opens for editing

### Configurable Card Properties

Each board can show different properties on cards:

**Minimal Cards** (title only):
- Visible Properties: `title`

**Detailed Cards** (full information):
- Visible Properties: `title`, `created`, `modified`, `tags`, `priority`, `assignee`

**Custom Properties**:
Add any frontmatter property to visible properties list.

## Multi-Board Workflows

### 1. GTD (Getting Things Done) System

**Inbox Board** (`#inbox`)
- Columns: `Inbox`, `Processing`
- For quick capture

**Projects Board** (`#projects`)
- Columns: `Someday`, `Next`, `Waiting`, `Done`
- For actionable items

**Areas Board** (`#areas`)
- Columns: `Maintain`, `Improve`, `Monitor`
- For ongoing responsibilities

### 2. Agile Development

**Epic Board** (`#epic`)
- Columns: `Planned`, `In Progress`, `Done`
- High-level features

**Sprint Board** (`#sprint`)
- Columns: `Backlog`, `Todo`, `Doing`, `Review`, `Done`
- Current sprint work

**Bug Board** (`#bugs`)
- Columns: `Reported`, `Triaged`, `Fixing`, `Testing`, `Closed`
- Bug tracking

### 3. Content Pipeline

**Ideas Board** (`#content-ideas`)
- Columns: `Raw Ideas`, `Researched`, `Approved`
- Content ideation

**Production Board** (`#content-prod`)
- Columns: `Writing`, `Editing`, `Design`, `Review`, `Published`
- Content creation

## Best Practices

### Board Organization
1. **Use descriptive names** for boards and columns
2. **Keep boards focused** on specific workflows
3. **Limit column count** to 3-7 for optimal visibility

### Property Configuration
1. **Show relevant properties** only
2. **Use consistent property names** across related boards
3. **Consider card readability** when adding properties

### Workflow Design
1. **Map your actual process** to board columns
2. **Test with real work** before finalizing
3. **Iterate and improve** based on usage

### File Organization
```
Vault/
├── Projects/
│   ├── Project Alpha/
│   └── Project Beta/
├── Personal/
│   ├── Tasks/
│   └── Goals/
└── Research/
    ├── Papers/
    └── Notes/
```

Use consistent tagging within folders:
- All project files: appropriate project tag
- Personal items: `#personal`
- Research: `#research`

### Template Notes

Create templates for common card types:

**Task Template**:
```markdown
---
status: "Inbox"
priority: "medium"
energy: "medium"
context: ""
---

# {{title}}

## Description

## Next Steps
- [ ] 

## Notes

#personal
```

**Project Template**:
```markdown
---
status: "Backlog"
assignee: ""
priority: "medium"
story-points: 0
epic: ""
---

# {{title}}

## User Story
As a [user], I want [goal] so that [benefit].

## Acceptance Criteria
- [ ] 
- [ ] 

## Technical Notes

#project-alpha
```

This enhanced plugin supports complex workflows while maintaining simplicity for basic use cases.
````