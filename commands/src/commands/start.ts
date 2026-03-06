import { Command } from 'commander'
import consola from 'consola'
import { validateProfile } from '../utils/docker.js'
import { execDocker } from '../utils/exec.js'

export const startCommand = new Command('start')
  .description('Start docker compose services')
  .argument('[profile]', 'Docker compose profile to use', 'proxy')
  .option('-f, --fresh', 'Pull latest images', false)
  .action(async (profile: string, options) => {
    try {
      if (!(await validateProfile(profile))) {
        consola.error(
          `Profile "${profile}" does not exist in any docker-compose file`,
        )
        process.exit(1)
      }

      // Check if we need to update
      if (options.fresh === true) {
        // Pull latest images
        consola.info(`Pulling latest images for profile: ${profile}`)
        await execDocker(['compose', '--profile', profile, 'pull'])
        consola.success('Images pulled successfully')

        // Clean up old images
        consola.info('Cleaning up old images...')
        await execDocker(['image', 'prune', '-f'])
        consola.success('Cleanup completed')
      }

      consola.info(`Starting services with profile: ${profile}`)
      await execDocker([
        'compose',
        '--profile',
        profile,
        'up',
        '-d',
        '--remove-orphans',
      ])
      consola.success('Services started successfully')
    } catch (error) {
      consola.error('Error starting services:', error)
      process.exit(1)
    }
  })
