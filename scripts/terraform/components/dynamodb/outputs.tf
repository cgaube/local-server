output "tables" {
  value = { for k, v in aws_dynamodb_table.dynamodb_tables : k => v }
}
