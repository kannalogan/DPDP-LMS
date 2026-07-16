#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import {
  assertLocalBootstrapEnvironment,
  assertLocalDatabaseUrl,
  normalizeBootstrapEmails,
  readEnvironmentFile
} from "./bootstrap-guard.mjs";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDirectory, "../..");

function argumentsByName(values) {
  const result = {};
  for (let index = 0; index < values.length; index += 1) {
    const item = values[index];
    if (!item.startsWith("--")) continue;
    const [name, inlineValue] = item.slice(2).split("=", 2);
    result[name] = inlineValue ?? values[index + 1] ?? "";
    if (inlineValue === undefined) index += 1;
  }
  return result;
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    encoding: "utf8",
    ...options
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const details = String(result.stderr || result.stdout || "Command failed").trim();
    throw new Error(details);
  }
  return String(result.stdout).trim();
}

function parseSupabaseEnvironment(output) {
  const values = {};
  for (const line of output.split(/\r?\n/)) {
    const separator = line.indexOf("=");
    if (separator < 1) continue;
    const key = line
      .slice(0, separator)
      .replace(/^export\s+/, "")
      .trim();
    values[key] = line
      .slice(separator + 1)
      .trim()
      .replace(/^(['"])(.*)\1$/, "$2");
  }
  return values;
}

function main() {
  const fileEnvironment = readEnvironmentFile(join(projectRoot, ".env.local"));
  const environment = { ...fileEnvironment, ...process.env };
  assertLocalBootstrapEnvironment(environment);

  const args = argumentsByName(process.argv.slice(2));
  const emails = normalizeBootstrapEmails({
    admin: args["admin-email"] || environment.LOCAL_BOOTSTRAP_ADMIN_EMAIL,
    mentor: args["mentor-email"] || environment.LOCAL_BOOTSTRAP_MENTOR_EMAIL,
    student: args["student-email"] || environment.LOCAL_BOOTSTRAP_STUDENT_EMAIL
  });

  const status = parseSupabaseEnvironment(
    run("supabase", ["status", "-o", "env"], {
      env: { ...process.env, DO_NOT_TRACK: "1" }
    })
  );
  if (!status.DB_URL) throw new Error("Local Supabase is not running or did not return DB_URL.");
  const databaseUrl = assertLocalDatabaseUrl(status.DB_URL);

  const output = run(
    "psql",
    [
      "-X",
      "-h",
      databaseUrl.hostname,
      "-p",
      databaseUrl.port,
      "-U",
      decodeURIComponent(databaseUrl.username),
      "-d",
      databaseUrl.pathname.slice(1),
      "-v",
      "ON_ERROR_STOP=1",
      "-v",
      "bootstrap_local_guard=syra-local",
      "-v",
      `student_email=${emails.student}`,
      "-v",
      `mentor_email=${emails.mentor}`,
      "-v",
      `admin_email=${emails.admin}`,
      "-At",
      "-P",
      "pager=off",
      "-f",
      join(scriptDirectory, "bootstrap-workspaces.sql")
    ],
    {
      env: {
        ...process.env,
        PGPASSWORD: decodeURIComponent(databaseUrl.password)
      }
    }
  );

  console.log("Local acceptance bootstrap completed.");
  console.log(output);
}

try {
  main();
} catch (error) {
  console.error(`Local acceptance bootstrap failed: ${error.message}`);
  process.exitCode = 1;
}
