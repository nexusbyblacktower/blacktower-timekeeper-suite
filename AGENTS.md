# Authentication architecture
- Use the application-owned fail-closed auth client, never the generated client's fallback configuration; only the dedicated project is accepted to prevent cross-project authentication.
- Authenticate with server-validated Auth users and derive authorization only from protected user_roles; operator_profiles links auth UUIDs to independent canonical People records.
- Keep privileged provisioning and AI requests in existing edge functions; never send authentication credentials or private contacts to AI services.