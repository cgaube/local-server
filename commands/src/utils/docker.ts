import inquirer from 'inquirer'
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

export const getDockerComposeProfileArgs = (profiles: string[]) => {
  return profiles.flatMap((profile) => ['--profile', profile])
}

export const resolveProfiles = async (
  requestedProfiles: string[],
  promptMessage: string,
) => {
  const availableProfiles = [...(await getAvailableProfiles())].sort()

  if (requestedProfiles.length > 0) {
    const uniqueProfiles = [...new Set(requestedProfiles)]
    const invalidProfiles = uniqueProfiles.filter(
      (profile) => !availableProfiles.includes(profile),
    )

    if (invalidProfiles.length > 0) {
      throw new Error(
        `Profile${invalidProfiles.length > 1 ? 's' : ''} "${invalidProfiles.join('", "')}" do${invalidProfiles.length > 1 ? '' : 'es'} not exist in any docker-compose file`,
      )
    }

    return uniqueProfiles
  }

  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error(
      'No profile was provided and interactive selection is unavailable in this terminal. Pass one or more profiles as arguments.',
    )
  }

  const { profiles } = await inquirer.prompt<{ profiles: string[] }>([
    {
      type: 'checkbox',
      name: 'profiles',
      message: promptMessage,
      choices: availableProfiles.map((profile) => ({
        name: profile,
        value: profile,
      })),
      validate: (value: string[]) => {
        return value.length > 0 ? true : 'Select at least one profile.'
      },
    },
  ])

  return profiles
}
