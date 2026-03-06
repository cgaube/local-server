module "s3_buckets" {
  source = "./components/s3"
  bucket_names = local.s3_buckets
}

module "sqs_queue" {
  source = "./components/sqs"
  queue_names = var.sqs_queues
}

module "dynamodb" {
  source = "./components/dynamodb"
  tables = var.dynamodb_tables
}

module "lambdas" {
  source = "./components/lambdas"
  lambdas_functions = var.lambdas_functions
  lambdas_functions_env = var.lambdas_functions_env

  # Lambda are stored in the buckets
  depends_on = [module.s3_buckets]
}

