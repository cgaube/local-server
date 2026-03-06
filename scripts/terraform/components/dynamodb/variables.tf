variable "tables" {
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
