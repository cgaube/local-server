import { Command } from 'commander'
import consola from 'consola'
import { validateProfile } from '../utils/docker.js'
import { execDocker } from '../utils/exec.js'

export const stopCommand = new Command('stop')
  .description('Stop docker compose services')
  .alias('down')
  .argument('[profile]', 'Docker compose profile to use', 'proxy')
  .action(async (profile: string) => {
    try {
      if (!(await validateProfile(profile))) {
        consola.error(
          `Profile "${profile}" does not exist in any docker-compose file`,
        )
        process.exit(1)
      }

      consola.info(`Stopping services with profile: ${profile}`)
      await execDocker(['compose', '--profile', profile, 'down'])
      consola.success('Services stopped successfully')
    } catch (error) {
      consola.error('Error stopping services:', error)
      process.exit(1)
    }
  })
