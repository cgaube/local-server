# Repository Guidelines

## Project Structure & Module Organization
Core CLI code lives in `commands/src`:
- `main.ts` defines the command entrypoint.
- `commands/commands/*.ts` implements subcommands (`start`, `stop`, `status`, `localstack`, `webhook-gateway`).
- `commands/utils/*.ts` contains shared Docker/process helpers.

Build output is generated to `commands/dist`. Runtime orchestration files are in:
- `docker-compose.yml` and `services/*/docker-compose.yml` for profiles.
- `custom/` for local, user-defined compose services.
- `scripts/terraform/` for LocalStack infrastructure provisioning.
- `scripts/lambda/webhook-gateway/` for SAM/Lambda code.

## Build, Test, and Development Commands
- This repository uses BUN, not npm, not pnpm, not yarn.
- `bun install` installs dependencies.
- `bun build` compiles and bundles the TypeScript CLI into a standalone executable at `./server`
- `./server start [profile]` starts Docker services (default profile is `proxy`).
- `./server stop [profile]` stops services for a profile.
- `./server status [profile]` prints service status.
- `./server list` lists available compose profiles.
- `./server localstack setup` provisions LocalStack resources via Terraform.

## Coding Style & Naming Conventions
Use 2-space indentation, LF line endings, UTF-8, and final newlines (`.editorconfig`).
Prettier rules: single quotes, trailing commas, semicolons off, print width 80 (`.prettierrc`).

TypeScript conventions in this repo:
- ESM modules (`"type": "module"`).
- Command files use kebab-case (for example, `webhook-gateway.ts`).
- Exported command identifiers use camelCase with `Command` suffix (`startCommand`).

## Testing Guidelines
There is currently no root-level automated test suite for `commands/src`. For command changes, validate manually with `./server list`, `./server start`, and `./server status`.

## Commit & Pull Request Guidelines
Git history uses short, imperative, lowercase messages (for example, `fix bucket script`, `cleanup`). Follow that style and keep commits focused.

PRs should include:
- A concise summary of behavior changes.
- Any required environment/config changes (`terraform.tfvars`, compose overrides).
- Verification notes (commands run, test output, or screenshots/logs for runtime changes).
