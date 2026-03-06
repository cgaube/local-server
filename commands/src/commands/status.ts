import { Command } from 'commander'
import consola from 'consola'
import { execDocker } from '../utils/exec.js'

export const statusCommand = new Command('status')
  .description('Show status of docker compose services')
  .action(async () => {
    try {
      consola.info('Checking status of all services')
      await execDocker(['compose', 'ps'])
    } catch (error) {
      consola.error('Error checking service status:', error)
      process.exit(1)
    }
  })
