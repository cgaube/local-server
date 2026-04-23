# Local Server

`local-server` is a Bun-based CLI for running local Docker service stacks by
profile.

It is mainly designed for software development workflows, but works for any
local multi-service setup where you want:

- simple `start/stop/status` commands
- reusable compose profiles
- optional hostname-based local routing via nginx proxy
- local HTTPS certificates for browser-safe access

## Why use this

Without a local proxy, each service is usually accessed by a different port
(for example `localhost:3000`, `localhost:4566`, `localhost:8080`).

With proxy + domain setup, services can be accessed by hostname instead
(for example `https://api.dev.test`, `https://admin.dev.test`) using
`VIRTUAL_HOST`.

## Install

```bash
bun install
bun run compile
```

## Quick start

If you plan to use the proxy profile, run setup first:

```bash
./server setup
```

Start default profile (`proxy`):

```bash
./server start
```

Start AWS local services:

```bash
./server start awslocal
```

Stop services:

```bash
./server stop
```

List available profiles:

```bash
./server list
```

## Commands

- `./server start [profile]` start services for a profile
- `./server stop [profile]` stop services for a profile
- `./server status` show running services
- `./server list` list discovered compose profiles
- `./server config [profile]` print resolved docker compose config
- `./server setup` configure local domain + cert + DNS resolver
- `./server doctor` run local DNS/cert/proxy diagnostics
- `./server proxy routes` list running + compose-declared proxy routes
- `./server awslocal setup` provision AWS local resources with Terraform

## Local domain and HTTPS setup

Run:

```bash
./server setup
```

What it does (macOS):

- checks required Homebrew packages: `mkcert`, `nss`, `dnsmasq`
- asks before installing missing packages
- writes `DOMAIN` to `.env` (default: `.dev.test`)
- generates wildcard certificate files in `services/proxy/certs`
- configures wildcard DNS via `dnsmasq`
- writes `/etc/resolver/<domain>` so macOS routes those lookups locally

### Service example

```yaml
services:
  my-service:
    image: crccheck/hello-world
    environment:
      - VIRTUAL_HOST=my-service${DOMAIN:-.dev.test}
```

Then access:

`https://my-service.dev.test`

## Proxy routes

List every hostname the nginx proxy is currently exposing, plus any declared
in compose files that aren't running yet:

```bash
./server proxy routes
```

Output includes status (`running` / `declared`), hostname(s), the container or
service name (with its compose profile in parentheses when not running), the
upstream port, and the reachable URL.

## Doctor checks

Use doctor when a host does not resolve or HTTPS fails.

```bash
./server doctor
```

Optional HTTPS probe for a specific host:

```bash
./server doctor --https -H my-service.dev.test
```

## AWS Local

The `awslocal` profile is the unified entry point for AWS-compatible local
services (LocalStack, Ministack, or any compatible alternative).

### Selecting a backend

Choose your backend by including the relevant compose file in
`docker-compose.override.yml`:

```yaml
include:
  - services/ministack/docker-compose.yml  # or your preferred backend
```

Any service that declares `profiles: ['awslocal']` will be started when you run:

```bash
./server start awslocal
```

Only one backend should be active at a time.

### Provisioning (Terraform)

Before running provisioning, create a `terraform.tfvars` file from the example:

```bash
cp terraform.tfvars.example terraform.tfvars
# edit terraform.tfvars and set values for your local infrastructure
```

Run provisioning with:

```bash
./server start awslocal  # backend must be running first
./server awslocal setup
```

`./server awslocal setup` checks for `tflocal`.
If missing, it can install the required tooling with Homebrew:

```bash
brew tap hashicorp/tap
brew install awscli hashicorp/tap/terraform terraform-local awscli-local
```

The Terraform in this repo provisions AWS-like resources locally (S3, SQS,
Lambda, and related infrastructure used by local development flows).

After provisioning, verify with:

```bash
awslocal s3 ls
awslocal sqs list-queues
```

Detailed Terraform module documentation:
[scripts/terraform/README.md](./scripts/terraform/README.md)

## Custom services

Include any compose file from anywhere on the filesystem in
`docker-compose.override.yml`:

```yaml
include:
  - custom/mysql-db/docker-compose.yml
  - /absolute/path/to/other-service/docker-compose.yml
```

Start with:

```bash
./server start [profile]
```
