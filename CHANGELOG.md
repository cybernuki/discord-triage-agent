# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-10-02

### Added

- Triage of support-channel messages with TypeSafe Jev: category (Choice), urgency (Score) and needs-human (Noul) in a single request.
- Configurable confidence threshold with a fallback to "needs human".
- Router: summary embed for every message, optional answer agent for questions, pre-filled issue template for bugs.
- Optional answer agent (`ANSWER_AGENT=on|off`) using Claude on AWS Bedrock with keyword-selected sections from `knowledge/`.
- Slash commands `/version` and `/triage`.
- Environment validation with zod.
- Multi-stage Dockerfile (non-root) and hardened `docker-compose.yml` with healthcheck and resource limits.
- GitHub Actions CI: typecheck, lint and test.
