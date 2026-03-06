import { Command } from 'commander'
import consola from 'consola'
import { validateProfile, execDocker } from '../utils'

export const configCommand = new Command('config')
  .description('Show resolved docker compose config')
  .argument('[profile]', 'Docker compose profile to use', 'proxy')
  .action(async (profile: string) => {
    try {
      if (!(await validateProfile(profile))) {
        consola.error(
          `Profile "${profile}" does not exist in any docker-compose file`,
        )
        process.exit(1)
      }

      consola.info(`Rendering docker compose config for profile: ${profile}`)
      await execDocker(['compose', '--profile', profile, 'config'])
    } catch (error) {
      consola.error('Error rendering docker compose config:', error)
      process.exit(1)
    }
  })
