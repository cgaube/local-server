import { Command } from 'commander'
import consola from 'consola'
import inquirer from 'inquirer'
import { execa } from 'execa'
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from 'fs'
import { homedir } from 'os'
import { dirname, resolve, join } from 'path'
import {
  ensureBrewInstalled,
  hasCommand,
  installBrewPackages,
  isBrewPackageInstalled,
} from '../utils'

const DEFAULT_DOMAIN_SUFFIX = '.dev.test'
const RECOMMENDED_DOMAIN_SUFFIX = '.dev.test'
const PROJECT_ROOT = dirname(process.execPath)
const ENV_PATH = resolve(PROJECT_ROOT, '.env')
const CERTS_DIR = resolve(PROJECT_ROOT, 'services/proxy/certs')

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

const upsertEnvValue = (filePath: string, key: string, value: string) => {
  const nextLine = `${key}=${value}`

  if (!existsSync(filePath)) {
    writeFileSync(filePath, `${nextLine}\n`, 'utf8')
    return
  }

  const lines = readFileSync(filePath, 'utf8').trimEnd().split('\n')
  const index = lines.findIndex((line) => line.startsWith(`${key}=`))

  if (index >= 0) {
    lines[index] = nextLine
  } else {
    lines.push(nextLine)
  }

  writeFileSync(filePath, `${lines.join('\n')}\n`, 'utf8')
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

const getBrewPrefix = async () => {
  try {
    const { stdout } = await execa('brew', ['--prefix'], { stdio: 'pipe' })
    return stdout.trim()
  } catch {
    return null
  }
}

const restartDnsmasqService = async (brewPrefix: string) => {
  const brewBinary = join(brewPrefix, 'bin', 'brew')
  const userLaunchAgentPath = join(
    homedir(),
    'Library',
    'LaunchAgents',
    'homebrew.mxcl.dnsmasq.plist',
  )

  if (existsSync(userLaunchAgentPath)) {
    consola.warn(
      `Found user LaunchAgent for dnsmasq at ${userLaunchAgentPath}. Stopping it before starting root-managed service.`,
    )
    try {
      await execa('brew', ['services', 'stop', 'dnsmasq'], { stdio: 'inherit' })
    } catch {
      consola.warn('Failed to stop user dnsmasq service, continuing anyway.')
    }
  }

  await execa('sudo', [brewBinary, 'services', 'restart', 'dnsmasq'], {
    stdio: 'inherit',
  })
}

const setupMacWildcardResolver = async (rootDomain: string) => {
  const brewPrefix = await getBrewPrefix()
  if (!brewPrefix) {
    throw new Error('Homebrew is required for dnsmasq setup on macOS.')
  }

  const dnsmasqDir = join(brewPrefix, 'etc', 'dnsmasq.d')
  mkdirSync(dnsmasqDir, { recursive: true })

  const dnsmasqConfigPath = join(dnsmasqDir, 'local-server.conf')
  const dnsmasqConfig = [
    'listen-address=127.0.0.1',
    'port=53535',
    `address=/${rootDomain}/127.0.0.1`,
    '',
  ].join('\n')

  writeFileSync(dnsmasqConfigPath, dnsmasqConfig, 'utf8')

  await restartDnsmasqService(brewPrefix)

  const resolverBody = ['nameserver 127.0.0.1', 'port 53535', ''].join('\n')
  const resolverTmpPath = join('/tmp', `local-server-resolver-${rootDomain}`)
  writeFileSync(resolverTmpPath, resolverBody, 'utf8')

  try {
    await execa('sudo', ['mkdir', '-p', '/etc/resolver'], { stdio: 'inherit' })
    await execa(
      'sudo',
      ['cp', resolverTmpPath, `/etc/resolver/${rootDomain}`],
      {
        stdio: 'inherit',
      },
    )
  } finally {
    if (existsSync(resolverTmpPath)) {
      unlinkSync(resolverTmpPath)
    }
  }
}

const setupLocalCert = async (rootDomain: string) => {
  mkdirSync(CERTS_DIR, { recursive: true })

  const certFile = join(CERTS_DIR, `${rootDomain}.crt`)
  const keyFile = join(CERTS_DIR, `${rootDomain}.key`)

  await execa('mkcert', ['-install'], { stdio: 'inherit' })
  await execa(
    'mkcert',
    [
      '-cert-file',
      certFile,
      '-key-file',
      keyFile,
      rootDomain,
      `*.${rootDomain}`,
    ],
    { stdio: 'inherit' },
  )

  return { certFile, keyFile }
}

const getCertPaths = (rootDomain: string) => {
  return {
    certFile: join(CERTS_DIR, `${rootDomain}.crt`),
    keyFile: join(CERTS_DIR, `${rootDomain}.key`),
  }
}

const getExistingCertDomains = () => {
  if (!existsSync(CERTS_DIR)) {
    return []
  }

  const files = readdirSync(CERTS_DIR)
  return files
    .filter((name) => name.endsWith('.crt'))
    .map((name) => name.slice(0, -4))
    .sort()
}

export const setupCommand = new Command('setup')
  .description('Setup local wildcard domain + HTTPS for nginx proxy')
  .option('-d, --domain <domain>', 'Domain suffix (example: .dev.test)')
  .option('-y, --yes', 'Skip prompts and accept defaults', false)
  .action(async (options) => {
    try {
      if (process.platform === 'darwin') {
        await ensureBrewInstalled('Homebrew is required for macOS DNS setup.')

        const brewPackages = [
          { name: 'mkcert', description: 'local certificate authority' },
          { name: 'nss', description: 'Firefox certificate trust support' },
          { name: 'dnsmasq', description: 'wildcard DNS resolver' },
        ]
        const missingPackages: { name: string; description: string }[] = []

        consola.info('Checking required Homebrew packages')
        for (const pkg of brewPackages) {
          if (!(await isBrewPackageInstalled(pkg.name))) {
            missingPackages.push(pkg)
          }
        }

        if (missingPackages.length > 0) {
          consola.info('Missing Homebrew packages required for macOS setup:')
          missingPackages.forEach((pkg) => {
            consola.info(`- ${pkg.name} (${pkg.description})`)
          })
        } else {
          consola.success(
            'All required Homebrew packages are already installed.',
          )
        }

        if (missingPackages.length > 0) {
          let installConfirmed = options.yes
          if (!options.yes) {
            const answer = await inquirer.prompt([
              {
                type: 'confirm',
                name: 'install',
                message:
                  'Install these packages with Homebrew now? (you may be prompted for your password)',
                default: true,
              },
            ])
            installConfirmed = answer.install
          }

          if (!installConfirmed) {
            throw new Error(
              'Cannot continue without required packages. Re-run setup after installing them.',
            )
          }

          missingPackages.forEach((pkg) =>
            consola.info(`Installing ${pkg.name} with Homebrew...`),
          )
          await installBrewPackages(missingPackages.map((pkg) => pkg.name))
        }
      } else {
        if (!(await hasCommand('mkcert'))) {
          throw new Error(
            'mkcert is required. Install it first to generate certificates.',
          )
        }
        consola.warn(
          'Automatic DNS setup is currently only implemented for macOS.',
        )
      }

      const existingCertDomains = getExistingCertDomains()
      if (existingCertDomains.length > 0 && !options.yes) {
        consola.info('Existing proxy certificates detected:')
        existingCertDomains.forEach((domain) => consola.info(`- *.${domain}`))

        const answer = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'continueWithExistingCerts',
            message:
              'Existing certificates are present. Continue setup anyway?',
            default: true,
          },
        ])

        if (!answer.continueWithExistingCerts) {
          throw new Error('Setup canceled because existing certificates exist.')
        }
      }

      let domainSuffix = normalizeDomainSuffix(
        options.domain ?? DEFAULT_DOMAIN_SUFFIX,
      )

      if (!options.yes && !options.domain) {
        const answer = await inquirer.prompt([
          {
            type: 'input',
            name: 'domainSuffix',
            message: `Domain suffix for local services (${RECOMMENDED_DOMAIN_SUFFIX} is recommended):`,
            default: DEFAULT_DOMAIN_SUFFIX,
          },
        ])
        domainSuffix = normalizeDomainSuffix(answer.domainSuffix)
      }

      if (!isValidDomainSuffix(domainSuffix)) {
        consola.error(
          `Invalid domain suffix "${domainSuffix}". Expected format like ".local.dev" or ".test"`,
        )
        process.exit(1)
      }

      const rootDomain = domainSuffix.slice(1)
      const previousDomainRaw = readEnvValue(ENV_PATH, 'DOMAIN')
      const previousDomainSuffix = previousDomainRaw
        ? normalizeDomainSuffix(previousDomainRaw)
        : null
      const previousRootDomain = previousDomainSuffix
        ? previousDomainSuffix.slice(1)
        : ''

      consola.info(`Using domain suffix: ${domainSuffix}`)
      if (domainSuffix !== RECOMMENDED_DOMAIN_SUFFIX) {
        consola.info(
          `Tip: ${RECOMMENDED_DOMAIN_SUFFIX} avoids mDNS collisions often seen with .local`,
        )
      }

      if (
        process.platform === 'darwin' &&
        previousRootDomain.length > 0 &&
        previousRootDomain !== rootDomain
      ) {
        const staleResolverPath = `/etc/resolver/${previousRootDomain}`
        if (existsSync(staleResolverPath)) {
          let removeOldResolver = options.yes
          if (!options.yes) {
            const answer = await inquirer.prompt([
              {
                type: 'confirm',
                name: 'removeOldResolver',
                message: `Remove old macOS resolver file for ${previousRootDomain}?`,
                default: true,
              },
            ])
            removeOldResolver = answer.removeOldResolver
          }

          if (removeOldResolver) {
            await execa('sudo', ['rm', '-f', staleResolverPath], {
              stdio: 'inherit',
            })
            consola.success(
              `Removed old resolver file: /etc/resolver/${previousRootDomain}`,
            )
          }
        }

        const oldCertPaths = getCertPaths(previousRootDomain)
        const oldCertExists =
          existsSync(oldCertPaths.certFile) || existsSync(oldCertPaths.keyFile)
        if (oldCertExists) {
          let removeOldCerts = options.yes
          if (!options.yes) {
            const answer = await inquirer.prompt([
              {
                type: 'confirm',
                name: 'removeOldCerts',
                message: `Remove old certificate files for *.${previousRootDomain}?`,
                default: false,
              },
            ])
            removeOldCerts = answer.removeOldCerts
          }

          if (removeOldCerts) {
            if (existsSync(oldCertPaths.certFile)) {
              unlinkSync(oldCertPaths.certFile)
            }
            if (existsSync(oldCertPaths.keyFile)) {
              unlinkSync(oldCertPaths.keyFile)
            }
            consola.success(
              `Removed old certificate files for *.${previousRootDomain}`,
            )
          }
        }
      }

      upsertEnvValue(ENV_PATH, 'DOMAIN', domainSuffix)
      consola.success(`Updated DOMAIN in ${ENV_PATH}`)

      const certPaths = getCertPaths(rootDomain)
      const certExists = existsSync(certPaths.certFile)
      const keyExists = existsSync(certPaths.keyFile)

      let shouldGenerateCert = true
      if (certExists && keyExists) {
        if (options.yes) {
          shouldGenerateCert = false
          consola.info(
            `Existing certificate detected for *.${rootDomain}; keeping current files in --yes mode.`,
          )
        } else {
          const answer = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'overrideCert',
              message: `A certificate for *.${rootDomain} already exists. Replace it?`,
              default: false,
            },
          ])
          shouldGenerateCert = answer.overrideCert
        }
      } else if (certExists || keyExists) {
        consola.warn(
          'Detected an incomplete certificate pair (only cert or key exists).',
        )
        if (options.yes) {
          shouldGenerateCert = true
          consola.info('Regenerating certificate pair in --yes mode.')
        } else {
          const answer = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'regenerateCert',
              message: `Regenerate certificate files for *.${rootDomain}?`,
              default: true,
            },
          ])
          shouldGenerateCert = answer.regenerateCert
        }
      }

      if (shouldGenerateCert) {
        const { certFile, keyFile } = await setupLocalCert(rootDomain)
        consola.success(`Certificate created: ${certFile}`)
        consola.success(`Private key created: ${keyFile}`)
      } else if (certExists && keyExists) {
        consola.success(`Keeping existing certificate: ${certPaths.certFile}`)
        consola.success(`Keeping existing private key: ${certPaths.keyFile}`)
      } else {
        throw new Error(
          'Certificate setup canceled with incomplete cert files.',
        )
      }

      if (process.platform === 'darwin') {
        await setupMacWildcardResolver(rootDomain)
        consola.success(`Configured macOS wildcard DNS for *.${rootDomain}`)
      }

      consola.box(
        [
          'Setup complete.',
          'If Firefox still warns, enable security.enterprise_roots.enabled in about:config',
        ].join('\n'),
      )
    } catch (error) {
      consola.error('Setup failed:', error)
      process.exit(1)
    }
  })
