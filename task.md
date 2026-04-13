# Task List

## Multi-Tenant Foundation

- [x] Add `Organization` to the data model and attach tenant ownership to core app records.
- [x] Add org scoping to auth/session so every user operates inside exactly one org.
- [x] Enforce tenant isolation in all data queries, actions, imports, alerts, reports, and integrations.
- [x] Add tenant-aware storage key helpers for future S3 recording/transcript assets.

## ServiceSyncNow Admin

- [x] Add a ServiceSyncNow platform-admin role/page that is separate from company manager/admin access.
- [x] Create a ServiceSyncNow admin page to create a new org.
- [x] Allow the platform admin to create the first user for a new org during org setup.
- [x] Mark the first org user as the company admin/manager for that tenant.
- [ ] Add validation and guardrails so platform admins cannot accidentally create duplicate orgs or duplicate first users.

## Org Provisioning Flow

- [x] Define the minimum org fields required at creation time.
- [x] Add an org onboarding action that creates the org and first user in one transaction.
- [x] Decide whether the first user receives a temporary password, invite flow, or forced reset on first login.
- [ ] Add audit logging for org creation and first-user provisioning.

## Follow-Up

- [x] Refactor existing GoTo Connect settings to be tenant-specific.
- [ ] Refactor future S3/OpenAI recording settings to be global platform settings with tenant-scoped runtime data.
- [ ] Add a ServiceSyncNow admin dashboard for viewing orgs, org status, and first-user provisioning history.

## GoTo Connect

- [x] Add a GoTo connection test on the settings page to validate token, account key, and line lookup before save.
- [x] Add clearer GoTo status and error handling for failed Click-To-Call attempts.
- [x] Add support for re-resolving ASM extension to `lineId` when advisor mappings change.
- [x] Add audit logging for GoTo settings changes and advisor line-mapping changes.
- [x] Add GoTo notification channel and call tracking subscription setup for each tenant.
- [x] Persist GoTo call lifecycle data on `CallSession` including conversation id, start/end time, and duration.
- [x] Surface tracked call timing and duration in the RO call record modal.
- [ ] Evaluate voicemail and disposition flags from real GoTo report payloads before mapping them into the UI.

## Call Recording Pipeline

- [x] Define the call-session data model to store GoTo call identifiers, RO linkage, tenant linkage, and recording/transcript status.
- [ ] Configure GoTo call recordings to land in S3.
- [x] Add org-level AWS provisioning so each GoTo tenant can get a flat root bucket plus IAM upload credentials.
- [x] Design tenant-scoped S3 key structure for recordings and transcripts.
- [x] Add S3 event processing for new recordings.
- [x] Add OpenAI transcription workflow for completed recordings.
- [x] Store transcript artifacts and extracted metadata back on the related RO and call session.
- [x] Prevent duplicate processing and handle retries safely.

## Multi-Tenant Integration Hardening

- [x] Keep S3/OpenAI configuration global while making all recording/runtime data tenant-scoped.
- [ ] Ensure GoTo call actions cannot resolve or place calls across tenant boundaries.
- [x] Add platform-level integration management for future global S3/OpenAI settings.
