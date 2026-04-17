import { Command } from 'commander'
import consola from 'consola'
import inquirer from 'inquirer'
import { existsSync } from 'fs'
import { resolve, relative } from 'path'
import {
  execInDir,
  isDockerRunning,
  ensureBrewInstalled,
  ensureBrewTap,
  hasCommand,
  installBrewPackages,
} from '../utils'

const TERRAFORM_DIR = resolve('scripts/terraform')
const DEFAULT_TFVARS = resolve('terraform.tfvars')

export const awslocalCommand = new Command('awslocal').description(
  'Manage awslocal environment',
)

awslocalCommand
  .command('setup')
  .description('Setup localstack resources using Terraform')
  .option('-v, --vars <path>', 'Path to terraform.tfvars file', DEFAULT_TFVARS)
  .option('--no-init', 'Skip terraform init')
  .option('-y, --yes', 'Skip prompts and install missing tooling', false)
  .action(async (options) => {
    try {
      const tfvarsPath = resolve(options.vars)
      const relativePath = relative(process.cwd(), tfvarsPath)

      // Ensure localstack tooling is installed
      if (!(await hasCommand('tflocal'))) {
        await ensureBrewInstalled(
          'Homebrew is required to install terraform tooling.',
        )

        consola.info('Missing required command: tflocal')
        consola.info('This setup can install required tooling:')
        consola.info('- awscli')
        consola.info('- hashicorp/tap/terraform')
        consola.info('- terraform-local')
        consola.info('- awscli-local')

        let installConfirmed = options.yes
        if (!options.yes) {
          const answer = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'install',
              message: 'Install terraform tooling with Homebrew now?',
              default: true,
            },
          ])
          installConfirmed = answer.install
        }

        if (!installConfirmed) {
          throw new Error('Missing tflocal. Install tooling and re-run setup.')
        }

        consola.info('Adding Homebrew tap: hashicorp/tap')
        await ensureBrewTap('hashicorp/tap')
        await installBrewPackages([
          'awscli',
          'hashicorp/tap/terraform',
          'terraform-local',
          'awscli-local',
        ])

        if (!(await hasCommand('tflocal'))) {
          throw new Error(
            'tflocal is still unavailable after install. Check your shell PATH and retry.',
          )
        }
      }

      // Verify terraform.tfvars exists
      if (!existsSync(tfvarsPath)) {
        consola.error(
          `${relativePath} not found. Please create it from terraform.tfvars.example`,
        )
        process.exit(1)
      }

      if (!(await isDockerRunning())) {
        consola.error('Docker is not running. Start Docker and retry setup.')
        process.exit(1)
      }

      consola.info('Setting up resources...')
      consola.info(`Using terraform vars from: ${relativePath}`)

      // Execute terraform init first to ensure workspace is initialized
      if (options.init) {
        consola.start('Initializing Terraform...')
        await execInDir('tflocal', ['init'], TERRAFORM_DIR)
      }

      // Apply terraform configuration
      consola.start('Applying Terraform configuration...')
      await execInDir(
        'tflocal',
        ['apply', '-auto-approve', `--var-file=${tfvarsPath}`],
        TERRAFORM_DIR,
      )

      consola.success('Resources setup completed successfully')
    } catch (error) {
      consola.error('Error setting up localstack resources:', error)
      process.exit(1)
    }
  })
