// CLI entrypoint. Run `./server --help` for the current command list.

import { Command } from 'commander'
import { commands } from './commands'

const program = new Command()
  .name('server')
  .description('CLI to manage docker compose services')
  .version('0.1.0')

for (const command of commands) {
  program.addCommand(command)
}

program.parse()