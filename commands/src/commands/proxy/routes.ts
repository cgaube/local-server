import { Command } from 'commander'
import consola from 'consola'
import { execDocker } from '../../utils/exec.js'
import {
  isDockerRunning,
  getAvailableProfiles,
  getDockerComposeProfileArgs,
} from '../../utils/docker.js'

type Route = {
  status: 'running' | 'declared'
  hosts: string[]
  name: string
  port: string
  profile: string | null
}

const parseEnvArray = (env: string[] | undefined): Record<string, string> => {
  const result: Record<string, string> = {}
  if (!env) return result
  for (const entry of env) {
    const idx = entry.indexOf('=')
    if (idx === -1) continue
    result[entry.slice(0, idx)] = entry.slice(idx + 1)
  }
  return result
}

const normalizeEnv = (
  env: Record<string, string> | string[] | undefined,
): Record<string, string> => {
  if (!env) return {}
  if (Array.isArray(env)) return parseEnvArray(env)
  return env
}

const splitHosts = (value: string): string[] =>
  value
    .split(',')
    .map((host) => host.trim())
    .filter(Boolean)

type RunningScan = {
  routes: Route[]
  proxyRunning: boolean
  runningContainerNames: Set<string>
}

const collectRunningRoutes = async (): Promise<RunningScan> => {
  const runningContainerNames = new Set<string>()
  const routes: Route[] = []
  let proxyRunning = false

  const { stdout: idsRaw } = await execDocker(['ps', '-q'], { capture: true })
  const ids = (idsRaw ?? '')
    .split('\n')
    .map((id) => id.trim())
    .filter(Boolean)

  if (ids.length === 0) {
    return { routes, proxyRunning, runningContainerNames }
  }

  const { stdout: inspectRaw } = await execDocker(['inspect', ...ids], {
    capture: true,
  })
  const containers = JSON.parse(inspectRaw ?? '[]') as Array<{
    Name?: string
    Config?: { Env?: string[] }
  }>

  for (const container of containers) {
    const name = (container.Name ?? '').replace(/^\//, '')
    if (!name) continue
    runningContainerNames.add(name)
    if (name === 'nginx-proxy') proxyRunning = true

    const env = parseEnvArray(container.Config?.Env)
    const virtualHost = env['VIRTUAL_HOST']
    if (!virtualHost) continue

    routes.push({
      status: 'running',
      hosts: splitHosts(virtualHost),
      name,
      port: env['VIRTUAL_PORT'] ?? '80',
      profile: null,
    })
  }

  return { routes, proxyRunning, runningContainerNames }
}

const collectDeclaredRoutes = async (
  runningContainerNames: Set<string>,
): Promise<Route[]> => {
  const profiles = [...(await getAvailableProfiles())].sort()
  if (profiles.length === 0) return []

  const { stdout } = await execDocker(
    [
      'compose',
      ...getDockerComposeProfileArgs(profiles),
      'config',
      '--format',
      'json',
    ],
    { capture: true },
  )

  const config = JSON.parse(stdout ?? '{}') as {
    services?: Record<
      string,
      {
        container_name?: string
        environment?: Record<string, string> | string[]
        profiles?: string[]
      }
    >
  }

  const declared: Route[] = []
  for (const [serviceName, service] of Object.entries(config.services ?? {})) {
    const env = normalizeEnv(service.environment)
    const virtualHost = env['VIRTUAL_HOST']
    if (!virtualHost) continue

    const containerName = service.container_name ?? serviceName
    if (runningContainerNames.has(containerName)) continue

    declared.push({
      status: 'declared',
      hosts: splitHosts(virtualHost),
      name: serviceName,
      port: env['VIRTUAL_PORT'] ?? '80',
      profile: (service.profiles ?? []).join(',') || null,
    })
  }

  return declared
}

const renderRoutes = (routes: Route[]) => {
  const rows = routes.map((route) => ({
    status: route.status,
    host: route.hosts.join(','),
    name:
      route.status === 'declared' && route.profile
        ? `${route.name} (${route.profile})`
        : route.name,
    port: route.port,
    url: `https://${route.hosts[0]}`,
  }))

  const headers = {
    status: 'STATUS',
    host: 'HOST',
    name: 'SERVICE / CONTAINER',
    port: 'PORT',
    url: 'URL',
  }

  const widths = {
    status: Math.max(
      headers.status.length,
      ...rows.map((r) => r.status.length),
    ),
    host: Math.max(headers.host.length, ...rows.map((r) => r.host.length)),
    name: Math.max(headers.name.length, ...rows.map((r) => r.name.length)),
    port: Math.max(headers.port.length, ...rows.map((r) => r.port.length)),
  }

  const format = (row: typeof headers) =>
    [
      row.status.padEnd(widths.status),
      row.host.padEnd(widths.host),
      row.name.padEnd(widths.name),
      row.port.padEnd(widths.port),
      row.url,
    ].join('  ')

  console.log(format(headers))
  for (const row of rows) {
    console.log(format(row))
  }
}

export const routesCommand = new Command('routes')
  .description('List proxy routes (running and compose-declared)')
  .action(async () => {
    try {
      if (!(await isDockerRunning())) {
        consola.error('Docker is not running. Start Docker and retry.')
        process.exit(1)
      }

      const {
        routes: running,
        proxyRunning,
        runningContainerNames,
      } = await collectRunningRoutes()
      const declared = await collectDeclaredRoutes(runningContainerNames)
      const all = [...running, ...declared]

      if (all.length === 0) {
        consola.info(
          'No routes defined. Add VIRTUAL_HOST to a compose service to expose it.',
        )
        return
      }

      if (!proxyRunning) {
        consola.warn(
          'nginx-proxy is not running. Routes shown will not be reachable until you run `./server start proxy`.',
        )
      }

      renderRoutes(all)
    } catch (error) {
      consola.error('Error listing proxy routes:', error)
      process.exit(1)
    }
  })
