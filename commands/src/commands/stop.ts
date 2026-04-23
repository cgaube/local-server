import { Command } from 'commander'
import consola from 'consola'
import {
  execDocker,
  getDockerComposeProfileArgs,
  resolveProfiles,
} from '../utils'

export const stopCommand = new Command('stop')
  .description('Stop docker compose services')
  .alias('down')
  .argument('[profiles...]', 'Docker compose profiles to use')
  .action(async (profiles: string[] = []) => {
    try {
      const resolvedProfiles = await resolveProfiles(
        profiles,
        'Select services to stop',
      )
      const profileArgs = getDockerComposeProfileArgs(resolvedProfiles)
      const profileLabel = resolvedProfiles.join(', ')

      consola.info(`Stopping services with profiles: ${profileLabel}`)
      await execDocker(['compose', ...profileArgs, 'down'])
      consola.success('Services stopped successfully')
    } catch (error) {
      consola.error('Error stopping services:', error)
      process.exit(1)
    }
  })
