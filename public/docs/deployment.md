# Publish ParaDrain on Cloudflare Pages

Target: **https://paradrain.getfab7.com**. Pages project: **paradrain**. Repository: **fab7hq/para-drain**. Release: **0.1.0**. This file prepares publication; it does not record a live deployment.

## Repository

The public repository is [fab7hq/para-drain](https://github.com/fab7hq/para-drain). The checked `release/paradrain-0.1.0.zip` contains its source and prebuilt site. Its `site/` folder is a prebuilt deployment artifact; the repository source can omit that folder and `MANIFEST.json`. Retain LICENSE, NOTICE, third-party notices, the canonical model, source and documentation. Keep local archives, credentials, task ledgers, caches and dependencies excluded.

When working from a portfolio checkout, do not publish the parent repository or initialize a nested checkout over unrelated work. Import the package into an empty standalone directory. The final product version is 0.1, with package version `0.1.0`.

## Git-connected Pages project

Create a Cloudflare Pages project connected to the new repository. Use:

| Setting | Value |
|---|---|
| Project name | `paradrain` |
| Production branch | `main` |
| Framework preset | None |
| Root directory | Repository root |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Node version | `.node-version` (22.23.2) |

If connecting the existing portfolio repository instead, set its root directory to the ParaDrain project folder. No runtime environment variables, API credentials, database, Pages Functions or external asset services are required. Dependencies are pinned in `package-lock.json`; install with `npm ci` locally.

`wrangler.jsonc` declares the Pages project and build directory. Preview the built site with `npm run preview:pages`. For a separately chosen Direct Upload project, `npm run deploy:pages` builds and uploads to the `paradrain` project; run that command only when ready to publish. Set the project's production branch to `main` before using it. Git integration is the recommended path for this repository.

## Custom domain

In the Pages project's **Custom domains**, add `paradrain.getfab7.com`. Complete the domain association there before adding a DNS record. If `getfab7.com` is in the same Cloudflare account, follow the dashboard's DNS setup. Otherwise, use the exact CNAME target shown for this Pages project; do not assume that the preferred `pages.dev` project name was available. The dashboard manages the domain association and certificate; it is not a Wrangler Pages config field.

After deployment, check HTTPS on the custom domain, the interactive cleaning cycle, `/technical.html`, both `/model/paradrain.*` downloads, and license links. Canonical and social URLs already target the requested domain. Record the deployed commit, URL and verification result in a new progress entry.

## Local release checks

```sh
npm ci
npm test
npm run test:geometry
npm run test:browser
npm run package
npm run preview:pages
```

A public deploy is a separate action from these local checks. The model remains an unqualified physical design even when the site is live.

References: [Pages build configuration](https://developers.cloudflare.com/pages/configuration/build-configuration/), [Pages custom domains](https://developers.cloudflare.com/pages/configuration/custom-domains/), [Wrangler Pages configuration](https://developers.cloudflare.com/pages/functions/wrangler-configuration/).
