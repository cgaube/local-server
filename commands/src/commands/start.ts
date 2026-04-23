import { Command } from 'commander'
import consola from 'consola'
import {
  execDocker,
  getDockerComposeProfileArgs,
  resolveProfiles,
} from '../utils'

export const startCommand = new Command('start')
  .description('Start docker compose services')
  .argument('[profiles...]', 'Docker compose profiles to use')
  .option('-f, --fresh', 'Pull latest images', false)
  .action(async (profiles: string[] = [], options) => {
    try {
      const resolvedProfiles = await resolveProfiles(
        profiles,
        'Select services to start',
      )
      const profileArgs = getDockerComposeProfileArgs(resolvedProfiles)
      const profileLabel = resolvedProfiles.join(', ')

      if (options.fresh === true) {
        consola.info(`Pulling latest images for profiles: ${profileLabel}`)
        await execDocker(['compose', ...profileArgs, 'pull'])
        consola.success('Images pulled successfully')

        consola.info('Cleaning up old images...')
        await execDocker(['image', 'prune', '-f'])
        consola.success('Cleanup completed')
      }

      consola.info(`Starting services with profiles: ${profileLabel}`)
      await execDocker(['compose', ...profileArgs, 'up', '-d', '--remove-orphans'])
      consola.success('Services started successfully')
    } catch (error) {
      consola.error('Error starting services:', error)
      process.exit(1)
    }
  })
