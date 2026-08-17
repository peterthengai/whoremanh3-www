terraform {
  required_version = ">= 1.5.0"

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
  }

  backend "local" {}
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

resource "cloudflare_turnstile_widget" "contact_form" {
  account_id = var.cloudflare_account_id
  name       = "Whoreman H3 contact form"
  domains = [
    "whoremanh3.com",
    "www.whoremanh3.com",
    "whoremanh3-www-preview.necessary-ruby.workers.dev"
  ]
  mode   = "managed"
  region = "world"
}

output "sitekey" {
  description = "Public Turnstile site key used by the contact form build."
  value       = cloudflare_turnstile_widget.contact_form.id
}

output "secret" {
  description = "Turnstile server-side validation secret. Keep it out of Git."
  value       = cloudflare_turnstile_widget.contact_form.secret
  sensitive   = true
}
