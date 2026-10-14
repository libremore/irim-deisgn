import { existsSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pause = (milliseconds) => new Promise((done) => setTimeout(done, milliseconds));

export function parseOptions(args) {
  const options = { message: "Update portfolio and site", wait: true, validateOnly: false, interactive: Boolean(process.stdin.isTTY), help: false };
  for (let index = 0; index < args.length; index++) {
    const argument = args[index];
    if (argument === "--message") {
      if (!args[index + 1]?.trim()) throw new Error("--message 뒤에 커밋 메시지를 입력하세요.");
      options.message = args[++index];
    } else if (argument === "--no-wait") options.wait = false;
    else if (argument === "--validate-only") options.validateOnly = true;
    else if (argument === "--non-interactive") options.interactive = false;
    else if (argument === "--help") options.help = true;
    else throw new Error(`알 수 없는 옵션: ${argument}`);
  }
  return options;
}

export function parseGitHubRemote(remote) {
  const match = /^(?:https:\/\/github\.com\/|git@github\.com:|ssh:\/\/git@github\.com\/)([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/.exec(remote);
  if (!match) throw new Error("origin은 github.com 저장소 주소여야 합니다.");
  return { owner: match[1], name: match[2], fullName: `${match[1]}/${match[2]}` };
}

function runCommand(command, args, { cwd, interactive = false, env = {} } = {}) {
  const result = spawnSync(command, args, {
    cwd, encoding: "utf8", stdio: interactive ? "inherit" : ["ignore", "pipe", "pipe"],
    timeout: interactive ? 20 * 60 * 1000 : 10 * 60 * 1000, maxBuffer: 16 * 1024 * 1024,
    env: { ...process.env, ...env },
  });
  return { status: result.status ?? -1, stdout: result.stdout || "", stderr: result.stderr || result.error?.message || "" };
}

export async function githubJson(path) {
  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  const response = await fetch(`https://api.github.com${path}`, {
    headers: { Accept: "application/vnd.github+json", "User-Agent": "irim-portfolio-publisher", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`GitHub API ${response.status}. Actions 화면에서 배포 상태를 확인하세요. 토큰을 설정했다면 Actions 읽기 권한도 확인하세요.`);
  return response.json();
}

export async function waitForPages({ repository, sha, api = githubJson, sleep = pause, now = Date.now, log = console.log, timeoutMs = 15 * 60 * 1000, intervalMs = 30000 }) {
  const deadline = now() + timeoutMs;
  const actionsUrl = `https://github.com/${repository.fullName}/actions`;
  let previous;
  while (now() < deadline) {
    const query = new URLSearchParams({ branch: "main", head_sha: sha, per_page: "10" });
    const data = await api(`/repos/${repository.fullName}/actions/runs?${query}`);
    const run = data.workflow_runs.find((entry) => entry.head_sha === sha && entry.path?.split("@")[0] === ".github/workflows/pages.yml");
    const state = run ? `${run.id}:${run.status}:${run.conclusion}` : "waiting-for-run";
    if (state !== previous) {
      log(run ? `GitHub Pages: ${run.status}${run.conclusion ? ` / ${run.conclusion}` : ""}\n${run.html_url}` : "GitHub Pages 배포 시작을 기다립니다.");
      previous = state;
    }
    if (run?.status === "completed") {
      if (run.conclusion !== "success") throw new Error(`GitHub Pages 배포 실패: ${run.conclusion}\n${run.html_url}`);
      const jobs = await api(`/repos/${repository.fullName}/actions/runs/${run.id}/jobs?per_page=100`);
      if (!jobs.jobs.some((job) => job.name === "deploy" && job.conclusion === "success")) throw new Error(`Pages deploy 작업이 성공하지 않았습니다.\n${run.html_url}`);
      return { run, actionsUrl: run.html_url };
    }
    await sleep(intervalMs);
  }
  throw new Error(`업로드는 완료했지만 배포 확인 시간이 초과되었습니다.\n${actionsUrl}`);
}

export async function findPagesUrl(repository, sha, api = githubJson) {
  try {
    const deployments = await api(`/repos/${repository.fullName}/deployments?sha=${sha}&environment=github-pages&per_page=5`);
    for (const deployment of deployments) {
      const statuses = await api(`/repos/${repository.fullName}/deployments/${deployment.id}/statuses?per_page=10`);
      const completed = statuses.find((status) => status.state === "success" && status.environment_url);
      if (completed) return completed.environment_url;
    }
  } catch { /* Public Pages content can be checked even when deployment metadata is restricted. */ }
  return `https://${repository.owner}.github.io/${repository.name}/`;
}

export async function verifyPublishedRevision({ siteUrl, sha, fetchPage = fetch, sleep = pause, now = Date.now, timeoutMs = 3 * 60 * 1000, intervalMs = 15000 }) {
  const base = siteUrl.endsWith("/") ? siteUrl : `${siteUrl}/`;
  const pageUrl = new URL("portfolio.html", base);
  pageUrl.searchParams.set("revision", sha);
  const deadline = now() + timeoutMs;
  let lastStatus = "페이지 응답 없음";
  while (now() < deadline) {
    try {
      const response = await fetchPage(pageUrl, { cache: "no-store", signal: AbortSignal.timeout(30000) });
      lastStatus = `HTTP ${response.status}`;
      if (response.ok && (await response.text()).includes(`<meta name="site-revision" content="${sha}">`)) return base;
    } catch { lastStatus = "네트워크 연결 실패"; }
    await sleep(intervalMs);
  }
  throw new Error(`Actions 배포는 완료했지만 사이트의 최신 버전을 확인하지 못했습니다 (${lastStatus}). 잠시 후 확인하세요.\n${pageUrl}`);
}

export async function publishSite({ root = projectRoot, options = parseOptions([]), run = runCommand, log = console.log, waitForDeployment = waitForPages, resolveSiteUrl = findPagesUrl, verifySite = verifyPublishedRevision } = {}) {
  const execute = (command, args, { allowed = [0], ...settings } = {}) => {
    const result = run(command, args, { cwd: root, ...settings });
    if (!allowed.includes(result.status)) throw new Error(`${command} ${args[0] || ""} 실패 (${result.status})\n${result.stderr || result.stdout}`);
    return result;
  };
  const pythonCandidates = [["python", []], ["python3", []], ["py", ["-3"]]];
  const python = pythonCandidates.find(([command, prefix]) => {
    const result = run(command, [...prefix, "--version"], { cwd: root });
    const version = /Python (\d+)\.(\d+)/.exec(result.stdout + result.stderr);
    return result.status === 0 && version && (Number(version[1]) > 3 || Number(version[1]) === 3 && Number(version[2]) >= 9);
  });
  if (!python) throw new Error("Python 3.9 이상이 필요합니다. Python을 설치한 뒤 다시 실행하세요.");
  const validate = () => {
    log("포트폴리오 생성 및 검증 중...");
    const tests = readdirSync(resolve(root, "scripts")).filter((filename) => filename.endsWith(".test.mjs")).map((filename) => `scripts/${filename}`);
    execute(process.execPath, ["--test", "--test-reporter=dot", ...tests]);
    execute(process.execPath, ["scripts/build.mjs"]);
    execute(python[0], [...python[1], "scripts/verify.py"]);
    execute(process.execPath, ["scripts/package-pages.mjs"]);
    execute(python[0], [...python[1], "scripts/verify.py", "_site"]);
    log("포트폴리오 생성, 테스트, 원본·배포 파일 검증 통과.");
  };
  if (options.validateOnly) { validate(); return { status: "validated" }; }

  execute("git", ["--version"]);
  let gitPrefix = [];
  const git = (args, settings = {}) => execute("git", [...gitPrefix, ...args], settings);
  const worktree = git(["rev-parse", "--show-toplevel"]).stdout.trim();
  if (resolve(worktree) !== resolve(root)) throw new Error("사이트 폴더와 Git 저장소 루트가 일치하지 않습니다.");
  if (git(["branch", "--show-current"]).stdout.trim() !== "main") throw new Error("main 브랜치에서 실행하세요. 현재 브랜치는 자동으로 변경하지 않습니다.");
  if (git(["ls-files", "--unmerged"]).stdout.trim()) throw new Error("Git 충돌을 해결한 뒤 다시 실행하세요.");
  for (const name of ["MERGE_HEAD", "rebase-merge", "rebase-apply", "CHERRY_PICK_HEAD", "REVERT_HEAD"]) {
    const path = git(["rev-parse", "--git-path", name]).stdout.trim();
    if (existsSync(resolve(root, path))) throw new Error("진행 중인 Git 병합·리베이스 작업을 마친 뒤 다시 실행하세요.");
  }
  if (!existsSync(resolve(root, ".github/workflows/pages.yml"))) throw new Error("GitHub Pages 워크플로 .github/workflows/pages.yml이 없습니다.");
  const repository = parseGitHubRemote(git(["remote", "get-url", "origin"]).stdout.trim());
  const accounts = run("git", ["credential-manager", "github", "list"], { cwd: root });
  if (accounts.status === 0 && accounts.stdout.split(/\s+/).includes(repository.owner)) gitPrefix = ["-c", "credential.helper=", "-c", "credential.helper=manager"];
  let authenticated = false;
  const networkGit = (args) => {
    try { return git(args, { env: { GIT_TERMINAL_PROMPT: "0", GCM_INTERACTIVE: "Never" } }); }
    catch (error) {
      if (!/authentication|invalid username|could not read username|permission.*denied/i.test(error.message)) throw error;
      if (!options.interactive || authenticated) throw new Error(`${error.message}\nGitHub 인증이 필요합니다. git credential-manager github login --device --username ${repository.owner} 실행 후 다시 실행하세요.`);
      log("GitHub 인증이 필요합니다. 아래 주소에서 표시된 코드를 입력해 로그인하세요.");
      execute("git", ["credential-manager", "github", "login", "--force", "--device", "--username", repository.owner, "--no-ui"], { interactive: true });
      gitPrefix = ["-c", "credential.helper=", "-c", "credential.helper=manager"];
      authenticated = true;
      return git(args, { env: { GIT_TERMINAL_PROMPT: "0", GCM_INTERACTIVE: "Never" } });
    }
  };

  log("원격 main 변경 사항 확인 중...");
  networkGit(["fetch", "origin", "main"]);
  const remoteAncestor = git(["merge-base", "--is-ancestor", "origin/main", "HEAD"], { allowed: [0, 1] }).status === 0;
  if (!remoteAncestor) {
    const localAncestor = git(["merge-base", "--is-ancestor", "HEAD", "origin/main"], { allowed: [0, 1] }).status === 0;
    const clean = !git(["status", "--porcelain"]).stdout.trim();
    if (!localAncestor || !clean) throw new Error("원격 main에 새로운 변경이 있습니다. 먼저 변경 사항을 병합한 뒤 다시 실행하세요. 파일을 덮어쓰거나 강제 푸시하지 않았습니다.");
    git(["merge", "--ff-only", "origin/main"]);
  }
  validate();
  log("현재 수정 사항을 커밋 중...");
  git(["add", "--all"]);
  git(["diff", "--cached", "--check"]);
  const changed = git(["diff", "--cached", "--quiet"], { allowed: [0, 1] }).status === 1;
  if (changed) git(["commit", "-m", options.message]);
  else log("새 변경 사항이 없어 커밋 생성을 건너뜁니다.");
  const sha = git(["rev-parse", "HEAD"]).stdout.trim();
  log(`GitHub 업로드 중... ${sha.slice(0, 7)}`);
  networkGit(["push", "origin", "main"]);
  log(`GitHub 업로드 완료: ${sha.slice(0, 7)}`);
  const actionsUrl = `https://github.com/${repository.fullName}/actions`;
  if (!options.wait) { log(`Pages 배포 상태: ${actionsUrl}`); return { status: "pushed", sha, actionsUrl }; }
  const deployment = await waitForDeployment({ repository, sha, log });
  const siteUrl = await resolveSiteUrl(repository, sha);
  log("실제 사이트의 최신 버전 확인 중...");
  const verifiedUrl = await verifySite({ siteUrl, sha });
  log(`완료: 포트폴리오 갱신, GitHub 업로드, GitHub Pages 배포 확인\n${verifiedUrl}`);
  return { status: "deployed", sha, siteUrl: verifiedUrl, actionsUrl: deployment.actionsUrl };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const options = parseOptions(process.argv.slice(2));
    if (options.help) console.log("node scripts/publish.mjs [--message 커밋메시지] [--no-wait] [--validate-only] [--non-interactive]\n기본 실행: 생성·검증 → 커밋·push → GitHub Pages 배포 및 최신 버전 확인");
    else await publishSite({ options });
  } catch (error) { console.error(`업데이트 실패: ${error.message}`); process.exitCode = 1; }
}
