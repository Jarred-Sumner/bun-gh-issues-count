import { Database } from "bun:sqlite";

const DATABASE_PATH =
  process.env.DATABASE_PATH ?? import.meta.dir + "/db.sqlite";

const db = new Database(DATABASE_PATH);

db.exec(
  "CREATE TABLE IF NOT EXISTS issues (id INTEGER PRIMARY KEY, date INTEGER UNIQUE, open_issues_count INTEGER, closed_issues_count INTEGER, all_issues_count INTEGER)"
);

const targetDate = new Date(
  process.env.TARGET_DATE ?? new Date().toISOString().slice(0, 10)
);

if (targetDate.toString() === "Invalid Date") {
  throw new Error("Invalid date");
}

import { Octokit } from "octokit";

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

// insert placeholder issue count for yesterday
{
  const yesterday = new Date(targetDate);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayDate = Math.round(yesterday.getTime() / 1000);
  const existingDate = db
    .query("SELECT date FROM issues WHERE date = ?")
    .get(yesterdayDate);

  if (!existingDate) {
    db.exec(
      "INSERT INTO issues (date, open_issues_count, closed_issues_count, all_issues_count) VALUES (?, ?, ?, ?)",
      [yesterdayDate, 1500, 1500, 300]
    );
  }
}
const github_repo = process.env.REPO ?? "oven-sh/bun";
const [owner, name] = github_repo.split("/");

const query = `
query ($owner: String = "${owner.replace(
  "@",
  ""
)}", $name: String = "${name}") {
    repository(owner: $owner, name: $name) {
      all:issues {
        totalCount
      }
      closed:issues(states:CLOSED) {
        totalCount
      }
      open:issues(states:OPEN) {
        totalCount
      }
    }
  }
` as const;

const { repository } = await octokit.graphql(query);

var {
  all: { totalCount: all_issues_count = "0" },
  closed: { totalCount: closed_issues_count = "0" },
  open: { totalCount: open_issues_count = "0" },
} = repository;

all_issues_count = Number(all_issues_count);
closed_issues_count = Number(closed_issues_count);
open_issues_count = Number(open_issues_count);

const date = Math.round(targetDate.getTime() / 1000);

const existingDate = db
  .query("SELECT date FROM issues WHERE date = ?")
  .get(date);

if (existingDate) {
  db.exec(
    "UPDATE issues SET open_issues_count = ?, closed_issues_count = ?, all_issues_count = ? WHERE date = ?",
    [open_issues_count, closed_issues_count, all_issues_count, date]
  );
} else {
  db.exec(
    "INSERT INTO issues (date, open_issues_count, closed_issues_count, all_issues_count) VALUES (?, ?, ?, ?)",
    [date, open_issues_count, closed_issues_count, all_issues_count]
  );
}

console.log('"%s" on %s', github_repo, targetDate.toISOString().slice(0, 10));
console.log("  open issues: %d", open_issues_count);
console.log("closed issues: %d", closed_issues_count);

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

if (DISCORD_WEBHOOK_URL) {
  let content = ``;

  const yesterday = new Date(targetDate);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayDate = Math.round(yesterday.getTime() / 1000);
  const yesterdayIssues = db
    .query("SELECT * FROM issues WHERE date = ?")
    .get(yesterdayDate);

  if (yesterdayIssues) {
    const yesterdayOpenIssues = yesterdayIssues.open_issues_count;
    const yesterdayClosedIssues = yesterdayIssues.closed_issues_count;
    const yesterdayAllIssues = yesterdayIssues.all_issues_count;

    const openIssuesDiff = open_issues_count - yesterdayOpenIssues;
    const closedIssuesDiff = closed_issues_count - yesterdayClosedIssues;
    let formattedOpened =
      (openIssuesDiff > 0 ? "+ " : "") +
      new Intl.NumberFormat().format(openIssuesDiff);
    let formattedClosed =
      (closedIssuesDiff > 0 ? "- " : "") +
      new Intl.NumberFormat().format(closedIssuesDiff);

    formattedClosed = formattedClosed.padStart(formattedOpened.length, " ");
    formattedOpened = formattedOpened.padStart(formattedClosed.length, " ");

    content += `
:red_circle:  **${formattedOpened}** opened today
:green_circle:  ${formattedClosed} closed today
`;
  }

  content += `
${new Intl.NumberFormat().format(
  all_issues_count
)} total issues as of ${targetDate.toISOString().slice(0, 10)}`;

  const params = {
    username: "Bun GitHub Issue Counter",
    timestamp: targetDate.toISOString(),
    avatar_url: "https://avatars.githubusercontent.com/u/108928776?v=4",
    content,
  };

  const res = await fetch(DISCORD_WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });

  if (res.status !== 204) {
    console.log(await res.text());
    throw new Error("Discord webhook failed");
  }
}
