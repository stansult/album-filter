# Netlify + Cloudflare Setup (Album Filter Playground)

This project hosts the test playground as a static site from the `test/` folder.

## 1. Netlify Site Setup

1. In Netlify, create/import a site from this Git repository.
2. Configure build settings:
   - Publish directory: `test`
   - Build command: *(empty)*
3. Use `netlify.toml` (already present in this repo) for the static publish directory.
4. Follow [test-gated deployment setup](deployment.md) to add GitHub secrets and stop independent Netlify builds.

### What this does

- Serves static files directly from `test/`.
- GitHub Actions tests changes before publishing; see the deployment guide for baseline and skip behavior.

## 2. Netlify Custom Domain

1. In Netlify site settings, open **Domain management**.
2. Add custom domain:
   - `album-filter.stansult.com` (or your preferred subdomain)
3. Keep the Netlify-provided target hostname ready (example format: `your-site-name.netlify.app`).

## 3. Cloudflare DNS

In Cloudflare DNS for `stansult.com` (or your domain):

1. Add/Update a `CNAME` record:
   - Name: `album-filter`
   - Target: your Netlify hostname (for example `your-site-name.netlify.app`)
2. Proxy mode:
   - Start with **DNS only** while verifying domain setup.
   - You can enable proxy later if desired.

## 4. SSL / Verification

1. Wait for DNS propagation.
2. In Netlify domain management, confirm domain verification succeeds.
3. Ensure HTTPS is active.
4. Open:
   - `https://album-filter.stansult.com`

## 5. Deploy Workflow

- The GitHub Actions workflow runs tests before eligible production deployments.
- It compares `test/` and `netlify.toml` against the last successful workflow deployment, not the previous push.
- Netlify's independent builds must be stopped to prevent bypassing tests. See [deployment setup](deployment.md).

## 6. Quick Troubleshooting

- Domain not resolving:
  - Check Cloudflare CNAME target and propagation.
- Netlify not deploying:
  - Check the GitHub Actions test/deploy jobs and deployment summary for failures or an unchanged-playground skip.
- 404 on assets:
  - Ensure files are inside `test/` and paths in `test/index.html` are relative.
- TLS issues:
  - Recheck custom domain status in Netlify and DNS record correctness.
