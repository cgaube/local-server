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

Start LocalStack only:

```bash
./server start localstack
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
- `./server localstack setup` provision LocalStack resources with Terraform

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

## Doctor checks

Use doctor when a host does not resolve or HTTPS fails.

```bash
./server doctor
```

Optional HTTPS probe for a specific host:

```bash
./server doctor --https -H my-service.dev.test
```

## LocalStack provisioning

`./server localstack setup` checks for `tflocal`.
If missing, it can install required tooling with Homebrew:

```bash
brew tap hashicorp/tap
brew install awscli hashicorp/tap/terraform terraform-local awscli-local
```

Copy `terraform.tfvars.example` to `terraform.tfvars`, fill required values,
then run:

```bash
./server localstack setup
```

## Custom services

Add service compose files in `custom/`, then include them in
`docker-compose.override.yml`:

```yaml
include:
  - custom/mysql-db/docker-compose.yml
```

Start with:

```bash
./server start [profile]
```
