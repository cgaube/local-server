/**
 *
 * Event doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format
 * @param {Object} event - API Gateway Lambda Proxy Input Format
 *
 * Context doc: https://docs.aws.amazon.com/lambda/latest/dg/nodejs-prog-model-context.html
 * @param {Object} context
 *
 * Return doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
 * @returns {Object} object - API Gateway Lambda Proxy Output Format
 */
import {
  SQSClient,
  SendMessageCommand,
  ListQueuesCommand,
  GetQueueUrlCommand,
  GetQueueAttributesCommand,
} from '@aws-sdk/client-sqs'

// TODO: Make that configurable
const queueEndpoint = 'http:/localstack:4566'
const region = 'us-east-1'

/* Only compatible with json format*/
export const lambdaHandler = async (event, context) => {
  console.log('QUEUE WEBHOOK GATEWAY EVENT')
  const queue = new SQSClient({ endpoint: queueEndpoint, region: region })

  const bodyStyle = event.queryStringParameters?.body || undefined
  const queueName = event.queryStringParameters?.queue || undefined
  const debug = event.queryStringParameters?.debug || undefined
  const contentType = event['headers']['Content-Type'] || 'application/json'

  // Queue url is without the port somehow.
  const queueUrl = `http://localstack/000000000000/${queueName}`

  let messageBody = event['body']

  switch (bodyStyle) {
    case 'base64':
      messageBody = Buffer.from(event['body']).toString('base64')
      break
  }

  const bodyObject = JSON.parse(messageBody)
  if (debug) {
    console.dir(bodyObject, { depth: null, colors: true })
  }

  const input = {
    // SendMessageRequest
    QueueUrl: queueUrl,
    MessageBody: messageBody,
  }

  console.debug(`Send to queue ${queueUrl}`)

  const command = new SendMessageCommand(input)
  const queueResponse = await queue.send(command)

  try {
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'pong',
      }),
      /*'body': JSON.stringify({
                ping: "pong",
                type: contentType,
                //body: messageBody,
                queueUrlConst: queueUrl,
                //response: queueResponse
            })*/
    }
  } catch (err) {
    console.log(`Error !:`, err)
    return err
  }
}
