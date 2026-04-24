import { startCommand } from './start.js'
import { stopCommand } from './stop.js'
import { statusCommand } from './status.js'
import { configCommand } from './config.js'
import { doctorCommand } from './doctor.js'
import { listCommand } from './list.js'
import { setupCommand } from './setup.js'
import { awslocalCommand } from './awslocal.js'
import { webhookGatewayCommand } from './webhook-gateway.js'
import { proxyCommand } from './proxy.js'

export const commands = [
  startCommand,
  stopCommand,
  statusCommand,
  configCommand,
  doctorCommand,
  listCommand,
  setupCommand,
  awslocalCommand,
  webhookGatewayCommand,
  proxyCommand,
]