import { Command } from 'commander'
import consola from 'consola'
import { resolve } from 'path'
import { execInDir } from '../utils/exec.js'
import { execa } from 'execa'
import { pushCommand } from './webhook-gateway/push.js'

const LAMBDA_DIR = resolve('scripts/lambda/webhook-gateway')

const checkNgrokInstallation = async (): Promise<boolean> => {
  try {
    await execa('which', ['ngrok'])
    return true
  } catch {
    consola.error('ngrok is not installed!')
    consola.info('\nTo install ngrok:')
    consola.info('  brew install ngrok')
    consola.info('\nAfter installation, configure your authtoken:')
    consola.info('  ngrok config add-authtoken <your-token>')
    consola.info(
      '\nFor more information visit: https://ngrok.com/docs/getting-started/\n',
    )
    return false
  }
}

export const webhookGatewayCommand = new Command('webhook-gateway').description(
  'Manage webhook gateway lambda functions',
)

webhookGatewayCommand
  .command('build')
  .description('Build webhook gateway lambda using SAM')
  .action(async () => {
    try {
      consola.info('Building webhook gateway lambda...')
      await execInDir('sam', ['build'], LAMBDA_DIR)
      consola.success('Webhook gateway lambda built successfully')
    } catch (error) {
      consola.error('Error building webhook gateway:', error)
      process.exit(1)
    }
  })

webhookGatewayCommand
  .command('start')
  .description('Start webhook gateway lambda locally')
  .action(async () => {
    try {
      consola.info('Starting webhook gateway lambda...')
      await execInDir(
        'sam',
        ['local', 'start-api', '-p', '2999', '--docker-network=shared_network'],
        LAMBDA_DIR,
      )
      consola.success('Webhook gateway lambda started successfully')
    } catch (error) {
      consola.error('Error starting webhook gateway:', error)
      process.exit(1)
    }
  })

webhookGatewayCommand
  .command('receive')
  .description('Start ngrok for webhook forwarding')
  .option('-u, --url <url>', 'ngrok url to use', 'cgaube6was.internal')
  .option('-p, --port <port>', 'port to forward to', '2999')
  .action(async (options) => {
    try {
      // Check if ngrok is installed first
      if (!(await checkNgrokInstallation())) {
        process.exit(1)
      }

      consola.info(`
URL Will be https://${options.url}.blockcloud.ngrok.app}`)

      consola.info(`Starting ngrok forwarding to port ${options.port}...`)
      await execa('ngrok', ['http', `--url=${options.url}`, options.port], {
        stdio: 'inherit',
      })
    } catch (error) {
      consola.error('Error starting ngrok:', error)
      process.exit(1)
    }
  })

webhookGatewayCommand.addCommand(pushCommand)
