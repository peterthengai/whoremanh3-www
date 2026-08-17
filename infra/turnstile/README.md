# Turnstile infrastructure

This Terraform configuration owns the managed Turnstile widget for the public contact form. It allows the production apex and `www` hostnames plus the isolated preview hostname.

The state contains the widget secret and must never be committed. Initialize the local backend with an explicit state path outside the repository, such as:

```powershell
$stateDirectory = Join-Path $env:LOCALAPPDATA "WhoremanH3\terraform"
New-Item -ItemType Directory -Force -Path $stateDirectory | Out-Null
terraform -chdir=infra/turnstile init -backend-config="path=$(Join-Path $stateDirectory 'turnstile.tfstate')"
```

Supply a temporary account-owned Cloudflare API token with only `Turnstile Sites Write` through `TF_VAR_cloudflare_api_token`, then use the normal `terraform plan` and `terraform apply` workflow. Revoke that token after the apply unless it is being retained in an approved credential manager or CI secret store.

The public `sitekey` belongs in the site build. Transfer the sensitive `secret` directly to the Worker binding named `TURNSTILE_SECRET`; do not print it or copy it into configuration files. The current widget was applied on August 10, 2026, and the temporary apply token was revoked afterward.
