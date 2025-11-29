# Orkestar Feature Roadmap

## Overview

This document outlines the implementation plan for upgrading Orkestar from a simple workflow builder to a full-featured automation platform with clear Free/Pro tier differentiation.

---

## Phase 1: Core Tier Restrictions (Week 1)
*Foundation for monetization*

### 1.1 Multi-Step Workflow Limits
- [ ] Add `maxSteps` to tier limits (Free: 1, Pro: unlimited)
- [ ] Count connected nodes as "steps" 
- [ ] Show upgrade prompt when Free users try to add 2nd step
- [ ] Add visual indicator showing step count
- [ ] Gate branching/parallel paths to Pro only

### 1.2 Update Pricing Tiers
```typescript
free: {
  limits: {
    workflows: 1,
    aiExecutions: 50,
    contexts: 1,
    maxSteps: 1,           // NEW
    integrations: 2,        // NEW
    templates: 5,           // NEW
  }
},
pro: {
  limits: {
    workflows: -1,
    aiExecutions: -1,
    contexts: -1,
    maxSteps: -1,          // unlimited
    integrations: -1,       // unlimited
    templates: -1,          // unlimited
  }
}
```

---

## Phase 2: Schedule Triggers (Week 2)
*High-value Pro feature*

### 2.1 Schedule Node Component
- [ ] Create `ScheduleNode` component (similar to WebhookNode)
- [ ] Add to Events section in sidebar (Pro only)
- [ ] Schedule options: hourly, daily, weekly, custom cron
- [ ] Visual schedule indicator on node

### 2.2 Backend Infrastructure
- [ ] Create `schedules` table in Supabase
```sql
CREATE TABLE schedules (
  id UUID PRIMARY KEY,
  workflow_id UUID REFERENCES workflows(id),
  user_id UUID REFERENCES auth.users(id),
  cron_expression TEXT NOT NULL,
  timezone TEXT DEFAULT 'UTC',
  is_active BOOLEAN DEFAULT true,
  last_run_at TIMESTAMP,
  next_run_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```
- [ ] Create schedule execution service (Edge Function or external cron)
- [ ] Add schedule management API routes

### 2.3 UI Components
- [ ] Schedule configuration modal
- [ ] Next run time display
- [ ] Run history for scheduled executions

---

## Phase 3: Integrations Library (Week 3-4)
*Major value differentiator*

### 3.1 Integration Framework
- [ ] Create `IntegrationNode` base component
- [ ] Integration registry/config system
- [ ] OAuth flow handler for connected services
- [ ] Credentials storage (encrypted in Supabase)

### 3.2 Pro Integrations
| Integration | Priority | Complexity |
|-------------|----------|------------|
| Email Send (SMTP/Resend) | P0 | Low |
| Google Sheets | P0 | Medium |
| Slack | P1 | Medium |
| Notion | P1 | Medium |
| Discord | P2 | Low |
| Airtable | P2 | Medium |

### 3.3 Free Tier Integrations
- [ ] Email Send (limited to 10/day)
- [ ] Webhook (receive only, no send)

### 3.4 Integration Node UI
- [ ] Integration browser/picker modal
- [ ] Connection status indicators
- [ ] Account selector for multi-account
- [ ] Field mapping interface

---

## Phase 4: Execution Logging & History (Week 5)
*Essential for debugging and trust*

### 4.1 Database Schema
```sql
CREATE TABLE workflow_executions (
  id UUID PRIMARY KEY,
  workflow_id UUID REFERENCES workflows(id),
  user_id UUID REFERENCES auth.users(id),
  trigger_type TEXT, -- 'manual', 'webhook', 'schedule'
  trigger_data JSONB,
  status TEXT, -- 'running', 'completed', 'failed'
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  error_message TEXT
);

CREATE TABLE execution_steps (
  id UUID PRIMARY KEY,
  execution_id UUID REFERENCES workflow_executions(id),
  node_id TEXT NOT NULL,
  node_type TEXT NOT NULL,
  input JSONB,
  output JSONB,
  status TEXT,
  duration_ms INTEGER,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 4.2 Logging Service
- [ ] Real-time execution tracking
- [ ] Step-by-step input/output capture
- [ ] Error capture with stack traces
- [ ] Execution duration metrics

### 4.3 History UI
- [ ] Execution history list view
- [ ] Execution detail view with step breakdown
- [ ] Input/output viewer (JSON pretty print)
- [ ] Error highlighting and traces
- [ ] Re-run from history
- [ ] Filter by status, date, trigger type

### 4.4 Tier Limits
- Free: Last 10 executions, 24hr retention
- Pro: Unlimited history, 30-day retention

---

## Phase 5: Templates Library (Week 6)
*Accelerates user onboarding*

### 5.1 Template System
- [ ] Create `templates` table
```sql
CREATE TABLE templates (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT, -- 'marketing', 'sales', 'support', etc.
  tier TEXT DEFAULT 'free', -- 'free', 'pro', 'premium'
  nodes JSONB NOT NULL,
  edges JSONB NOT NULL,
  thumbnail_url TEXT,
  author_id UUID,
  is_community BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 5.2 Template Categories
- **Starter Templates** (Free)
  - Simple text summarizer
  - Basic Q&A bot
  - Content rewriter
  - Image describer
  - Voice note transcriber

- **Pro Templates**
  - Multi-step content pipeline
  - Lead qualification workflow
  - Customer support triage
  - Social media scheduler
  - Meeting notes → action items

- **Premium Agent Templates** (Pro)
  - Research assistant
  - Code reviewer
  - SEO optimizer
  - Sales email generator

### 5.3 Template UI
- [ ] Template gallery page
- [ ] Category filters
- [ ] Search functionality
- [ ] Preview modal
- [ ] "Use Template" flow
- [ ] Community submissions (Pro)

---

## Phase 6: Variables & Dynamic Inputs (Week 7)
*Power user feature*

### 6.1 Variable System
- [ ] Define variable syntax: `{{variable_name}}`
- [ ] Variable extraction from webhook payload
- [ ] Variable passing between nodes
- [ ] Environment variables (Pro)

### 6.2 Input Configuration
- [ ] Dynamic input schema per workflow
- [ ] Input validation rules
- [ ] Default values
- [ ] Required vs optional fields

### 6.3 Variable UI
- [ ] Variable panel in workflow editor
- [ ] Autocomplete in prompt fields
- [ ] Variable preview/test
- [ ] Input form generator for webhook triggers

---

## Phase 7: Custom Logic Blocks (Week 8)
*Enterprise differentiator - Pro Only*

### 7.1 Logic Node Types
- [ ] **Condition Node** - If/else branching
- [ ] **Transform Node** - Data manipulation (JS sandbox)
- [ ] **Loop Node** - Iterate over arrays
- [ ] **Delay Node** - Wait X seconds/minutes
- [ ] **Filter Node** - Filter array items

### 7.2 Condition Builder
- [ ] Visual condition builder UI
- [ ] Comparison operators (equals, contains, greater than, etc.)
- [ ] AND/OR logic groups
- [ ] Variable references in conditions

### 7.3 Transform Editor
- [ ] Code editor with syntax highlighting
- [ ] Sandboxed JS execution (vm2 or similar)
- [ ] Input/output type hints
- [ ] Common transform snippets

### 7.4 Security
- [ ] Sandboxed execution environment
- [ ] Timeout limits
- [ ] Memory limits
- [ ] No network access in transforms

---

## Implementation Priority Matrix

| Feature | Impact | Effort | Priority |
|---------|--------|--------|----------|
| Multi-Step Limits | High | Low | P0 |
| Schedule Triggers | High | Medium | P0 |
| Execution Logging | High | Medium | P0 |
| Email Integration | High | Low | P1 |
| Google Sheets | High | Medium | P1 |
| Templates Library | Medium | Medium | P1 |
| Variables System | High | Medium | P1 |
| Slack Integration | Medium | Medium | P2 |
| Notion Integration | Medium | Medium | P2 |
| Logic Blocks | High | High | P2 |
| Discord Integration | Low | Low | P3 |
| Airtable Integration | Low | Medium | P3 |

---

## Updated Pricing Display

### Free Tier
- 1 workflow
- 1 step per workflow (single AI call)
- 50 AI executions/month
- Manual runs only
- 2 integrations (Email, Webhook receive)
- 5 starter templates
- 24hr execution history
- Community support

### Pro Tier ($9.99/month)
- Unlimited workflows
- Unlimited steps & branching
- Unlimited AI executions
- Scheduled runs (hourly, daily, weekly)
- All integrations (Slack, Notion, Sheets, etc.)
- All templates + community templates
- 30-day execution history
- Variables & dynamic inputs
- Custom logic blocks
- Priority support

---

## Technical Architecture Notes

### Execution Engine
```
Trigger (Manual/Webhook/Schedule)
    ↓
Execution Service
    ↓
Step Executor (sequential/parallel)
    ↓
Node Handler (AI/Integration/Logic)
    ↓
Result Aggregator
    ↓
Output/Webhook Response
```

### Database Relationships
```
users
  ├── workflows
  │     ├── schedules
  │     └── executions
  │           └── execution_steps
  ├── integrations (OAuth tokens)
  └── subscriptions
```

---

## Quick Wins (Can ship this week)

1. **Multi-step limit enforcement** - Just count nodes and show upgrade prompt
2. **Basic execution logging** - Log start/end/error for each run
3. **Email send integration** - Use Resend API, simple to implement
4. **5 starter templates** - Just pre-built workflow JSONs

---

## Questions to Resolve

1. **Scheduling infrastructure**: Use Supabase Edge Functions + pg_cron, or external service (Trigger.dev, Inngest)?
2. **OAuth handling**: Build custom or use Nango/Paragon?
3. **Template marketplace**: Allow user submissions? Revenue share?
4. **Logic block sandboxing**: Use Deno isolates, vm2, or WebAssembly?


