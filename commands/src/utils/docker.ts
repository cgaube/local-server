import { execa } from 'execa'
import { execDocker } from './exec.js'

export const isDockerRunning = async () => {
  try {
    await execa('docker', ['info'], { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

export const getAvailableProfiles = async (): Promise<Set<string>> => {
  const { stdout } = await execDocker(['compose', 'config', '--profiles'], {
    capture: true,
  })
  return new Set(
    (stdout ?? '')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean),
  )
}

export const validateProfile = async (profile: string): Promise<boolean> => {
  const profiles = await getAvailableProfiles()
  return profiles.has(profile)
}