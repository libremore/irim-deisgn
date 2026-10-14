import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { test } from "node:test";
import { findPagesUrl, parseGitHubRemote, parseOptions, publishSite, verifyPublishedRevision, waitForPages } from "./publish.mjs";

const sha = "a".repeat(40);
const repository = { owner: "libremore", name: "irim-deisgn", fullName: "libremore/irim-deisgn" };
const quiet = () => {};

async function fixture(run) {
  const root = mkdtempSync(join(tmpdir(), "irim-publish-test-"));
  try {
    mkdirSync(join(root, "scripts"));
    mkdirSync(join(root, ".github", "workflows"), { recursive: true });
    writeFileSync(join(root, "scripts", "example.test.mjs"), "");
    writeFileSync(join(root, ".github", "workflows", "pages.yml"), "workflow fixture");
    await run(root);
  } finally {
    assert.equal(dirname(resolve(root)), resolve(tmpdir()));
    assert.ok(root.split(/[\\/]/).at(-1).startsWith("irim-publish-test-"));
    rmSync(root, { recursive: true, force: true });
  }
}

function commands(root, settings = {}) {
  const calls = [];
  const run = (command, original, options) => {
    const args = [...original];
    while (args[0] === "-c") args.splice(0, 2);
    calls.push({ command, args, options });
    const output = (stdout = "", status = 0, stderr = "") => ({ status, stdout, stderr });
    if (command === "python" && args[0] === "--version") return output("Python 3.13.0");
    if (settings.failBuild && args[0] === "scripts/build.mjs") return output("", 1, "image file is empty");
    if (command !== "git") return output();
    if (args[0] === "rev-parse" && args[1] === "--show-toplevel") return output(root);
    if (args[0] === "rev-parse" && args[1] === "--git-path") return output(`.git/${args[2]}`);
    if (args[0] === "rev-parse" && args[1] === "HEAD") return output(sha);
    if (args[0] === "branch") return output(settings.branch || "main");
    if (args[0] === "remote") return output("https://github.com/libremore/irim-deisgn.git");
    if (args[0] === "credential-manager") return output("libremore\n");
    if (args[0] === "merge-base") return output("", settings.diverged ? 1 : 0);
    if (args[0] === "status") return output(" M portfolio/README.md");
    if (args[0] === "diff" && args.includes("--quiet")) return output("", settings.unchanged ? 0 : 1);
    if (args[0] === "push" && settings.failPushAuth) return output("", 128, "Authentication failed");
    return output();
  };
  return { calls, run };
}

function dependencies(root, run) {
  return {
    root, run, log: quiet, options: { ...parseOptions([]), interactive: false },
    waitForDeployment: async ({ sha: deployed, repository: selected }) => {
      assert.equal(deployed, sha);
      assert.deepEqual(selected, repository);
      return { actionsUrl: "https://github.com/libremore/irim-deisgn/actions/runs/123" };
    },
    resolveSiteUrl: async () => "https://libremore.github.io/irim-deisgn/",
    verifySite: async (request) => { assert.equal(request.sha, sha); return request.siteUrl; },
  };
}

test("one run validates before committing, pushes all changes, and verifies deployment", () => fixture(async (root) => {
  const { run, calls } = commands(root);
  const deps = dependencies(root, run);
  deps.options.message = "Update $(literal) & portfolio";
  const result = await publishSite(deps);
  assert.equal(result.status, "deployed");
  const location = (command, first) => calls.findIndex((call) => call.command === command && call.args[0] === first);
  const verification = calls.findIndex((call) => call.args[0] === "scripts/verify.py" && call.args[1] === "_site");
  assert.ok(verification < location("git", "add"));
  assert.ok(location("git", "add") < location("git", "commit"));
  assert.ok(location("git", "commit") < location("git", "push"));
  assert.deepEqual(calls.find((call) => call.args[0] === "commit").args, ["commit", "-m", deps.options.message]);
  assert.deepEqual(calls.find((call) => call.args[0] === "add").args, ["add", "--all"]);
  assert.ok(!calls.some((call) => call.args.includes("--force")));
}));

test("invalid portfolio stops before staging or publishing", () => fixture(async (root) => {
  const { run, calls } = commands(root, { failBuild: true });
  await assert.rejects(publishSite(dependencies(root, run)), /image file is empty/);
  assert.ok(!calls.some((call) => ["add", "commit", "push"].includes(call.args[0])));
}));

test("unchanged files avoid an empty commit but still push previously unpushed commits", () => fixture(async (root) => {
  const { run, calls } = commands(root, { unchanged: true });
  const deps = dependencies(root, run);
  deps.options.wait = false;
  deps.waitForDeployment = () => assert.fail("--no-wait must not wait");
  assert.equal((await publishSite(deps)).status, "pushed");
  assert.ok(!calls.some((call) => call.args[0] === "commit"));
  assert.ok(calls.some((call) => call.args[0] === "push"));
}));

test("remote divergence stops without overwriting local changes or force pushing", () => fixture(async (root) => {
  const { run, calls } = commands(root, { diverged: true });
  await assert.rejects(publishSite(dependencies(root, run)), /원격 main에 새로운 변경/);
  assert.ok(!calls.some((call) => ["merge", "add", "commit", "push"].includes(call.args[0])));
}));

test("a different current branch stops before remote or file changes", () => fixture(async (root) => {
  const { run, calls } = commands(root, { branch: "feature" });
  await assert.rejects(publishSite(dependencies(root, run)), /main 브랜치/);
  assert.ok(!calls.some((call) => ["fetch", "add", "commit", "push"].includes(call.args[0])));
}));

test("authentication failure reports recovery and never reports deployment success", () => fixture(async (root) => {
  const { run } = commands(root, { failPushAuth: true });
  const deps = dependencies(root, run);
  deps.waitForDeployment = () => assert.fail("Failed pushes must not wait for a deployment");
  await assert.rejects(publishSite(deps), /GitHub 인증이 필요/);
}));

test("validation-only makes no Git changes or network calls", () => fixture(async (root) => {
  const { run, calls } = commands(root);
  const deps = dependencies(root, run);
  deps.options.validateOnly = true;
  assert.equal((await publishSite(deps)).status, "validated");
  assert.ok(!calls.some((call) => call.command === "git"));
  assert.ok(calls.some((call) => call.args.includes("_site")));
}));

const workflow = (overrides = {}) => ({ id: 123, head_sha: sha, path: ".github/workflows/pages.yml", status: "completed", conclusion: "success", html_url: "https://github.com/libremore/irim-deisgn/actions/runs/123", ...overrides });
function clock() {
  let time = 0;
  return { now: () => time, sleep: async (milliseconds) => { time += milliseconds; } };
}

test("deployment waits for the exact commit and successful deploy job", async () => {
  let reads = 0;
  const paths = [];
  const api = async (path) => {
    paths.push(path);
    if (path.includes("/jobs?")) return { jobs: [{ name: "build", conclusion: "success" }, { name: "deploy", conclusion: "success" }] };
    reads++;
    return { workflow_runs: reads === 1 ? [workflow({ head_sha: "b".repeat(40) })] : reads === 2 ? [workflow({ status: "in_progress", conclusion: null })] : [workflow()] };
  };
  const result = await waitForPages({ repository, sha, api, log: quiet, ...clock(), intervalMs: 1, timeoutMs: 10 });
  assert.equal(reads, 3);
  assert.ok(paths[0].includes(`head_sha=${sha}`));
  assert.equal(result.run.head_sha, sha);
});

test("successful build with a skipped deployment is not reported as deployed", async () => {
  const api = async (path) => path.includes("/jobs?") ? { jobs: [{ name: "deploy", conclusion: "skipped" }] } : { workflow_runs: [workflow()] };
  await assert.rejects(waitForPages({ repository, sha, api, log: quiet, ...clock() }), /deploy 작업이 성공하지/);
});

test("failed workflow includes the actionable run URL", async () => {
  const api = async () => ({ workflow_runs: [workflow({ conclusion: "failure" })] });
  await assert.rejects(waitForPages({ repository, sha, api, log: quiet, ...clock() }), /배포 실패: failure[\s\S]*actions\/runs\/123/);
});

test("missing workflow has a bounded wait and distinguishes upload from deployment", async () => {
  const api = async () => ({ workflow_runs: [] });
  await assert.rejects(waitForPages({ repository, sha, api, log: quiet, ...clock(), intervalMs: 1, timeoutMs: 3 }), /업로드는 완료했지만 배포 확인 시간이 초과/);
});

test("HTTP 200 alone does not count as the newest deployed version", async () => {
  let reads = 0;
  const fetchPage = async (url) => {
    assert.equal(url.searchParams.get("revision"), sha);
    reads++;
    return { ok: true, status: 200, text: async () => `<meta name="site-revision" content="${reads === 1 ? "b".repeat(40) : sha}">` };
  };
  assert.equal(await verifyPublishedRevision({ siteUrl: "https://libremore.github.io/irim-deisgn/", sha, fetchPage, ...clock(), intervalMs: 1, timeoutMs: 5 }), "https://libremore.github.io/irim-deisgn/");
  assert.equal(reads, 2);
});

test("old published HTML reports a verification limit after a bounded wait", async () => {
  const fetchPage = async () => ({ ok: true, status: 200, text: async () => "old portfolio" });
  await assert.rejects(verifyPublishedRevision({ siteUrl: "https://libremore.github.io/irim-deisgn/", sha, fetchPage, ...clock(), intervalMs: 1, timeoutMs: 3 }), /최신 버전을 확인하지 못했습니다/);
});

test("Pages URL uses the successful deployment's environment including custom domains", async () => {
  const api = async (path) => path.includes("/statuses?") ? [{ state: "success", environment_url: "https://example.com/" }] : [{ id: 7 }];
  assert.equal(await findPagesUrl(repository, sha, api), "https://example.com/");
  assert.equal(await findPagesUrl(repository, sha, async () => { throw new Error("metadata restricted"); }), "https://libremore.github.io/irim-deisgn/");
});

test("CLI accepts literal messages and only GitHub repository addresses", () => {
  const options = parseOptions(["--message", "사진 추가 & 설명 수정", "--no-wait", "--non-interactive"]);
  assert.equal(options.message, "사진 추가 & 설명 수정");
  assert.equal(options.wait, false);
  assert.equal(options.interactive, false);
  for (const remote of ["https://github.com/libremore/irim-deisgn.git", "git@github.com:libremore/irim-deisgn.git", "ssh://git@github.com/libremore/irim-deisgn.git"]) assert.deepEqual(parseGitHubRemote(remote), repository);
  assert.throws(() => parseGitHubRemote("https://user:token@github.com/libremore/irim-deisgn.git"), /github.com/);
  assert.throws(() => parseOptions(["--message"]), /커밋 메시지/);
  assert.throws(() => parseOptions(["--force"]), /알 수 없는 옵션/);
});
