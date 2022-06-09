# Publishing/Release Process

This project uses [Changesets](https://github.com/atlassian/changesets) to manage the changelog, versions, and publishing to npm.

## Every PR

Every PR that includes changes that might affect people that install `lighthouse-parade` must include a changeset file. To create a changeset file, run `npx changeset`. The interactive CLI will prompt you for a version bump and a description of your changes. The description will be included in the changelog.

While this project is pre-1.0, we are releasing breaking changes and backwards-compatible changes both as minor version bumps. Patch releases are used for bugfixes.

## Publishing a new version

Any time there are unpublished changesets on `main`, [changeset-action](https://github.com/changesets/action) will create a PR called "Publish Next Version". When you merge this PR into `main`, the unreleased changesets will be consolidated into `CHANGELOG.md`, a git tag for the new version will be created, and linked to a GitHub release, and the new version will be published to npm.
