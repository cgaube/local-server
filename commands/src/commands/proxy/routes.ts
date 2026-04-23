import { Command } from 'commander'
import consola from 'consola'
import { execDocker } from '../../utils/exec.js'
import { isDockerRunning } from '../../utils/docker.js'

type Route = {
  hosts: string[]
  name: string
  port: string
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

const splitHosts = (value: string): string[] =>
  value
    .split(',')
    .map((host) => host.trim())
    .filter(Boolean)

type Scan = {
  routes: Route[]
  proxyRunning: boolean
}

const collectRoutes = async (): Promise<Scan> => {
  const routes: Route[] = []
  let proxyRunning = false

  const { stdout: idsRaw } = await execDocker(['ps', '-q'], { capture: true })
  const ids = (idsRaw ?? '')
    .split('\n')
    .map((id) => id.trim())
    .filter(Boolean)

  if (ids.length === 0) {
    return { routes, proxyRunning }
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
    if (name === 'nginx-proxy') proxyRunning = true

    const env = parseEnvArray(container.Config?.Env)
    const virtualHost = env['VIRTUAL_HOST']
    if (!virtualHost) continue

    routes.push({
      hosts: splitHosts(virtualHost),
      name,
      port: env['VIRTUAL_PORT'] ?? '80',
    })
  }

  return { routes, proxyRunning }
}

const renderRoutes = (routes: Route[]) => {
  const rows = routes.map((route) => ({
    host: route.hosts.join(','),
    name: route.name,
    port: route.port,
    url: `https://${route.hosts[0]}`,
  }))

  const headers = {
    host: 'HOST',
    name: 'CONTAINER',
    port: 'PORT',
    url: 'URL',
  }

  const widths = {
    host: Math.max(headers.host.length, ...rows.map((r) => r.host.length)),
    name: Math.max(headers.name.length, ...rows.map((r) => r.name.length)),
    port: Math.max(headers.port.length, ...rows.map((r) => r.port.length)),
  }

  const format = (row: typeof headers) =>
    [
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
  .description('List active proxy routes from running containers')
  .action(async () => {
    try {
      if (!(await isDockerRunning())) {
        consola.error('Docker is not running. Start Docker and retry.')
        process.exit(1)
      }

      const { routes, proxyRunning } = await collectRoutes()

      if (routes.length === 0) {
        consola.info(
          'No active routes. Start a container with VIRTUAL_HOST to expose it.',
        )
        return
      }

      if (!proxyRunning) {
        consola.warn(
          'nginx-proxy is not running. Routes shown will not be reachable until you run `./server start proxy`.',
        )
      }

      renderRoutes(routes)
    } catch (error) {
      consola.error('Error listing proxy routes:', error)
      process.exit(1)
    }
  })