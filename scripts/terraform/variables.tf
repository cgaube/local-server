data "external" "list_directories" {
  program = ["bash", "./scripts/bucket_list.sh", var.s3_buckets_folder]
}

locals {
  s3_buckets = split(",", data.external.list_directories.result.directories)
  s3_init_last_modified = data.external.list_directories.result.last_modified
}

variable "s3_buckets_folder" {
  description = "Folder to fetch the list of S3 buckets from"
  type = string
}

variable "sqs_queues" {
  description = "SQS queues to create"
  type = list(string)
  default = []
}

variable "dynamodb_tables" {
  description = "A map of variables"
  type = map(
    map(string)
  )
  default = {
    default = {
      table = "default"
      billing_mode = "PAY_PER_REQUEST"
      index = "id"
      ttl = false
    }
  }
}

variable "lambdas_functions" {
  description = "A map of lambda_functions"
  type = map(object({
    function_name  = string
    source         = string
    s3_key         = string
    handler        = string
    runtime        = string
    architectures  = optional(list(string), ["x86_64"])
  }))
  default = {}
}

variable "lambdas_functions_env" {
  description = "A map of lambda functions env variables"
  type = map(
    map(string)
  )
  default = {}
}

variable "secrets_binary" {
  description = "A map of secrets to upload to secrets manager"
  type = map(string)
  default = {}
}

variable "secrets_string" {
  description = "A map of secrets to upload to secrets manager"
  type = map(any)
  default = {}
}

variable "secrets_json" {
  description = "A map of secrets to upload to secrets manager"
  type = map(any)
  default = {}
}
