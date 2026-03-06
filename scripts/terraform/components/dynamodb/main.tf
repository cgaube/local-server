resource "aws_dynamodb_table" "dynamodb_tables" {
  for_each = var.tables

  name = lookup(var.tables[each.key], "table", each.key)
  hash_key = lookup(var.tables[each.key], "index", "id")
  billing_mode = lookup(var.tables[each.key], "billing_mode", "PAY_PER_REQUEST")

  attribute {
    name = lookup(var.tables[each.key], "index", "id")
    type = "S"
  }

  ttl {
    attribute_name = lookup(var.tables[each.key], "ttl", null)
    enabled  = lookup(var.tables[each.key], "ttl", "") == "" ? false : true
  }
}
