# npm Access for the App CSS Build

`assets/build-app-css.mjs` installs the packages the application styles import into `.opencode/features/_app-css/<app>/`. Most come from npmjs; `@lightspeed/design-system-css` comes from GitHub Packages and needs a token. The script reads the token itself from `GITHUB_PACKAGE_TOKEN` or `~/.npmrc` and never prints it.

## Preflight (only when the build fails or on a new machine)

Run from the repository root. Stop at the first failure.

```sh
node -v                                         # worked on 16.13.0; any version that runs ESM .mjs
npm -v
npm config get @lightspeed:registry             # expect https://npm.pkg.github.com
npm config list 2>/dev/null | grep -c '//npm.pkg.github.com/:_authToken'   # expect >= 1, never print the value
```

## Failure handling

| Symptom | Meaning | Action |
|---|---|---|
| Registry not set | npm looks on npmjs.org and gets 404 | Tell the user to run `npm config set @lightspeed:registry https://npm.pkg.github.com`. Do not change global npm config without asking |
| No token / `E401` / `E403` | No access to GitHub Packages | First rule out the project `.npmrc` cause below. If the token really is missing: the user creates a GitHub classic token with scope `read:packages`, authorizes SSO for org `lightspeed`, then runs `npm config set //npm.pkg.github.com/:_authToken <token>` themselves. Never ask them to paste the token into chat |
| `E401` although `~/.npmrc` has a token | `frontend/.npmrc` sets `//npm.pkg.github.com/:_authToken=${GITHUB_PACKAGE_TOKEN}`; when the variable is not exported, npm uses an empty token for any command run inside `frontend/` | The script runs npm from `_app-css/<app>/` with its own `.npmrc`, so this should not happen there. For a manual npm command, export the variable for that command only: `export GITHUB_PACKAGE_TOKEN="$(grep -m1 '^//npm.pkg.github.com/:_authToken=' ~/.npmrc \| cut -d= -f2-)"`. Never echo it |
| `E404` on `@shopkeep/*` | Private npmjs packages, need `NPM_TOKEN_SHOPKEEP` | Not needed for research. Do not ask the user for this token |
| `E404` on an exact version | Version unpublished or wrong package name | Re-check the lockfile key; record the closest lower version as an Assumption |
| `ERESOLVE` peer conflict | React/Vue peers | The script already passes `--legacy-peer-deps` |
| Sass error on an import | A package the styles need is missing or the include path differs | The script installs missing imports iteratively; if it still fails, fix the script once in the skill (Working Approach 6), not with a local patch |

## Fallback (only after the user is informed)

Hand-copied CSS from the feature SCSS, recorded in `decisions.md`, with a persistent `data-comment-kind="source"` comment "Approximate legacy styles: <reason>" at the top of the mock.

## Fonts

The compiled CSS keeps remote font imports (Google Fonts Lato, `vendfrontendassets.freetls.fastly.net/fonts/fonts-v2.css`). Offline, the browser falls back to system fonts; that is not worth a comment.
