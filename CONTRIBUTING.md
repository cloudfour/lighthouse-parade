# Contributing

## Supported Node versions

`engines.node` in `package.json` is a promise to users: `lighthouse-parade` works on every Node version it allows. CI checks both ends of that range:

- **The newest.** Every job except the oldest-version ones runs on the Node version in `.nvmrc`, which Renovate keeps current.
- **The oldest.** The `test (Node …)` jobs run the unit tests on the oldest version each part of `engines.node` allows. For `^22.19.0 || >=24.0.0` that's one job for 22.19.0 and another for 24.0.0. They read those versions from `package.json` when they run, so the workflow has no version numbers to keep in step.

### When an oldest-version job fails

This usually happens on a Renovate PR: a dependency's new release needs a newer Node than we claim to support. Users on the old Node would get that release too, since our dependencies are ranges, so don't merge the PR as it is. Either:

- **Keep the older dependency.** Add a rule to `.renovaterc.json` that holds it back, with a `description` saying why and when it can be removed. This keeps our support as it is.
- **Raise the floor** in a major release, as described below.

Don't delete or skip the job to get the PR through. A red job means the range in `package.json` is wrong, and removing the job only hides that from us, not from users.

### Changing the range

Edit `engines.node` in `package.json`. The CI jobs follow it, so there's nothing else to update in the workflow. Do update the `@types/node` rule in `.renovaterc.json` to match the new oldest major, so type-checking catches APIs that version doesn't have.

- **Raising the oldest version** drops support for someone, so it's a breaking change and needs a major changeset. Good reasons to raise it: that Node line has reached [end of life](https://nodejs.org/en/about/previous-releases), a dependency we need requires a newer one, or we want a newer Node API.
- **Lowering it**, or adding support for another Node line, is a minor change, as long as the new oldest-version job passes.

## Publishing/Release Process

This project uses [Changesets](https://github.com/atlassian/changesets) to manage the changelog, versions, and publishing to npm.

### Every PR

Every PR that includes changes that might affect people that install `lighthouse-parade` must include a changeset file. To create a changeset file, run `npx changeset`. The interactive CLI will prompt you for a version bump and a description of your changes. The description will be included in the changelog.

Breaking changes are major version bumps, backwards-compatible features are minor, and bug fixes are patches.

### Publishing a new version

Any time there are unpublished changesets on `main`, [changeset-action](https://github.com/changesets/action) will create a PR called "Publish Next Version". When you merge this PR into `main`, the unreleased changesets will be consolidated into `CHANGELOG.md`, a git tag for the new version will be created, and linked to a GitHub release, and the new version will be published to npm.
