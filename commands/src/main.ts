/**
 *
 * This tool manages Docker Compose profiles with the following commands:
 * - server start [profile] -> Starts services with specified profile (default: 'proxy')
 * - server stop [profile] -> Stops services with specified profile (default: 'proxy')
 * - server status -> Shows status of compose services
 * - server config [profile] -> Shows resolved compose config for specified profile
 * - server doctor -> Runs local DNS/HTTPS diagnostics for proxy setup
 * - server list -> Lists all available profiles from docker-compose files
 * - server setup -> Setup local wildcard domain + HTTPS for nginx proxy
 * - server localstack setup -> Setup localstack resources using Terraform
 * - server webhook-gateway build -> Build webhook gateway lambda using SAM
 * - server webhook-gateway start -> Start webhook gateway lambda locally
 * - server webhook-gateway receive -> Start ngrok for webhook forwarding
 */

import { Command } from 'commander'
import {
  startCommand,
  stopCommand,
  statusCommand,
  configCommand,
  doctorCommand,
  listCommand,
  setupCommand,
  awslocalCommand,
  webhookGatewayCommand,
} from './commands'

const program = new Command()

program
  .name('server')
  .description('CLI to manage docker compose services')
  .version('0.1.0')

program
  .addCommand(startCommand)
  .addCommand(stopCommand)
  .addCommand(statusCommand)
  .addCommand(configCommand)
  .addCommand(doctorCommand)
  .addCommand(listCommand)
  .addCommand(setupCommand)
  .addCommand(awslocalCommand)
  .addCommand(webhookGatewayCommand)

program.parse()
