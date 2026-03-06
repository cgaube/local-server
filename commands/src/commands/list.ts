import { Command } from 'commander'
import consola from 'consola'
import { getAvailableProfiles } from '../utils/docker.js'

export const listCommand = new Command('list')
  .description('List all available docker compose profiles')
  .action(async () => {
    try {
      const profiles = await getAvailableProfiles()
      consola.info('Available profiles:')
      ;[...profiles].sort().forEach((profile) => {
        consola.log(`- ${profile}`)
      })
    } catch (error) {
      consola.error('Error listing profiles:', error)
      process.exit(1)
    }
  })
