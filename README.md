# bun-gh-issues-count

Prints a counter like this to a `$DISCORD_WEBHOOK_URL` every day:

<img width="395" alt="image" src="https://github.com/oven-sh/bun/assets/709451/f7ef49f0-2818-4022-9c83-804ec6b8ebf9">

## Usage

Run the script one-off to make sure it works:

```sh
bun index.ts
```

Schedule it to run every day at 1pm on macOS:

```sh
bun make-launchd.ts
```

It saves states into a .sqlite file in the current directory.

### Configuration

Expects a .env file like this:

```sh
REPO=oven-sh/bun
GITHUB_TOKEN=ghp_1234567890
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/123/1234567890
```

Note that `$GITHUB_TOKEN` is a personal access token, but it doesn't need any scopes authorized.
