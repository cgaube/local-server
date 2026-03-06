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
export const lambdaHandler = async (event, context) => {
  console.log('DEBUG WEBHOOK GATEWAY EVENT')
  let messageBody = event['body']

  const bodyObject = JSON.parse(messageBody)
  console.dir(bodyObject, { depth: null, colors: true })

  const bodyStyle = event.queryStringParameters?.body || undefined
  switch (bodyStyle) {
    case 'base64':
      console.log('Base64:')
      console.log(Buffer.from(messageBody).toString('base64'))
      break
  }

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
    },
    body: {},
  }
}
