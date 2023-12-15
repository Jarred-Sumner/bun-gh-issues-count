import { writeFileSync } from "fs";
import { join } from "path";

const launchd = `
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>RunAtLoad</key>
    <true/>
    <key>Label</key>
    <string>com.bun.bun-gh-issues-count</string>
    <key>ProgramArguments</key>
    <array>
        <string>${Bun.which("bun")}</string>
        <string>--cwd=${import.meta.dir}</string>
        <string>${require.resolve("./index.ts")}</string>
    </array>
    <!-- Load as specific user -->
    <key>UserName</key>
    <string>${process.env.USER}</string>
    <!-- Load in current working directory -->
    <key>WorkingDirectory</key>
    <string>${import.meta.dir}</string>
    <key>StartCalendarInterval</key>
    <array>
        <!-- Run every day at 1:00pm -->
        <dict>
            <key>Hour</key>
            <integer>13</integer>
            <key>Minute</key>
            <integer>00</integer>
        </dict>

    </array>
    <key>StandardErrorPath</key>
    <string>${import.meta.dir}/error.log</string>
    <key>StandardOutPath</key>
    <string>${import.meta.dir}/out.log</string>
</dict>
</plist>
`;

const launchdPath = join(import.meta.dir, "com.bun.bun-gh-issues-count.plist");

await Bun.write(launchdPath, launchd);

console.log(`launchd file written to ${launchdPath}`);

Bun.spawnSync({
  cmd: ["launchctl", "unload", launchdPath],
  stderr: "inherit",
  stdout: "inherit",
  stdin: "inherit",
});

Bun.spawnSync({
  cmd: ["launchctl", "load", launchdPath],
  stderr: "inherit",
  stdout: "inherit",
  stdin: "inherit",
});
