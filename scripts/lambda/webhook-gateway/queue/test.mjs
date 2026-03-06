#!/usr/bin/env node

import { SQSClient, SendMessageCommand, ListQueuesCommand } from '@aws-sdk/client-sqs'

const queueEndpoint = 'http:/localstack:4566'
const queueName = '000000000000/default'

const queue = new SQSClient({endpoint: queueEndpoint, region: 'us-east-1'})

const input = { // SendMessageRequest
    QueueUrl: `${queueEndpoint}/${queueName}`, // required
    MessageBody: 'test',
};

const command = new SendMessageCommand(input);
const response = await queue.send(command);