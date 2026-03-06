import { readFileSync } from 'fs'
import { glob as globAsync } from 'glob'
import { load } from 'js-yaml'
import consola from 'consola'
import { execa } from 'execa'

interface DockerComposeConfig {
  services?: {
    [key: string]: {
      profiles?: string[]
    }
  }
}

export const isDockerRunning = async () => {
  try {
    await execa('docker', ['info'], { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

export const getAvailableProfiles = async (): Promise<Set<string>> => {
  const profiles = new Set<string>()

  try {
    // Find all docker-compose.yml files in services and custom directories
    const files = await globAsync([
      'services/**/docker-compose.yml',
      'custom/**/docker-compose.yml',
    ])

    for (const file of files) {
      try {
        const content = readFileSync(file, 'utf8')
        const config = load(content) as DockerComposeConfig

        if (config.services) {
          Object.values(config.services).forEach((service) => {
            if (service.profiles) {
              service.profiles.forEach((profile) => profiles.add(profile))
            }
          })
        }
      } catch (error) {
        consola.warn(`Error reading ${file}:`, error)
      }
    }

  } catch (error) {
    consola.error('Error scanning for docker-compose files:', error)
  }

  return profiles
}

export const validateProfile = async (profile: string): Promise<boolean> => {
  const profiles = await getAvailableProfiles()
  return profiles.has(profile)
}
