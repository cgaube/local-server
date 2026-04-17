# Terraform

This folder contains Terraform code used by `./server awslocal setup` to
provision local AWS-like resources in local LocalStack or Ministack

## What Gets Provisioned

The root module wires component modules under `components/` and can create:

- S3 buckets (from folder names under `s3_buckets_folder`)
- SQS queues (plus a dead-letter queue)
- DynamoDB tables
- Lambda functions and Lambda Function URLs
- Secrets Manager entries (`secrets_*` variables)

## Prerequisites

- Docker running
- LocalStack or Ministack running (`./server start awslocal`)
- Terraform tooling available (`tflocal`)
- A project-level `terraform.tfvars` file in the repo root
