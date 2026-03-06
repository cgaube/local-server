import { Command } from 'commander'
import consola from 'consola'
import { execa } from 'execa'
import { existsSync, readFileSync } from 'fs'
import { join, resolve } from 'path'

const DEFAULT_DOMAIN_SUFFIX = '.dev.test'
const ENV_PATH = resolve('.env')
const CERTS_DIR = resolve('services/proxy/certs')

type CheckLevel = 'pass' | 'warn' | 'fail'

interface CheckResult {
  level: CheckLevel
  message: string
}

const normalizeDomainSuffix = (value: string) => {
  const trimmed = value.trim().toLowerCase()
  if (!trimmed) {
    return DEFAULT_DOMAIN_SUFFIX
  }

  return trimmed.startsWith('.') ? trimmed : `.${trimmed}`
}

const isValidDomainSuffix = (value: string) => {
  return /^\.[a-z0-9]+([.-][a-z0-9]+)*$/.test(value)
}

const readEnvValue = (filePath: string, key: string) => {
  if (!existsSync(filePath)) {
    return null
  }

  const lines = readFileSync(filePath, 'utf8').split('\n')
  const line = lines.find((entry) => entry.startsWith(`${key}=`))
  if (!line) {
    return null
  }

  return line.slice(`${key}=`.length).trim()
}

const checkDockerProxy = async (): Promise<CheckResult> => {
  try {
    const { stdout } = await execa(
      'docker',
      ['compose', 'ps', '--status', 'running', 'nginx-proxy'],
      { stdio: 'pipe' },
    )
    if (stdout.includes('nginx-proxy')) {
      return { level: 'pass', message: 'nginx-proxy container is running.' }
    }
    return {
      level: 'warn',
      message: 'nginx-proxy container is not running (HTTPS probe may fail).',
    }
  } catch {
    return {
      level: 'warn',
      message:
        'Could not query Docker status (is Docker running?). HTTPS probe may fail.',
    }
  }
}

const checkDnsmasqListener = async (): Promise<CheckResult> => {
  try {
    const { stdout } = await execa('lsof', ['-nP', '-iUDP:53535'], {
      stdio: 'pipe',
    })
    if (stdout.includes('dnsmasq') && stdout.includes('127.0.0.1:53535')) {
      return {
        level: 'pass',
        message: 'dnsmasq is listening on 127.0.0.1:53535.',
      }
    }
    return {
      level: 'fail',
      message: 'dnsmasq is not listening on 127.0.0.1:53535.',
    }
  } catch {
    return {
      level: 'fail',
      message: 'Could not read UDP listeners; dnsmasq may not be running.',
    }
  }
}

const checkWildcardDns = async (host: string): Promise<CheckResult> => {
  try {
    const { stdout } = await execa(
      'dig',
      ['+short', host, '@127.0.0.1', '-p', '53535'],
      { stdio: 'pipe' },
    )
    const records = stdout
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)

    if (records.includes('127.0.0.1')) {
      return {
        level: 'pass',
        message: `dnsmasq resolves ${host} to 127.0.0.1.`,
      }
    }
    return {
      level: 'fail',
      message: `dnsmasq did not return 127.0.0.1 for ${host}.`,
    }
  } catch {
    return {
      level: 'fail',
      message: `DNS query failed for ${host} against 127.0.0.1:53535.`,
    }
  }
}

const checkSystemDns = async (host: string): Promise<CheckResult> => {
  if (process.platform === 'darwin') {
    try {
      const { stdout } = await execa(
        'dscacheutil',
        ['-q', 'host', '-a', 'name', host],
        { stdio: 'pipe' },
      )
      if (stdout.includes('ip_address: 127.0.0.1')) {
        return { level: 'pass', message: `System resolver resolves ${host}.` }
      }
      return {
        level: 'warn',
        message: `System resolver output did not show 127.0.0.1 for ${host}.`,
      }
    } catch {
      return {
        level: 'warn',
        message: 'Could not query macOS DNS cache with dscacheutil.',
      }
    }
  }

  return {
    level: 'warn',
    message: 'System resolver check is currently implemented only for macOS.',
  }
}

const checkHttpsProbe = async (host: string): Promise<CheckResult> => {
  try {
    await execa(
      'curl',
      ['-fsSkL', '--max-time', '5', `https://${host}/`],
      { stdio: 'pipe' },
    )
    return {
      level: 'pass',
      message: `HTTPS probe succeeded for https://${host}/`,
    }
  } catch {
    return {
      level: 'warn',
      message: `HTTPS probe failed for https://${host}/ (start services and check VIRTUAL_HOST).`,
    }
  }
}

export const doctorCommand = new Command('doctor')
  .description('Run local proxy DNS/HTTPS diagnostics')
  .option(
    '-d, --domain <domain>',
    'Domain suffix override (defaults to DOMAIN from .env)',
  )
  .option('-H, --host <host>', 'Host to probe over DNS/HTTPS checks')
  .option('--https', 'Run HTTPS probe (use with --host)')
  .action(async (options) => {
    const failures: CheckResult[] = []
    const warnings: CheckResult[] = []
    let totalChecks = 0

    const addResult = (result: CheckResult) => {
      totalChecks += 1
      if (result.level === 'pass') {
        consola.success(result.message)
        return
      }

      if (result.level === 'warn') {
        warnings.push(result)
        consola.warn(result.message)
        return
      }

      failures.push(result)
      consola.error(result.message)
    }

    try {
      const domainSuffix = normalizeDomainSuffix(
        options.domain ?? readEnvValue(ENV_PATH, 'DOMAIN') ?? DEFAULT_DOMAIN_SUFFIX,
      )
      if (!isValidDomainSuffix(domainSuffix)) {
        consola.error(
          `Invalid domain suffix "${domainSuffix}". Expected format like ".dev.test".`,
        )
        process.exit(1)
      }

      const rootDomain = domainSuffix.slice(1)
      const host = options.host ?? `doctor${domainSuffix}`
      const certFile = join(CERTS_DIR, `${rootDomain}.crt`)
      const keyFile = join(CERTS_DIR, `${rootDomain}.key`)

      consola.info(`Running doctor checks for domain: ${domainSuffix}`)
      consola.info(`Probe host: ${host}`)

      addResult({
        level: existsSync(certFile) ? 'pass' : 'fail',
        message: existsSync(certFile)
          ? `Certificate found: ${certFile}`
          : `Missing certificate file: ${certFile}`,
      })
      addResult({
        level: existsSync(keyFile) ? 'pass' : 'fail',
        message: existsSync(keyFile)
          ? `Private key found: ${keyFile}`
          : `Missing private key file: ${keyFile}`,
      })

      if (process.platform === 'darwin') {
        const resolverPath = `/etc/resolver/${rootDomain}`
        if (!existsSync(resolverPath)) {
          addResult({
            level: 'fail',
            message: `Missing resolver file: ${resolverPath}`,
          })
        } else {
          const resolverContent = readFileSync(resolverPath, 'utf8')
          const hasNameserver = resolverContent.includes('nameserver 127.0.0.1')
          const hasPort = resolverContent.includes('port 53535')
          addResult({
            level: hasNameserver && hasPort ? 'pass' : 'fail',
            message:
              hasNameserver && hasPort
                ? `Resolver file looks correct: ${resolverPath}`
                : `Resolver file is present but does not contain expected values: ${resolverPath}`,
          })
        }
      } else {
        addResult({
          level: 'warn',
          message: 'Resolver file checks are currently implemented only for macOS.',
        })
      }

      addResult(await checkDockerProxy())
      addResult(await checkDnsmasqListener())
      addResult(await checkWildcardDns(host))
      addResult(await checkSystemDns(host))

      if (options.https) {
        if (!options.host) {
          addResult({
            level: 'warn',
            message:
              'HTTPS probe requested without --host; skipping HTTPS check.',
          })
        } else {
          addResult(await checkHttpsProbe(host))
        }
      }

      consola.box(
        [
          `Doctor summary`,
          `pass: ${totalChecks - failures.length - warnings.length}`,
          `warn: ${warnings.length}`,
          `fail: ${failures.length}`,
        ].join('\n'),
      )

      if (failures.length > 0) {
        process.exit(1)
      }
    } catch (error) {
      consola.error('Doctor failed:', error)
      process.exit(1)
    }
  })
