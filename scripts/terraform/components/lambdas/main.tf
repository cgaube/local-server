# Folder that will have all the lambda code
resource "aws_s3_bucket" "lambdas" {
  bucket = "lambdas"
}

resource "aws_s3_bucket_versioning" "lambdas" {
  bucket = "lambdas"
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_iam_role" "lambda_exec" {
  name = "lambda_exec_role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Action = "sts:AssumeRole",
        Effect = "Allow",
        Principal = {
          Service = "lambda.amazonaws.com"
        },
      },
    ],
  })
}

resource "aws_iam_role_policy_attachment" "lambda_policy" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# locals {
#   lambdas_with_layers = {
#     for k, v in var.lambdas_functions : k => v if v["layer"] != null
#   }
#   lambdas_zip = {
#     for k, v in var.lambdas_functions : k => v["source"] if v["source"] != null
#   }
# }
#

resource "aws_s3_object" "lambda_files" {
  for_each = var.lambdas_functions

  bucket = aws_s3_bucket.lambdas.bucket
  key    = lookup(each.value, "s3_key", null)
  source = lookup(each.value, "source", null)
  source_hash = filemd5(lookup(each.value, "source", null))
}

resource "aws_lambda_function" "lambdas" {
  for_each = var.lambdas_functions

  role = aws_iam_role.lambda_exec.arn

  function_name = lookup(var.lambdas_functions[each.key], "function_name", null)

  s3_bucket = aws_s3_bucket.lambdas.bucket
  s3_key = aws_s3_object.lambda_files[each.key].key
  # To allow updates to the lambda functions when the source changes
  s3_object_version =  aws_s3_object.lambda_files[each.key].version_id

  handler = lookup(var.lambdas_functions[each.key], "handler", null)
  runtime = lookup(var.lambdas_functions[each.key], "runtime", "ruby3.2")

  environment {
    variables = lookup(var.lambdas_functions_env, each.key, {})
  }

  architectures = lookup(var.lambdas_functions[each.key], "architectures", ["x86_64"])
}

resource "aws_lambda_function_url" "lambda_urls" {
  for_each = var.lambdas_functions

  function_name = aws_lambda_function.lambdas[each.key].function_name

  authorization_type = "NONE" # Use "AWS_IAM" for IAM authorization

  cors {
    allow_origins = ["*"]
  }
}

