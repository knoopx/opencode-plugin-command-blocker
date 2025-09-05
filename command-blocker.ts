import type { Plugin, PluginInput } from "@opencode-ai/plugin";

interface BlockedCommandMessages {
  [key: string]: string;
}

interface ReadOnlyFiles {
  [key: string]: string;
}

const BLOCKED_COMMAND_MESSAGES: BlockedCommandMessages = {
  node: "`node` is blocked to ensure reproducible builds. Use `bun` (faster, more reliable) or `bunx` for running scripts. Example: `bun run dev` instead of `node server.js`",
  npm: "`npm` is blocked to ensure reproducible builds. Use `bun` (faster, more reliable) instead. Examples: `bun install` instead of `npm install`, `bun run build` instead of `npm run build`",
  npx: "`npx` is blocked to ensure reproducible builds. Use `bunx` (faster, more reliable) instead. Examples: `bunx create-react-app my-app` instead of `npx create-react-app my-app`",
  pip: "`pip` is blocked to ensure reproducible builds. Use `uv` or `uvx` for dependency management. Example: `uv add requests` instead of `pip install requests`",
  python:
    "`python` is blocked to ensure environment isolation. Use `uv` for dependency management or `uvx` for running tools. Virtual environment python (e.g., `.venv/bin/python`) is allowed. Example: `uv run python script.py`",
  python2:
    "`python2` is blocked (Python 2 is deprecated). Use `uv` with Python 3 for modern dependency management. Virtual environment python2 commands are allowed if needed. Example: `uv run --python 3.8 python script.py`",
  python3:
    "`python3` is blocked to ensure environment isolation. Use `uv` for dependency management or `uvx` for running tools. Virtual environment python3 (e.g., `.venv/bin/python3`) is allowed. Example: `uv run python3 script.py`",
  git: "`git` write operations are blocked to prevent agents from managing version control. Only read-only commands are allowed: `git status`, `git diff`, `git show`, `git log`, `git rev-parse`.",
  nix: "Local flake paths without `path:` prefix are blocked to ensure reproducible builds. Use `path:` for local flakes (includes uncommitted changes), `github:` for remote repos, or `git+https:` for git URLs. Examples: `nix run path:./my-flake#output`, `nix run github:user/repo#output`",
};

const READ_ONLY_FILES: ReadOnlyFiles = {
  "flake.lock":
    "`flake.lock` editing is blocked to ensure reproducible builds. This auto-generated file pins exact dependency versions for Nix flakes. Use `nix flake update` to safely update dependencies.",

  "package-lock.json":
    "`package-lock.json` editing is blocked to ensure reproducible builds. This auto-generated file ensures consistent npm installs. Use `bun install` or `bun update` to modify dependencies.",

  "bun.lockb":
    "`bun.lockb` editing is blocked to ensure reproducible builds. This auto-generated binary lockfile ensures consistent Bun installs. Use `bun install` or `bun update` to modify dependencies.",

  "yarn.lock":
    "`yarn.lock` editing is blocked to ensure reproducible builds. This auto-generated file ensures consistent Yarn installs. Use `yarn install` or `yarn upgrade` to modify dependencies.",

  "pnpm-lock.yaml":
    "`pnpm-lock.yaml` editing is blocked to ensure reproducible builds. This auto-generated file ensures consistent pnpm installs. Use `pnpm install` or `pnpm update` to modify dependencies.",

  "poetry.lock":
    "`poetry.lock` editing is blocked to ensure reproducible builds. This auto-generated file pins exact dependency versions for Poetry. Use `poetry install` or `poetry update` to modify dependencies.",

  "uv.lock":
    "`uv.lock` editing is blocked to ensure reproducible builds. This auto-generated file ensures consistent Python environments. Use `uv sync` or `uv lock` to modify dependencies.",

  "Cargo.lock":
    "`Cargo.lock` editing is blocked to ensure reproducible builds. This auto-generated file pins exact dependency versions for Rust. Use `cargo update` to safely update dependencies.",

  "Gemfile.lock":
    "`Gemfile.lock` editing is blocked to ensure reproducible builds. This auto-generated file ensures consistent Ruby environments. Use `bundle install` or `bundle update` to modify dependencies.",
};

const BLOCKED_COMMANDS: readonly string[] = Object.keys(
  BLOCKED_COMMAND_MESSAGES
);
const ALLOWED_GIT_COMMANDS: readonly string[] = [
  "git diff",
  "git log",
  "git rev-parse",
  "git show",
  "git status",
];

function checkPythonNodeCommand(command: string): void {
  if (typeof command !== "string" || typeof command.trim !== "function") return;

  const isWhichOrWhereis: boolean =
    command.includes("which") || command.includes("whereis");

  // Allow python commands from virtual environments and uv
  const venvPatterns: RegExp[] = [
    /[./\\]*\.venv[/\\]bin[/\\]python\d*/, // .venv/bin/python, .venv/bin/python3
    /[./\\]*venv[/\\]bin[/\\]python\d*/, // venv/bin/python, venv/bin/python3
    /[./\\]*env[/\\]bin[/\\]python\d*/, // env/bin/python, env/bin/python3
    /uv run python\d*/, // uv run python, uv run python3
    /uvx python\d*/, // uvx python, uvx python3
  ];

  for (const blockedCmd of BLOCKED_COMMANDS) {
    if (blockedCmd === "git" || blockedCmd === "nix") continue;

    // Check for direct command usage (first word)
    const commandParts: string[] = command.trim().split(/\s+/);
    const firstCommand: string = commandParts[0];

    // Handle environment variables (VAR=value command)
    const envVarPattern: RegExp = new RegExp(
      `^[A-Z_][A-Z0-9_]*=.*\\b${blockedCmd}\\b`,
      "i"
    );
    if (envVarPattern.test(command)) {
      throw new Error(BLOCKED_COMMAND_MESSAGES[blockedCmd]);
    }

    // Handle exec and eval wrappers
    if (firstCommand === "exec" || firstCommand === "eval") {
      // Check if any subsequent part contains blocked command
      const remainingCommand = commandParts.slice(1).join(" ");
      if (remainingCommand.includes(blockedCmd)) {
        throw new Error(BLOCKED_COMMAND_MESSAGES[blockedCmd]);
      }
    }

    // Check first command (after removing environment variables)
    let actualFirstCommand = firstCommand;
    if (firstCommand.includes("=")) {
      // Remove environment variable part
      const afterEnv = commandParts.find(
        (part, index) => index > 0 && !part.includes("=")
      );
      if (afterEnv) {
        actualFirstCommand = afterEnv;
      }
    }

    if (actualFirstCommand === blockedCmd) {
      throw new Error(BLOCKED_COMMAND_MESSAGES[blockedCmd]);
    }

    // Enhanced pattern matching for complex command structures
    if (!isWhichOrWhereis) {
      // Check for blocked commands in various contexts, but skip if it's a virtual environment python
      const isVenvPython =
        blockedCmd.startsWith("python") &&
        venvPatterns.some((pattern) => pattern.test(actualFirstCommand));

      if (!isVenvPython) {
        const patterns: RegExp[] = [
          // Direct command anywhere
          new RegExp(`\\b${blockedCmd}\\b`, "g"),
          // In command substitution $(...)
          new RegExp(`\\$\\([^)]*\\b${blockedCmd}\\b[^)]*\\)`, "g"),
          // In backticks `...`
          new RegExp(`\`[^\`]*\\b${blockedCmd}\\b[^\`]*\``, "g"),
          // In quoted strings within commands
          new RegExp(`["'][^"']*\\b${blockedCmd}\\b[^"']*["']`, "g"),
          // After operators like &&, ||, ;, |
          new RegExp(`[;&|]{1,2}\\s*\\b${blockedCmd}\\b`, "g"),
          // In background execution &
          new RegExp(`\\b${blockedCmd}\\b\\s*&`, "g"),
          // With redirection
          new RegExp(`\\b${blockedCmd}\\b\\s*[<>]`, "g"),
          // Escaped characters
          new RegExp(`\\b${blockedCmd.replace(/(.)/g, "$1\\\\?")}\\b`, "g"),
        ];

        for (const pattern of patterns) {
          if (pattern.test(command)) {
            // For python commands, check if it's a virtual environment python
            if (blockedCmd.startsWith("python")) {
              // Check if any venv python patterns match in the command
              const hasVenvPython = venvPatterns.some((venvPattern) =>
                venvPattern.test(command)
              );
              if (!hasVenvPython) {
                throw new Error(BLOCKED_COMMAND_MESSAGES[blockedCmd]);
              }
            } else {
              throw new Error(BLOCKED_COMMAND_MESSAGES[blockedCmd]);
            }
          }
        }
      }
    }
  }
}

function checkGitCommand(command: string): void {
  if (typeof command !== "string" || typeof command.trim !== "function") return;

  const commandParts: string[] = command.trim().split(/\s+/);
  const firstCommand: string = commandParts[0];

  // Handle environment variables (VAR=value git ...)
  let actualFirstCommand: string = firstCommand;
  if (firstCommand.includes("=")) {
    const afterEnv: string | undefined = commandParts.find(
      (part: string, index: number) => index > 0 && !part.includes("=")
    );
    if (afterEnv) {
      actualFirstCommand = afterEnv;
    }
  }

  // Handle exec and eval wrappers
  if (firstCommand === "exec" || firstCommand === "eval") {
    const remainingCommand = commandParts.slice(1).join(" ");
    if (remainingCommand.includes("git")) {
      // Check if it's an allowed git command
      const isAllowed = ALLOWED_GIT_COMMANDS.some((cmd) =>
        remainingCommand.trim().startsWith(cmd)
      );
      if (!isAllowed) {
        throw new Error(BLOCKED_COMMAND_MESSAGES["git"]);
      }
    }
  }

  if (actualFirstCommand === "git") {
    const isAllowed = ALLOWED_GIT_COMMANDS.some((cmd) =>
      command.trim().startsWith(cmd)
    );
    if (!isAllowed) {
      throw new Error(BLOCKED_COMMAND_MESSAGES["git"]);
    }
  }

  // Check for git commands in complex structures
  const gitPatterns: RegExp[] = [
    // In command substitution $(...)
    /\$\([^)]*git[^)]*\)/g,
    // In backticks `...`
    /`[^`]*git[^`]*`/g,
    // In quoted strings
    /["'][^"']*git[^"']*["']/g,
    // After operators like &&, ||, ;, |
    /[;&|]{1,2}\s*git/g,
    // In background execution
    /git\s*&/g,
    // With redirection
    /git\s*[<>]/g,
  ];

  for (const pattern of gitPatterns) {
    if (pattern.test(command)) {
      // Extract the git command part and check if it's allowed
      const gitMatch = command.match(/git\s+[^\s;&|`]*/);
      if (gitMatch) {
        const gitCommand = gitMatch[0];
        const isAllowed = ALLOWED_GIT_COMMANDS.some((cmd) =>
          gitCommand.startsWith(cmd)
        );
        if (!isAllowed) {
          throw new Error(BLOCKED_COMMAND_MESSAGES["git"]);
        }
      }
    }
  }
}

function checkNixCommand(command: string): void {
  if (typeof command !== "string" || typeof command.trim !== "function") return;

  const tokens: string[] = command.trim().split(/\s+/);

  // Handle exec and eval wrappers
  if (tokens[0] === "exec" || tokens[0] === "eval") {
    const remainingCommand: string = tokens.slice(1).join(" ");
    if (remainingCommand.includes("nix")) {
      // Recursively check the inner command
      checkNixCommand(remainingCommand);
    }
  }

  let nixIdx: number = -1;
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i] === "nix" || tokens[i].endsWith("/nix")) {
      nixIdx = i;
      break;
    }
  }

  if (nixIdx >= 0) {
    const isNixRunOrBuild =
      tokens[nixIdx + 1] === "run" || tokens[nixIdx + 1] === "build";

    if (isNixRunOrBuild) {
      const args = command.split(/\s+/);
      let flakeArg = null;
      for (let i = nixIdx + 2; i < args.length; i++) {
        if (!args[i].startsWith("-")) {
          flakeArg = args[i];
          break;
        }
      }

      if (
        flakeArg &&
        !flakeArg.startsWith("path:") &&
        !flakeArg.match(/^github:/) &&
        !flakeArg.match(/^git\+https:/) &&
        (flakeArg.startsWith("./") ||
          flakeArg.startsWith("../") ||
          flakeArg.startsWith("/") ||
          /^[a-zA-Z0-9._-]+$/.test(flakeArg.split("#")[0]))
      ) {
        throw new Error(BLOCKED_COMMAND_MESSAGES["nix"]);
      }
    }
  }

  // Check for nix commands in complex structures by extracting and validating them
  const complexPatterns: RegExp[] = [
    /\$\([^)]*nix[^)]*\)/g, // In command substitution $(...)
    /`[^\`]*nix[^\`]*`/g, // In backticks `...`
    /["'][^"']*nix[^"']*["']/g, // In quoted strings
  ];

  for (const pattern of complexPatterns) {
    const matches = command.match(pattern);
    if (matches) {
      for (const match of matches) {
        // Extract the nix command from within the complex structure
        const nixMatch = match.match(/nix\s+(run|build)\s+([^\s;&|`"']*)/);
        if (nixMatch) {
          const command = nixMatch[1]; // "run" or "build"
          const flakeArg = nixMatch[2]; // the flake argument

          if (
            flakeArg &&
            !flakeArg.startsWith("path:") &&
            !flakeArg.match(/^github:/) &&
            !flakeArg.match(/^git\+https:/) &&
            (flakeArg.startsWith("./") ||
              flakeArg.startsWith("../") ||
              flakeArg.startsWith("/") ||
              /^[a-zA-Z0-9._-]+$/.test(flakeArg.split("#")[0]))
          ) {
            throw new Error(BLOCKED_COMMAND_MESSAGES["nix"]);
          }
        }
      }
    }
  }
}

function checkReadOnlyFileEdit(filePath: string): void {
  if (typeof filePath !== "string") return;
  if (!filePath) return;

  const fileName: string =
    filePath.split(/[/\\]/).pop()?.split("?")[0]?.split("#")[0] || "";

  if (READ_ONLY_FILES[fileName]) {
    throw new Error(READ_ONLY_FILES[fileName]);
  }
}

export const CommandBlocker: Plugin = async ({
  app,
  client,
  $,
}: PluginInput) => {
  return {
    "tool.execute.before": async (input, output) => {
      if (input.tool === "edit" || input.tool === "write") {
        const filePath = output.args.filePath || output.args.file_path;
        checkReadOnlyFileEdit(filePath);

        if (input.tool === "edit") {
          const newString = output.args.newString || "";
        } else if (input.tool === "write") {
          const content = output.args.content || "";
        }
      }

      if (input.tool === "bash") {
        const command = output.args.command;
        checkPythonNodeCommand(command);
        checkGitCommand(command);
        checkNixCommand(command);
      }
    },
  };
};
