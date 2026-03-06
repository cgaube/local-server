# Secrets
# Obviously not secure at all and should never be used like this in production
resource "aws_secretsmanager_secret" "secrets" {
  for_each = merge(var.secrets_binary, var.secrets_string, var.secrets_json)

  name        = each.key
  description = each.key
}

resource "aws_secretsmanager_secret_version" "secret_values_binary" {
  for_each = var.secrets_binary
  secret_id     = aws_secretsmanager_secret.secrets[each.key].id
  secret_binary = base64encode(each.value)
}

resource "aws_secretsmanager_secret_version" "secret_values_string" {
  for_each = var.secrets_string

  secret_id     = aws_secretsmanager_secret.secrets[each.key].id
  secret_string = each.value
}

resource "aws_secretsmanager_secret_version" "secret_values_json" {
  for_each = var.secrets_json

  secret_id     = aws_secretsmanager_secret.secrets[each.key].id
  secret_string = jsonencode(each.value)
}
