import { Command, Option } from 'commander'
import consola from 'consola'
import { readFileSync } from 'fs'
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs'

export const pushCommand = new Command('push')
  .description('Push JSON content from a file to an SQS queue')
  .addOption(
    new Option('--json <jsonContent>', 'json content').conflicts('file'),
  )
  .addOption(
    new Option('--file <filepath>', 'Path to the JSON file to push').conflicts(
      'json',
    ),
  )
  .option('--base64')
  .requiredOption('-q, --queue <queue>', 'Name of the SQS queue')
  .action(
    async (options: {
      queue: string
      json: string
      file: string
      base64: string
    }) => {
      try {
        let fileContent: string | undefined = undefined

        if (options.file) {
          // Read the JSON file
          fileContent = readFileSync(options.file, 'utf-8')
        }

        if (!options.json && !fileContent) {
          consola.error('Provide json or file:')
          process.exit(1)
        }

        // Initialize SQS client with LocalStack endpoint
        const sqs = new SQSClient({
          endpoint: 'http://localhost:4566',
          region: 'us-east-1',
          credentials: {
            accessKeyId: 'test',
            secretAccessKey: 'test',
          },
        })

        // Construct the queue URL using LocalStack endpoint
        const queueUrl = `http://localhost:4566/000000000000/${options.queue}`

        let messageBody = options.json || fileContent!

        if (options.base64) {
          messageBody = Buffer.from(messageBody).toString('base64')
        }

        // Create the message command
        const command = new SendMessageCommand({
          QueueUrl: queueUrl,
          MessageBody: messageBody,
        })

        // Send the message
        await sqs.send(command)
        consola.success(
          `Successfully pushed message to queue: ${options.queue}`,
        )
      } catch (error) {
        consola.error('Error pushing message to queue:', error)
        process.exit(1)
      }
    },
  )
