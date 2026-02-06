# Property Management Automation Platform - TODO

## Phase 1: Database Schema & Project Setup
- [x] Design complete database schema for properties, tenants, communications, tickets, maintenance, viewings
- [x] Create todo.md tracking file

## Phase 2: Palace.com CRM Integration
- [x] Build Palace.com API connector infrastructure
- [x] Implement property data sync
- [x] Implement tenant information sync
- [x] Implement rent arrears status sync
- [x] Implement maintenance records sync
- [x] Create sync scheduling system

## Phase 3: Multi-Channel Communication Hub
- [x] Integrate Microsoft Graph API for Outlook email
- [x] Integrate Twilio for SMS
- [x] Integrate Twilio for WhatsApp
- [x] Integrate Twilio for voice/voicemail
- [x] Build auto-responder for email
- [x] Build auto-responder for SMS
- [x] Build auto-responder for WhatsApp
- [x] Build auto-responder for phone/voicemail
- [x] Create unified communication logging

## Phase 4: Ticket Tracking System
- [x] Create ticket database schema
- [x] Build ticket creation from communications
- [x] Implement ticket status management
- [x] Implement ticket assignment system
- [x] Create ticket dashboard UI
- [x] Build ticket detail view with history

## Phase 5: HITL Approval Interface
- [x] Create calendar time slot management UI
- [x] Build viewing booking approval workflow
- [x] Build maintenance scheduling approval workflow
- [x] Implement approval notification system
- [x] Create approval history tracking

## Phase 6: Rent Arrears Monitoring
- [ ] Build daily rent arrears check workflow
- [ ] Implement 10+ days late detection
- [ ] Implement broken arrangement detection
- [ ] Create breach letter summary generation
- [ ] Build arrears dashboard with tenant list
- [ ] Implement escalation action recommendations

## Phase 7: Vacancy & Viewing Automation
- [ ] Create vacancy tracking dashboard
- [ ] Build advertising status reporting
- [ ] Implement viewing booking time slot system
- [ ] Create move-in cost email template generator
- [ ] Build automated application form distribution
- [ ] Implement inquiry response automation

## Phase 8: Maintenance Planning System
- [ ] Create maintenance request database
- [ ] Build maintenance draft generation
- [ ] Implement cost analysis system
- [ ] Create 12-month breakdown by month
- [ ] Build maintenance approval workflow
- [ ] Create maintenance reporting dashboard

## Phase 9: LLM-Powered Drafting
- [ ] Implement LLM email response drafting
- [ ] Create personalized breach letter generation
- [ ] Build daily event summary generation
- [ ] Implement maintenance cost pattern analysis
- [ ] Create budget forecasting with LLM

## Phase 10: Cloud Document Storage
- [ ] Design folder structure per property
- [ ] Implement document upload to S3
- [ ] Create tenant application storage
- [ ] Build maintenance report storage
- [ ] Implement breach letter storage
- [ ] Create communication attachment storage
- [ ] Build document retrieval and viewing UI

## Phase 11: Dashboard & Notifications
- [x] Create main property manager dashboard
- [x] Build daily summary reporting UI
- [x] Implement email alerts for critical events
- [x] Create in-app notification system
- [x] Build notification preferences management
- [x] Create rent arrears breach notifications
- [x] Create urgent maintenance notifications
- [x] Create viewing confirmation notifications

## Phase 12: Scheduled Tasks & Automation
- [ ] Set up daily rent arrears check scheduler
- [ ] Create daily vacancy report scheduler
- [ ] Build daily event summary scheduler
- [ ] Implement maintenance cost analysis scheduler
- [ ] Create communication sync scheduler
- [ ] Build Palace.com data sync scheduler

## Phase 13: Testing & Deployment
- [ ] Write unit tests for critical workflows
- [ ] Test Palace.com integration
- [ ] Test multi-channel communication
- [ ] Test HITL approval workflows
- [ ] Test rent arrears monitoring
- [ ] Test maintenance planning
- [ ] Create user documentation
- [ ] Create API integration guide
- [ ] Save final checkpoint


## Phase 13: External Integrations Configuration (In Progress)
- [x] Create integration configuration UI with secure credential management
- [x] Build Palace.com API configuration form
- [x] Build Outlook/Microsoft Graph configuration form
- [x] Add integration status indicators
- [x] Create manual sync triggers for each integration
- [ ] Note: SMS/WhatsApp/Phone - Consider NZ-compatible providers (Vonage, local NZ SMS gateways) for future implementation


## Phase 14: Vonage & Slack Integration
- [x] Replace Twilio with Vonage SMS/WhatsApp integration
- [x] Build Vonage API connector for SMS
- [x] Build Vonage WhatsApp Business API integration
- [x] Create Slack integration for team notifications
- [x] Add Vonage configuration form to Integrations page
- [x] Add Slack configuration form to Integrations page
- [x] Update communications service to use Vonage
- [ ] Test SMS and WhatsApp delivery via Vonage


## Phase 15: n8n & AI Provider Integrations
- [x] Update database schema to include n8n, claude, chatgpt, gemini services
- [x] Create n8n webhook integration for workflow automation
- [x] Create Claude (Anthropic) API integration
- [x] Create ChatGPT (OpenAI) API integration
- [x] Create Gemini (Google) API integration
- [x] Add n8n configuration form to Integrations page
- [x] Add Claude configuration form to Integrations page
- [x] Add ChatGPT configuration form to Integrations page
- [x] Add Gemini configuration form to Integrations page
- [ ] Create AI service selector for different tasks (email drafting, breach letters, summaries)


## Document Storage & JotForm Integration
- [ ] Add document storage provider options (S3, Google Drive, Dropbox, OneDrive)
- [ ] Create storage service abstraction layer
- [ ] Add JotForm integration to Integrations page
- [ ] Implement document upload/download with selected provider
- [ ] Add folder structure per property


## Category & Tag Management
- [x] Create categories table (user-defined categories for properties, maintenance, etc.)
- [x] Create tags table (flexible tagging system)
- [x] Add category management UI (add/edit/delete categories)
- [x] Add tag management UI (add/edit/delete tags)
- [x] Add category/tag assignment to properties
- [x] Add category/tag assignment to maintenance requests
- [x] Add category/tag assignment to tenants
- [ ] Build search and filter by categories
- [ ] Build search and filter by tags


## Maintenance Cost Tracking Filters
- [x] Add property address filter dropdown
- [ ] Add tenancy filter dropdown
- [x] Add date range picker (start/end dates)
- [x] Add maintenance type filter
- [x] Update backend query to support filters
- [x] Display filtered cost totals and breakdowns


## HITL Communication Approval Queue
- [ ] Create communications approval database table
- [ ] Build approval queue page showing all pending communications
- [ ] Add breach letter approval workflow
- [ ] Add email approval workflow
- [ ] Add maintenance confirmation approval workflow
- [ ] Implement approve/reject/edit functionality
- [ ] Add preview for each communication type
- [ ] Wire up approved communications to actual sending


## HITL Approval Queue & Reporting (In Progress)
- [x] Add status and approval fields to communications table
- [x] Build approval router with tRPC endpoints
- [x] Create Approvals page with pending communications list
- [x] Add preview modal for each communication
- [x] Add approve/reject functionality
- [x] Wire up Outlook email sending on approval
- [x] Wire up Vonage SMS sending on approval
- [ ] Add edit functionality for communication drafts
- [ ] Test actual email sending with Outlook credentials
- [ ] Test actual SMS sending with Vonage credentials
- [ ] Create activity reports (PDF/Excel export)
- [ ] Add daily/weekly/monthly report generation
- [ ] Build compliance audit trail export


## Edit Communication Drafts in Approval Queue
- [x] Add Edit button to each communication card in Approvals page
- [x] Create edit dialog with subject and body text fields
- [x] Add update mutation to approvals router
- [x] Wire up save functionality to update communication in database
- [x] Refresh approval queue after successful edit
- [x] Test editing email communications
- [x] Test editing SMS communications


## Bulk Actions in Approval Queue
- [x] Add checkbox selection to each communication card
- [x] Add "Select All" checkbox in header
- [x] Create bulk action toolbar with Approve All and Reject All buttons
- [x] Implement bulk approve mutation in backend
- [x] Implement bulk reject mutation in backend
- [x] Show selected count in toolbar
- [x] Add confirmation dialog for bulk actions
- [x] Test bulk approve functionality
- [x] Test bulk reject functionality

## Email Templates Library
- [x] Create email_templates database table
- [x] Add template fields (name, category, subject, body, variables)
- [x] Create templates router with CRUD endpoints
- [x] Build Templates management page UI
- [x] Add template creation form
- [x] Add template editing functionality
- [x] Add template deletion with confirmation
- [x] Create template categories (rent_reminder, maintenance, viewing, general)
- [x] Add template variable system ({{tenant_name}}, {{property_address}}, etc.)
- [ ] Add "Use Template" button in approval queue
- [ ] Test template creation and usage

## Scheduled Communication Sending
- [x] Add scheduledFor field to communications table
- [x] Update schema and push to database
- [x] Add scheduling dialog to approval workflow
- [x] Create date/time picker for scheduling
- [x] Add schedule mutation to backend
- [x] Add "Scheduled" status to communications
- [x] Test scheduling dialog UI
- [ ] Create cron job to check for scheduled communications
- [ ] Implement scheduled send processor
- [ ] Show scheduled communications in separate section
- [ ] Add ability to cancel scheduled sends


## Use Template in Approval Queue
- [x] Add "Use Template" button to approval queue header
- [x] Create template selection dialog
- [x] Display available templates grouped by category
- [x] Add template preview in selection dialog
- [x] Integrate template application with communication creation
- [x] Support variable substitution when applying templates
- [x] Add "Create from Template" workflow
- [x] Test template selection and application
- [x] Fix bug with template variables display


## Variable Substitution UI
- [x] Parse template content to extract variable placeholders ({{variable_name}})
- [x] Add state management for variable values in Approvals page
- [x] Create variable input fields section in create communication dialog
- [x] Show input field for each detected variable
- [x] Implement substitution logic to replace placeholders with user values
- [x] Update subject and body with substituted values before creating communication
- [x] Format variable names from snake_case to Title Case
- [x] Test variable substitution with sample template
- [x] Verify all variables replaced correctly in subject and body


## Scheduled Communications Dashboard
- [x] Create backend query to fetch scheduled communications
- [x] Build Scheduled page component with dashboard layout
- [x] Display scheduled communications in card format
- [x] Implement countdown timer component showing time until send
- [x] Add preview button for each scheduled communication
- [x] Add cancel button to remove scheduled sends
- [x] Add reschedule button to change send time
- [x] Show channel and countdown badges
- [x] Add navigation menu item for Scheduled page
- [x] Test countdown timers update in real-time
- [x] Add cancelScheduled mutation to backend
- [x] Add reschedule mutation to backend
- [x] Test preview dialog functionality
- [x] Verify scheduled communications removed from approval queue


## Sent Communications Archive Page
- [x] Create backend query to fetch sent communications
- [x] Add filtering by date range, channel, recipient
- [x] Add pagination for large datasets
- [x] Build SentCommunications page component
- [x] Display communications in table format with sortable columns
- [x] Show key details: timestamp, recipient, channel, subject, status
- [x] Add preview button to view full message content
- [x] Add search functionality by recipient or subject
- [x] Add date range filter UI
- [x] Add channel filter (email, sms, whatsapp)
- [x] Add export to CSV functionality for audit reports
- [x] Add navigation menu item for Sent Communications
- [x] Test preview dialog functionality
- [x] Insert test data for archive testing
- [x] Verify table displays sent communications correctly


## Tenancies Management Page
- [x] Design tenancies database schema with property and tenant relationships
- [x] Create tenancies table with tags, flags, pins, and alerts fields
- [x] Add tenancy_alerts table for tracking multiple alerts per tenancy
- [x] Create tenancies router with CRUD endpoints
- [x] Build Tenancies page component with table view
- [x] Add CSV import functionality for bulk tenancy data
- [x] Add CSV export functionality for reporting
- [x] Implement tagging system with predefined and custom tags
- [x] Add tag-based filtering and search
- [x] Implement flagging system for marking important tenancies
- [x] Implement pinning system for watching specific tenancies
- [x] Create alerts management UI with 9 alert types (antisocial behavior, court hearing, complaints, terminate, rent arrears, breach notice, inspection due, lease expiry, other)
- [x] Add alert creation dialog with type, title, description, priority, and due date
- [x] Add navigation menu item between Properties and Tenants
- [x] Insert test tenancy data
- [x] Test table display with tags, flags, and pins
- [x] Test alerts dialog and alert type selection
- [ ] Complete alert creation form testing
- [ ] Add alert editing and deletion functionality
- [ ] Add alert status tracking (active, resolved, dismissed)
- [ ] Show pinned tenancies at the top of the list
- [ ] Add bulk operations (tag, flag, export selected)
- [ ] Test CSV import/export functionality


## Alert Notifications Dashboard
- [x] Create alerts dashboard page showing all active alerts across tenancies
- [x] Add countdown timers for alert due dates
- [x] Group alerts by priority (urgent, high, medium, low)
- [x] Add quick-action buttons (resolve, dismiss)
- [x] Show alert details (tenancy, property, tenant, type, description)
- [x] Add filtering by alert type and priority
- [x] Add navigation menu item for Alerts dashboard
- [x] Test alert dashboard with sample data
- [x] Fix getAlertTypeLabel to handle undefined alertType

## Automated Alert Triggers
- [x] Create alert trigger service for automated alert creation
- [x] Add trigger for lease expiring in 30 days
- [x] Add trigger for lease renewal reminder (60 days before expiry)
- [x] Create scheduled job to check triggers daily
- [x] Initialize alert triggers on server startup
- [x] Fix SQL syntax errors in alert trigger queries
- [ ] Add trigger for rent 7+ days overdue (requires rent payment tracking)
- [ ] Add trigger for inspection due (requires inspections table)
- [ ] Add trigger configuration settings

## Tenancy Timeline View
- [x] Create timeline component for tenancy history
- [x] Add timeline entry for lease start/end changes
- [x] Add timeline entry for alerts created/resolved
- [x] Add getTimeline query to tenancies router
- [x] Create TenancyTimeline page component
- [x] Add Timeline button to tenancies table
- [x] Add route for tenancy timeline view
- [x] Test timeline with sample tenancy data
- [x] Add color-coded timeline icons
- [x] Add metadata display for timeline events
- [ ] Add timeline entry for rent adjustments
- [ ] Add timeline entry for communications sent
- [ ] Add timeline entry for maintenance requests
- [ ] Add timeline entry for payments received
- [ ] Add filtering and search in timeline
