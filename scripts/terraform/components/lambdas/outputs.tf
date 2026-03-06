output "functions" {
  value = { for k, v in aws_lambda_function.lambdas : k => v }
}
