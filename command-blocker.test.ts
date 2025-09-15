import { describe, it, expect, beforeEach } from "vitest";
import { CommandBlocker } from "./command-blocker";

interface PluginHook {
  "tool.execute.before": (input: unknown, output: unknown) => Promise<void>;
}

describe("Command Blocker", () => {
  describe("checkPythonNodeCommand", () => {
    let plugin: any;
    let mockApp: any;
    let mockClient: any;
    let mock$: any;

    beforeEach(async () => {
      mockApp = {};
      mockClient = {};
      mock$ = {};
      plugin = await CommandBlocker({
        app: mockApp,
        client: mockClient,
        $: mock$,
      });
    });

    it("should block node command", async () => {
      const input = { tool: "bash" };
      const output = { args: { command: "node --version" } };

      await expect(
        plugin["tool.execute.before"](input, output)
      ).rejects.toThrow(
        "`node` is blocked to ensure reproducible builds. Use `bun` (faster, more reliable) or `bunx` for running scripts. Example: `bun run dev` instead of `node server.js`"
      );
    });

    it("should block npm command", async () => {
      const input = { tool: "bash" };
      const output = { args: { command: "npm install" } };

      await expect(
        plugin["tool.execute.before"](input, output)
      ).rejects.toThrow(
        "`npm` is blocked to ensure reproducible builds. Use `bun` (faster, more reliable) instead. Examples: `bun install` instead of `npm install`, `bun run build` instead of `npm run build`"
      );
    });

    it("should block npx command", async () => {
      const input = { tool: "bash" };
      const output = { args: { command: "npx create-react-app my-app" } };

      await expect(
        plugin["tool.execute.before"](input, output)
      ).rejects.toThrow(
        "`npx` is blocked to ensure reproducible builds. Use `bunx` (faster, more reliable) instead. Examples: `bunx create-react-app my-app` instead of `npx create-react-app my-app`"
      );
    });

    it("should block pip command", async () => {
      const input = { tool: "bash" };
      const output = { args: { command: "pip install requests" } };

      await expect(
        plugin["tool.execute.before"](input, output)
      ).rejects.toThrow(
        "`pip` is blocked to ensure reproducible builds. Use `uv` or `uvx` for dependency management. Example: `uv add requests` instead of `pip install requests`"
      );
    });

    it("should block python commands", async () => {
      const input1 = { tool: "bash" };
      const output1 = { args: { command: "python script.py" } };
      await expect(
        plugin["tool.execute.before"](input1, output1)
      ).rejects.toThrow(
        "`python` is blocked to ensure environment isolation. Use `uv` for dependency management or `uvx` for running tools. Virtual environment python (e.g., `.venv/bin/python`) is allowed. Example: `uv run python script.py`"
      );

      const input2 = { tool: "bash" };
      const output2 = { args: { command: "python2 script.py" } };
      await expect(
        plugin["tool.execute.before"](input2, output2)
      ).rejects.toThrow(
        "`python2` is blocked (Python 2 is deprecated). Use `uv` with Python 3 for modern dependency management. Virtual environment python2 commands are allowed if needed. Example: `uv run --python 3.8 python script.py`"
      );

      const input3 = { tool: "bash" };
      const output3 = { args: { command: "python3 script.py" } };
      await expect(
        plugin["tool.execute.before"](input3, output3)
      ).rejects.toThrow(
        "`python3` is blocked to ensure environment isolation. Use `uv` for dependency management or `uvx` for running tools. Virtual environment python3 (e.g., `.venv/bin/python3`) is allowed. Example: `uv run python3 script.py`"
      );
    });

    it("should allow virtual environment python commands", async () => {
      const input1 = { tool: "bash" };
      const output1 = { args: { command: ".venv/bin/python script.py" } };
      await expect(async () => {
        await plugin["tool.execute.before"](input1, output1);
      }).not.toThrow();

      const input2 = { tool: "bash" };
      const output2 = {
        args: { command: ".venv/bin/python3 -c 'print(\"hello\")'" },
      };
      await expect(async () => {
        await plugin["tool.execute.before"](input2, output2);
      }).not.toThrow();

      const input3 = { tool: "bash" };
      const output3 = {
        args: { command: "venv/bin/python manage.py runserver" },
      };
      await expect(async () => {
        await plugin["tool.execute.before"](input3, output3);
      }).not.toThrow();

      const input4 = { tool: "bash" };
      const output4 = {
        args: { command: "env/bin/python3 -c 'print(\"hello\")'" },
      };
      await expect(async () => {
        await plugin["tool.execute.before"](input4, output4);
      }).not.toThrow();

      const input5 = { tool: "bash" };
      const output5 = { args: { command: "./.venv/bin/python test.py" } };
      await expect(async () => {
        await plugin["tool.execute.before"](input5, output5);
      }).not.toThrow();

      const input6 = { tool: "bash" };
      const output6 = { args: { command: "../venv/bin/python3 script.py" } };
      await expect(async () => {
        await plugin["tool.execute.before"](input6, output6);
      }).not.toThrow();

      const input7 = { tool: "bash" };
      const output7 = { args: { command: "cd directory & .venv/bin/python" } };
      await expect(async () => {
        await plugin["tool.execute.before"](input7, output7);
      }).not.toThrow();

      const input8 = { tool: "bash" };
      const output8 = { args: { command: "uv run python script.py" } };
      await expect(async () => {
        await plugin["tool.execute.before"](input8, output8);
      }).not.toThrow();

      const input9 = { tool: "bash" };
      const output9 = {
        args: { command: "uv run python3 -c 'print(\"hello\")'" },
      };
      await expect(async () => {
        await plugin["tool.execute.before"](input9, output9);
      }).not.toThrow();

      const input10 = { tool: "bash" };
      const output10 = { args: { command: "uvx python manage.py runserver" } };
      await expect(async () => {
        await plugin["tool.execute.before"](input10, output10);
      }).not.toThrow();

      const input11 = { tool: "bash" };
      const output11 = {
        args: {
          command:
            'cd /home/knoopx/Projects/my-project && uv run python -c "import torchdata; print(dir(torchdata))"',
        },
      };
      await expect(async () => {
        await plugin["tool.execute.before"](input11, output11);
      }).not.toThrow();
    });

    it("should allow which/whereis commands", async () => {
      const input1 = { tool: "bash" };
      const output1 = { args: { command: "which node" } };
      await expect(async () => {
        await plugin["tool.execute.before"](input1, output1);
      }).not.toThrow();

      const input2 = { tool: "bash" };
      const output2 = { args: { command: "whereis python" } };
      await expect(async () => {
        await plugin["tool.execute.before"](input2, output2);
      }).not.toThrow();
    });

    it("should block commands containing blocked words", async () => {
      const input1 = { tool: "bash" };
      const output1 = { args: { command: 'echo "node --version"' } };
      await expect(
        plugin["tool.execute.before"](input1, output1)
      ).rejects.toThrow();

      const input2 = { tool: "bash" };
      const output2 = { args: { command: 'bash -c "npm install"' } };
      await expect(
        plugin["tool.execute.before"](input2, output2)
      ).rejects.toThrow();
    });

    it("should allow non-blocked commands", async () => {
      const input1 = { tool: "bash" };
      const output1 = { args: { command: "ls -la" } };
      await expect(async () => {
        await plugin["tool.execute.before"](input1, output1);
      }).not.toThrow();

      const input2 = { tool: "bash" };
      const output2 = { args: { command: "bun install" } };
      await expect(async () => {
        await plugin["tool.execute.before"](input2, output2);
      }).not.toThrow();
    });

    // Test piping and escape methods
    it("should block node in piped commands", async () => {
      const input1 = { tool: "bash" };
      const output1 = { args: { command: 'echo "node --version" | bash' } };
      await expect(
        plugin["tool.execute.before"](input1, output1)
      ).rejects.toThrow();

      const input2 = { tool: "bash" };
      const output2 = { args: { command: "cat file.txt | node" } };
      await expect(
        plugin["tool.execute.before"](input2, output2)
      ).rejects.toThrow();

      const input3 = { tool: "bash" };
      const output3 = { args: { command: 'node script.js | grep "output"' } };
      await expect(
        plugin["tool.execute.before"](input3, output3)
      ).rejects.toThrow();
    });

    it("should block npm in piped commands", async () => {
      const input1 = { tool: "bash" };
      const output1 = { args: { command: 'echo "npm install" | sh' } };
      await expect(
        plugin["tool.execute.before"](input1, output1)
      ).rejects.toThrow();

      const input2 = { tool: "bash" };
      const output2 = { args: { command: "npm list | grep package" } };
      await expect(
        plugin["tool.execute.before"](input2, output2)
      ).rejects.toThrow();
    });

    it("should block npx in piped commands", async () => {
      const input1 = { tool: "bash" };
      const output1 = { args: { command: 'echo "npx create-react-app" | sh' } };
      await expect(
        plugin["tool.execute.before"](input1, output1)
      ).rejects.toThrow();

      const input2 = { tool: "bash" };
      const output2 = { args: { command: "npx eslint | grep error" } };
      await expect(
        plugin["tool.execute.before"](input2, output2)
      ).rejects.toThrow();
    });

    it("should block pip in piped commands", async () => {
      const input1 = { tool: "bash" };
      const output1 = {
        args: { command: 'echo "pip install requests" | python' },
      };
      await expect(
        plugin["tool.execute.before"](input1, output1)
      ).rejects.toThrow();

      const input2 = { tool: "bash" };
      const output2 = { args: { command: "pip list | head -5" } };
      await expect(
        plugin["tool.execute.before"](input2, output2)
      ).rejects.toThrow();
    });

    it("should block python in piped commands", async () => {
      const input1 = { tool: "bash" };
      const output1 = { args: { command: 'echo "print(1)" | python' } };
      await expect(
        plugin["tool.execute.before"](input1, output1)
      ).rejects.toThrow();

      const input2 = { tool: "bash" };
      const output2 = { args: { command: 'python -c "print(1)" | cat' } };
      await expect(
        plugin["tool.execute.before"](input2, output2)
      ).rejects.toThrow();
    });

    it("should block commands with command substitution", async () => {
      const input1 = { tool: "bash" };
      const output1 = { args: { command: "echo $(node --version)" } };
      await expect(
        plugin["tool.execute.before"](input1, output1)
      ).rejects.toThrow();

      const input2 = { tool: "bash" };
      const output2 = { args: { command: "bash -c $(npm install)" } };
      await expect(
        plugin["tool.execute.before"](input2, output2)
      ).rejects.toThrow();

      const input3 = { tool: "bash" };
      const output3 = { args: { command: "sh -c $(pip install requests)" } };
      await expect(
        plugin["tool.execute.before"](input3, output3)
      ).rejects.toThrow();
    });

    it("should block commands with backticks", async () => {
      const input1 = { tool: "bash" };
      const output1 = { args: { command: "echo `node --version`" } };
      await expect(
        plugin["tool.execute.before"](input1, output1)
      ).rejects.toThrow();

      const input2 = { tool: "bash" };
      const output2 = { args: { command: "bash -c `npm install`" } };
      await expect(
        plugin["tool.execute.before"](input2, output2)
      ).rejects.toThrow();

      const input3 = { tool: "bash" };
      const output3 = { args: { command: "sh -c `pip install requests`" } };
      await expect(
        plugin["tool.execute.before"](input3, output3)
      ).rejects.toThrow();
    });

    it("should block commands with semicolons", async () => {
      const input1 = { tool: "bash" };
      const output1 = { args: { command: "ls; node --version" } };
      await expect(
        plugin["tool.execute.before"](input1, output1)
      ).rejects.toThrow();

      const input2 = { tool: "bash" };
      const output2 = { args: { command: 'echo "test"; npm install' } };
      await expect(
        plugin["tool.execute.before"](input2, output2)
      ).rejects.toThrow();

      const input3 = { tool: "bash" };
      const output3 = { args: { command: "pwd; pip install requests" } };
      await expect(
        plugin["tool.execute.before"](input3, output3)
      ).rejects.toThrow();
    });

    it("should block commands with && and || operators", async () => {
      const input1 = { tool: "bash" };
      const output1 = { args: { command: "ls && node --version" } };
      await expect(
        plugin["tool.execute.before"](input1, output1)
      ).rejects.toThrow();

      const input2 = { tool: "bash" };
      const output2 = { args: { command: 'echo "test" && npm install' } };
      await expect(
        plugin["tool.execute.before"](input2, output2)
      ).rejects.toThrow();

      const input3 = { tool: "bash" };
      const output3 = { args: { command: "pwd || pip install requests" } };
      await expect(
        plugin["tool.execute.before"](input3, output3)
      ).rejects.toThrow();
    });

    it("should block commands with background execution", async () => {
      const input1 = { tool: "bash" };
      const output1 = { args: { command: "node --version &" } };
      await expect(
        plugin["tool.execute.before"](input1, output1)
      ).rejects.toThrow();

      const input2 = { tool: "bash" };
      const output2 = { args: { command: "npm install &" } };
      await expect(
        plugin["tool.execute.before"](input2, output2)
      ).rejects.toThrow();

      const input3 = { tool: "bash" };
      const output3 = { args: { command: "pip install requests &" } };
      await expect(
        plugin["tool.execute.before"](input3, output3)
      ).rejects.toThrow();
    });

    it("should block commands with redirection", async () => {
      const input1 = { tool: "bash" };
      const output1 = { args: { command: "node --version > output.txt" } };
      await expect(
        plugin["tool.execute.before"](input1, output1)
      ).rejects.toThrow();

      const input2 = { tool: "bash" };
      const output2 = { args: { command: "npm install >> log.txt" } };
      await expect(
        plugin["tool.execute.before"](input2, output2)
      ).rejects.toThrow();

      const input3 = { tool: "bash" };
      const output3 = { args: { command: "pip install requests 2>&1" } };
      await expect(
        plugin["tool.execute.before"](input3, output3)
      ).rejects.toThrow();
    });

    it("should block commands with environment variables", async () => {
      const input1 = { tool: "bash" };
      const output1 = { args: { command: "NODE_ENV=production node" } };
      await expect(
        plugin["tool.execute.before"](input1, output1)
      ).rejects.toThrow();

      const input2 = { tool: "bash" };
      const output2 = {
        args: { command: "npm_config_cache=/tmp npm install" },
      };
      await expect(
        plugin["tool.execute.before"](input2, output2)
      ).rejects.toThrow();

      const input3 = { tool: "bash" };
      const output3 = {
        args: { command: "PIP_INDEX_URL=https://pypi.org/simple pip install" },
      };
      await expect(
        plugin["tool.execute.before"](input3, output3)
      ).rejects.toThrow();
    });

    it("should block commands with escaped characters", async () => {
      const input1 = { tool: "bash" };
      const output1 = { args: { command: "n\\ode --version" } };
      await expect(
        plugin["tool.execute.before"](input1, output1)
      ).rejects.toThrow();

      const input2 = { tool: "bash" };
      const output2 = { args: { command: "np\\m install" } };
      await expect(
        plugin["tool.execute.before"](input2, output2)
      ).rejects.toThrow();

      const input3 = { tool: "bash" };
      const output3 = { args: { command: "pi\\p install" } };
      await expect(
        plugin["tool.execute.before"](input3, output3)
      ).rejects.toThrow();
    });

    it("should block commands with quotes containing blocked commands", async () => {
      const input1 = { tool: "bash" };
      const output1 = { args: { command: 'bash -c "node --version"' } };
      await expect(
        plugin["tool.execute.before"](input1, output1)
      ).rejects.toThrow();

      const input2 = { tool: "bash" };
      const output2 = { args: { command: "sh -c 'npm install'" } };
      await expect(
        plugin["tool.execute.before"](input2, output2)
      ).rejects.toThrow();

      const input3 = { tool: "bash" };
      const output3 = {
        args: {
          command:
            "python -c \"import subprocess; subprocess.run(['pip', 'install', 'requests'])\"",
        },
      };
      await expect(
        plugin["tool.execute.before"](input3, output3)
      ).rejects.toThrow();
    });

    it("should block commands with eval", async () => {
      const input1 = { tool: "bash" };
      const output1 = { args: { command: 'eval "node --version"' } };
      await expect(
        plugin["tool.execute.before"](input1, output1)
      ).rejects.toThrow();

      const input2 = { tool: "bash" };
      const output2 = { args: { command: "eval 'npm install'" } };
      await expect(
        plugin["tool.execute.before"](input2, output2)
      ).rejects.toThrow();

      const input3 = { tool: "bash" };
      const output3 = { args: { command: 'bash -c "eval pip install"' } };
      await expect(
        plugin["tool.execute.before"](input3, output3)
      ).rejects.toThrow();
    });

    it("should block commands with exec", async () => {
      const input1 = { tool: "bash" };
      const output1 = { args: { command: "exec node --version" } };
      await expect(
        plugin["tool.execute.before"](input1, output1)
      ).rejects.toThrow();

      const input2 = { tool: "bash" };
      const output2 = { args: { command: "exec npm install" } };
      await expect(
        plugin["tool.execute.before"](input2, output2)
      ).rejects.toThrow();

      const input3 = { tool: "bash" };
      const output3 = { args: { command: "exec pip install" } };
      await expect(
        plugin["tool.execute.before"](input3, output3)
      ).rejects.toThrow();
    });

    it("should allow safe piped commands", async () => {
      const input1 = { tool: "bash" };
      const output1 = { args: { command: "ls -la | grep test" } };
      await expect(async () => {
        await plugin["tool.execute.before"](input1, output1);
      }).not.toThrow();

      const input2 = { tool: "bash" };
      const output2 = { args: { command: "cat file.txt | head -5" } };
      await expect(async () => {
        await plugin["tool.execute.before"](input2, output2);
      }).not.toThrow();

      const input3 = { tool: "bash" };
      const output3 = { args: { command: 'echo "hello" | wc -l' } };
      await expect(async () => {
        await plugin["tool.execute.before"](input3, output3);
      }).not.toThrow();
    });

    it("should allow safe command substitution", async () => {
      const input1 = { tool: "bash" };
      const output1 = { args: { command: "echo $(date)" } };
      await expect(async () => {
        await plugin["tool.execute.before"](input1, output1);
      }).not.toThrow();

      const input2 = { tool: "bash" };
      const output2 = { args: { command: "echo `pwd`" } };
      await expect(async () => {
        await plugin["tool.execute.before"](input2, output2);
      }).not.toThrow();

      const input3 = { tool: "bash" };
      const output3 = { args: { command: 'ls $(echo "*.txt")' } };
      await expect(async () => {
        await plugin["tool.execute.before"](input3, output3);
      }).not.toThrow();
    });
  });

  describe("checkGitCommand", () => {
    let plugin: any;
    let mockApp: any;
    let mockClient: any;
    let mock$: any;

    beforeEach(async () => {
      mockApp = {};
      mockClient = {};
      mock$ = {};
      plugin = await CommandBlocker({
        app: mockApp,
        client: mockClient,
        $: mock$,
      });
    });

    it("should allow read-only git commands", async () => {
      const input1 = { tool: "bash" };
      const output1 = { args: { command: "git status" } };
      await expect(async () => {
        await plugin["tool.execute.before"](input1, output1);
      }).not.toThrow();

      const input2 = { tool: "bash" };
      const output2 = { args: { command: "git diff" } };
      await expect(async () => {
        await plugin["tool.execute.before"](input2, output2);
      }).not.toThrow();

      const input3 = { tool: "bash" };
      const output3 = { args: { command: "git show HEAD" } };
      await expect(async () => {
        await plugin["tool.execute.before"](input3, output3);
      }).not.toThrow();

      const input4 = { tool: "bash" };
      const output4 = { args: { command: "git rev-parse HEAD" } };
      await expect(async () => {
        await plugin["tool.execute.before"](input4, output4);
      }).not.toThrow();

       const input5 = { tool: "bash" };
       const output5 = { args: { command: "git log --oneline -1" } };
       await expect(async () => {
         await plugin["tool.execute.before"](input5, output5);
       }).not.toThrow();

       const input6 = { tool: "bash" };
       const output6 = { args: { command: "git ls-files --others --exclude-standard" } };
       await expect(async () => {
         await plugin["tool.execute.before"](input6, output6);
       }).not.toThrow();
     });

    it("should block write git commands", async () => {
      const input1 = { tool: "bash" };
      const output1 = { args: { command: "git add ." } };
      await expect(
        plugin["tool.execute.before"](input1, output1)
      ).rejects.toThrow(
        "`git` write operations are blocked to prevent agents from managing version control. Only read-only commands are allowed: `git status`, `git diff`, `git show`, `git log`, `git rev-parse`."
      );

      const input2 = { tool: "bash" };
      const output2 = { args: { command: 'git commit -m "test"' } };
      await expect(
        plugin["tool.execute.before"](input2, output2)
      ).rejects.toThrow();

      const input3 = { tool: "bash" };
      const output3 = { args: { command: "git push" } };
      await expect(
        plugin["tool.execute.before"](input3, output3)
      ).rejects.toThrow();

      const input4 = { tool: "bash" };
      const output4 = { args: { command: "git checkout file.txt" } };
      await expect(
        plugin["tool.execute.before"](input4, output4)
      ).rejects.toThrow();

      const input5 = { tool: "bash" };
      const output5 = { args: { command: "git checkout HEAD -- file.txt" } };
      await expect(
        plugin["tool.execute.before"](input5, output5)
      ).rejects.toThrow();

      const input6 = { tool: "bash" };
      const output6 = { args: { command: "git checkout main" } };
      await expect(
        plugin["tool.execute.before"](input6, output6)
      ).rejects.toThrow();
    });

    it("should allow non-git commands", async () => {
      const input = { tool: "bash" };
      const output = { args: { command: "ls -la" } };
      await expect(async () => {
        await plugin["tool.execute.before"](input, output);
      }).not.toThrow();
    });

    // Test git command escape methods
    it("should block git in piped commands", async () => {
      const input1 = { tool: "bash" };
      const output1 = { args: { command: 'echo "git add ." | bash' } };
      await expect(
        plugin["tool.execute.before"](input1, output1)
      ).rejects.toThrow();

      const input2 = { tool: "bash" };
      const output2 = { args: { command: "git status | grep modified" } };
      await expect(
        plugin["tool.execute.before"](input2, output2)
      ).resolves.toBeUndefined(); // This should be allowed since git status is allowed

      const input3 = { tool: "bash" };
      const output3 = { args: { command: 'echo "git commit" | sh' } };
      await expect(
        plugin["tool.execute.before"](input3, output3)
      ).rejects.toThrow();
    });

    it("should block git with command substitution", async () => {
      const input1 = { tool: "bash" };
      const output1 = { args: { command: "echo $(git add .)" } };
      await expect(
        plugin["tool.execute.before"](input1, output1)
      ).rejects.toThrow();

      const input2 = { tool: "bash" };
      const output2 = { args: { command: 'bash -c $(git commit -m "test")' } };
      await expect(
        plugin["tool.execute.before"](input2, output2)
      ).rejects.toThrow();
    });

    it("should block git with semicolons", async () => {
      const input1 = { tool: "bash" };
      const output1 = { args: { command: "ls; git add ." } };
      await expect(
        plugin["tool.execute.before"](input1, output1)
      ).rejects.toThrow();

      const input2 = { tool: "bash" };
      const output2 = { args: { command: 'echo "test"; git commit' } };
      await expect(
        plugin["tool.execute.before"](input2, output2)
      ).rejects.toThrow();
    });

    it("should block git with && and || operators", async () => {
      const input1 = { tool: "bash" };
      const output1 = { args: { command: "ls && git add ." } };
      await expect(
        plugin["tool.execute.before"](input1, output1)
      ).rejects.toThrow();

      const input2 = { tool: "bash" };
      const output2 = { args: { command: 'echo "test" && git commit' } };
      await expect(
        plugin["tool.execute.before"](input2, output2)
      ).rejects.toThrow();

      const input3 = { tool: "bash" };
      const output3 = { args: { command: "pwd || git push" } };
      await expect(
        plugin["tool.execute.before"](input3, output3)
      ).rejects.toThrow();
    });

    it("should block git with background execution", async () => {
      const input1 = { tool: "bash" };
      const output1 = { args: { command: "git add . &" } };
      await expect(
        plugin["tool.execute.before"](input1, output1)
      ).rejects.toThrow();

      const input2 = { tool: "bash" };
      const output2 = { args: { command: 'git commit -m "test" &' } };
      await expect(
        plugin["tool.execute.before"](input2, output2)
      ).rejects.toThrow();
    });

    it("should block git with redirection", async () => {
      const input1 = { tool: "bash" };
      const output1 = { args: { command: "git add . > /dev/null" } };
      await expect(
        plugin["tool.execute.before"](input1, output1)
      ).rejects.toThrow();

      const input2 = { tool: "bash" };
      const output2 = { args: { command: "git commit >> log.txt" } };
      await expect(
        plugin["tool.execute.before"](input2, output2)
      ).rejects.toThrow();
    });

    it("should block git with environment variables", async () => {
      const input1 = { tool: "bash" };
      const output1 = {
        args: { command: 'GIT_AUTHOR_NAME="Test" git commit' },
      };
      await expect(
        plugin["tool.execute.before"](input1, output1)
      ).rejects.toThrow();

      const input2 = { tool: "bash" };
      const output2 = {
        args: { command: 'GIT_COMMITTER_EMAIL="test@example.com" git add .' },
      };
      await expect(
        plugin["tool.execute.before"](input2, output2)
      ).rejects.toThrow();
    });

    it("should block git with eval", async () => {
      const input1 = { tool: "bash" };
      const output1 = { args: { command: 'eval "git add ."' } };
      await expect(
        plugin["tool.execute.before"](input1, output1)
      ).rejects.toThrow();

      const input2 = { tool: "bash" };
      const output2 = { args: { command: "eval 'git commit'" } };
      await expect(
        plugin["tool.execute.before"](input2, output2)
      ).rejects.toThrow();
    });

    it("should block git with exec", async () => {
      const input1 = { tool: "bash" };
      const output1 = { args: { command: "exec git add ." } };
      await expect(
        plugin["tool.execute.before"](input1, output1)
      ).rejects.toThrow();

      const input2 = { tool: "bash" };
      const output2 = { args: { command: "exec git commit" } };
      await expect(
        plugin["tool.execute.before"](input2, output2)
      ).rejects.toThrow();
    });

    it("should allow safe git operations with pipes", async () => {
      const input1 = { tool: "bash" };
      const output1 = { args: { command: "git status | cat" } };
      await expect(async () => {
        await plugin["tool.execute.before"](input1, output1);
      }).not.toThrow();

      const input2 = { tool: "bash" };
      const output2 = { args: { command: "git diff | less" } };
      await expect(async () => {
        await plugin["tool.execute.before"](input2, output2);
      }).not.toThrow();

      const input3 = { tool: "bash" };
      const output3 = { args: { command: "git show HEAD | head -20" } };
      await expect(async () => {
        await plugin["tool.execute.before"](input3, output3);
      }).not.toThrow();
    });
  });

  describe("checkNixCommand", () => {
    let plugin: any;
    let mockApp: any;
    let mockClient: any;
    let mock$: any;

    beforeEach(async () => {
      mockApp = {};
      mockClient = {};
      mock$ = {};
      plugin = await CommandBlocker({
        app: mockApp,
        client: mockClient,
        $: mock$,
      });
    });

    it("should allow nix commands with path: prefix", async () => {
      const input1 = { tool: "bash" };
      const output1 = { args: { command: "nix run path:./my-flake#output" } };
      await expect(async () => {
        await plugin["tool.execute.before"](input1, output1);
      }).not.toThrow();

      const input2 = { tool: "bash" };
      const output2 = { args: { command: "nix build path:../flake#package" } };
      await expect(async () => {
        await plugin["tool.execute.before"](input2, output2);
      }).not.toThrow();
    });

    it("should allow nix commands with github: prefix", async () => {
      const input = { tool: "bash" };
      const output = { args: { command: "nix run github:user/repo#output" } };
      await expect(async () => {
        await plugin["tool.execute.before"](input, output);
      }).not.toThrow();
    });

    it("should allow nix commands with git+https: prefix", async () => {
      const input = { tool: "bash" };
      const output = {
        args: { command: "nix run git+https://github.com/user/repo#output" },
      };
      await expect(async () => {
        await plugin["tool.execute.before"](input, output);
      }).not.toThrow();
    });

    it("should block nix commands without proper prefix", async () => {
      const input1 = { tool: "bash" };
      const output1 = { args: { command: "nix run ./my-flake#output" } };
      await expect(
        plugin["tool.execute.before"](input1, output1)
      ).rejects.toThrow(
        "Local flake paths without `path:` prefix are blocked to ensure reproducible builds. Use `path:` for local flakes (includes uncommitted changes), `github:` for remote repos, or `git+https:` for git URLs. Examples: `nix run path:./my-flake#output`, `nix run github:user/repo#output`"
      );

      const input2 = { tool: "bash" };
      const output2 = { args: { command: "nix run ../flake#package" } };
      await expect(
        plugin["tool.execute.before"](input2, output2)
      ).rejects.toThrow();

      const input3 = { tool: "bash" };
      const output3 = { args: { command: "nix run /absolute/path#output" } };
      await expect(
        plugin["tool.execute.before"](input3, output3)
      ).rejects.toThrow();
    });

    it("should allow nix registry references", async () => {
      const input1 = { tool: "bash" };
      const output1 = { args: { command: "nix run nixpkgs#yq" } };
      await expect(async () => {
        await plugin["tool.execute.before"](input1, output1);
      }).not.toThrow();

      const input2 = { tool: "bash" };
      const output2 = { args: { command: "nix run nixpkgs/unstable#hello" } };
      await expect(async () => {
        await plugin["tool.execute.before"](input2, output2);
      }).not.toThrow();
    });

    it("should allow non-nix commands", async () => {
      const input = { tool: "bash" };
      const output = { args: { command: "ls -la" } };
      await expect(async () => {
        await plugin["tool.execute.before"](input, output);
      }).not.toThrow();
    });

    it("should allow nix commands that are not run or build", async () => {
      const input1 = { tool: "bash" };
      const output1 = { args: { command: "nix flake update" } };
      await expect(async () => {
        await plugin["tool.execute.before"](input1, output1);
      }).not.toThrow();

      const input2 = { tool: "bash" };
      const output2 = { args: { command: "nix develop" } };
      await expect(async () => {
        await plugin["tool.execute.before"](input2, output2);
      }).not.toThrow();
    });

    // Test nix command escape methods
    it("should block nix in piped commands", async () => {
      const input1 = { tool: "bash" };
      const output1 = {
        args: { command: 'echo "nix run ./flake#package" | bash' },
      };
      await expect(
        plugin["tool.execute.before"](input1, output1)
      ).rejects.toThrow();

      const input2 = { tool: "bash" };
      const output2 = { args: { command: "cat flake.nix | nix build" } };
      await expect(async () => {
        await plugin["tool.execute.before"](input2, output2);
      }).not.toThrow(); // This should be allowed since nix build is allowed

      const input3 = { tool: "bash" };
      const output3 = {
        args: { command: 'echo "nix run github:user/repo" | sh' },
      };
      await expect(async () => {
        await plugin["tool.execute.before"](input3, output3);
      }).not.toThrow(); // This should be allowed since it has github: prefix
    });

    it("should block nix with command substitution", async () => {
      const input1 = { tool: "bash" };
      const output1 = { args: { command: "echo $(nix run ./flake#package)" } };
      await expect(
        plugin["tool.execute.before"](input1, output1)
      ).rejects.toThrow();

      const input2 = { tool: "bash" };
      const output2 = {
        args: { command: "bash -c $(nix build ../flake#package)" },
      };
      await expect(
        plugin["tool.execute.before"](input2, output2)
      ).rejects.toThrow();
    });

    it("should block nix with semicolons", async () => {
      const input1 = { tool: "bash" };
      const output1 = { args: { command: "ls; nix run ./flake#package" } };
      await expect(
        plugin["tool.execute.before"](input1, output1)
      ).rejects.toThrow();

      const input2 = { tool: "bash" };
      const output2 = { args: { command: 'echo "test"; nix build ../flake' } };
      await expect(
        plugin["tool.execute.before"](input2, output2)
      ).rejects.toThrow();
    });

    it("should block nix with && and || operators", async () => {
      const input1 = { tool: "bash" };
      const output1 = { args: { command: "ls && nix run ./flake#package" } };
      await expect(
        plugin["tool.execute.before"](input1, output1)
      ).rejects.toThrow();

      const input2 = { tool: "bash" };
      const output2 = {
        args: { command: 'echo "test" && nix build ../flake' },
      };
      await expect(
        plugin["tool.execute.before"](input2, output2)
      ).rejects.toThrow();

      const input3 = { tool: "bash" };
      const output3 = { args: { command: "pwd || nix run /absolute/path" } };
      await expect(
        plugin["tool.execute.before"](input3, output3)
      ).rejects.toThrow();
    });

    it("should block nix with background execution", async () => {
      const input1 = { tool: "bash" };
      const output1 = { args: { command: "nix run ./flake#package &" } };
      await expect(
        plugin["tool.execute.before"](input1, output1)
      ).rejects.toThrow();

      const input2 = { tool: "bash" };
      const output2 = { args: { command: "nix build ../flake#package &" } };
      await expect(
        plugin["tool.execute.before"](input2, output2)
      ).rejects.toThrow();
    });

    it("should block nix with redirection", async () => {
      const input1 = { tool: "bash" };
      const output1 = {
        args: { command: "nix run ./flake#package > output.txt" },
      };
      await expect(
        plugin["tool.execute.before"](input1, output1)
      ).rejects.toThrow();

      const input2 = { tool: "bash" };
      const output2 = {
        args: { command: "nix build ../flake#package >> log.txt" },
      };
      await expect(
        plugin["tool.execute.before"](input2, output2)
      ).rejects.toThrow();
    });

    it("should block nix with environment variables", async () => {
      const input1 = { tool: "bash" };
      const output1 = {
        args: { command: "NIXPKGS_ALLOW_UNFREE=1 nix run ./flake" },
      };
      await expect(
        plugin["tool.execute.before"](input1, output1)
      ).rejects.toThrow();

      const input2 = { tool: "bash" };
      const output2 = { args: { command: "NIX_PATH=/tmp nix build ../flake" } };
      await expect(
        plugin["tool.execute.before"](input2, output2)
      ).rejects.toThrow();
    });

    it("should block nix with eval", async () => {
      const input1 = { tool: "bash" };
      const output1 = { args: { command: 'eval "nix run ./flake#package"' } };
      await expect(
        plugin["tool.execute.before"](input1, output1)
      ).rejects.toThrow();

      const input2 = { tool: "bash" };
      const output2 = { args: { command: "eval 'nix build ../flake'" } };
      await expect(
        plugin["tool.execute.before"](input2, output2)
      ).rejects.toThrow();
    });

    it("should block nix with exec", async () => {
      const input1 = { tool: "bash" };
      const output1 = { args: { command: "exec nix run ./flake#package" } };
      await expect(
        plugin["tool.execute.before"](input1, output1)
      ).rejects.toThrow();

      const input2 = { tool: "bash" };
      const output2 = { args: { command: "exec nix build ../flake" } };
      await expect(
        plugin["tool.execute.before"](input2, output2)
      ).rejects.toThrow();
    });

    it("should allow safe nix operations with pipes", async () => {
      const input1 = { tool: "bash" };
      const output1 = { args: { command: "nix flake show | cat" } };
      await expect(async () => {
        await plugin["tool.execute.before"](input1, output1);
      }).not.toThrow();

      const input2 = { tool: "bash" };
      const output2 = {
        args: { command: "nix build path:./flake#package | head -10" },
      };
      await expect(async () => {
        await plugin["tool.execute.before"](input2, output2);
      }).not.toThrow();

      const input3 = { tool: "bash" };
      const output3 = {
        args: { command: "nix run github:user/repo#package | grep output" },
      };
      await expect(async () => {
        await plugin["tool.execute.before"](input3, output3);
      }).not.toThrow();
    });
  });

  describe("checkReadOnlyFileEdit", () => {
    let plugin: any;
    let mockApp: any;
    let mockClient: any;
    let mock$: any;

    beforeEach(async () => {
      mockApp = {};
      mockClient = {};
      mock$ = {};
      plugin = await CommandBlocker({
        app: mockApp,
        client: mockClient,
        $: mock$,
      });
    });

    it("should block editing lock files", async () => {
      const input1 = { tool: "edit" };
      const output1 = { args: { filePath: "package-lock.json" } };
      await expect(
        plugin["tool.execute.before"](input1, output1)
      ).rejects.toThrow(
        "`package-lock.json` editing is blocked to ensure reproducible builds. This auto-generated file ensures consistent npm installs. Use `bun install` or `bun update` to modify dependencies."
      );

      const input2 = { tool: "edit" };
      const output2 = { args: { filePath: "bun.lockb" } };
      await expect(
        plugin["tool.execute.before"](input2, output2)
      ).rejects.toThrow(
        "`bun.lockb` editing is blocked to ensure reproducible builds. This auto-generated binary lockfile ensures consistent Bun installs. Use `bun install` or `bun update` to modify dependencies."
      );

      const input3 = { tool: "edit" };
      const output3 = { args: { filePath: "yarn.lock" } };
      await expect(
        plugin["tool.execute.before"](input3, output3)
      ).rejects.toThrow(
        "`yarn.lock` editing is blocked to ensure reproducible builds. This auto-generated file ensures consistent Yarn installs. Use `yarn install` or `yarn upgrade` to modify dependencies."
      );

      const input4 = { tool: "edit" };
      const output4 = { args: { filePath: "flake.lock" } };
      await expect(
        plugin["tool.execute.before"](input4, output4)
      ).rejects.toThrow(
        "`flake.lock` editing is blocked to ensure reproducible builds. This auto-generated file pins exact dependency versions for Nix flakes. Use `nix flake update` to safely update dependencies."
      );
    });

    it("should allow editing other files", async () => {
      const input1 = { tool: "edit" };
      const output1 = { args: { filePath: "package.json" } };
      await expect(async () => {
        await plugin["tool.execute.before"](input1, output1);
      }).not.toThrow();

      const input2 = { tool: "edit" };
      const output2 = { args: { filePath: "src/main.ts" } };
      await expect(async () => {
        await plugin["tool.execute.before"](input2, output2);
      }).not.toThrow();
    });

    it("should handle empty file path", async () => {
      const input1 = { tool: "edit" };
      const output1 = { args: { filePath: "" } };
      await expect(async () => {
        await plugin["tool.execute.before"](input1, output1);
      }).not.toThrow();

      const input2 = { tool: "edit" };
      const output2 = { args: { filePath: undefined } };
      await expect(async () => {
        await plugin["tool.execute.before"](input2, output2);
      }).not.toThrow();
    });
  });

  describe("checkSecretFileRead", () => {
    let plugin: any;
    let mockApp: any;
    let mockClient: any;
    let mock$: any;

    beforeEach(async () => {
      mockApp = {};
      mockClient = {};
      mock$ = {};
      plugin = await CommandBlocker({
        app: mockApp,
        client: mockClient,
        $: mock$,
      });
    });

    it("should block reading .env files", async () => {
      const input1 = { tool: "read" };
      const output1 = { args: { filePath: ".env" } };
      await expect(
        plugin["tool.execute.before"](input1, output1)
      ).rejects.toThrow(
        "`Reading secret files is blocked to prevent exposure of sensitive data including API keys, credentials, and configuration.`"
      );

      const input2 = { tool: "read" };
      const output2 = { args: { filePath: ".envrc" } };
      await expect(
        plugin["tool.execute.before"](input2, output2)
      ).rejects.toThrow(
        "`Reading secret files is blocked to prevent exposure of sensitive data including API keys, credentials, and configuration.`"
      );

      const input3 = { tool: "read" };
      const output3 = { args: { filePath: ".env.local" } };
      await expect(
        plugin["tool.execute.before"](input3, output3)
      ).rejects.toThrow(
        "`Reading secret files is blocked to prevent exposure of sensitive data including API keys, credentials, and configuration.`"
      );
    });

    it("should block reading secrets files", async () => {
      const input1 = { tool: "read" };
      const output1 = { args: { filePath: "secrets.json" } };
      await expect(
        plugin["tool.execute.before"](input1, output1)
      ).rejects.toThrow(
        "`Reading secret files is blocked to prevent exposure of sensitive data including API keys, credentials, and configuration.`"
      );

      const input2 = { tool: "read" };
      const output2 = { args: { filePath: "config/secrets.json" } };
      await expect(
        plugin["tool.execute.before"](input2, output2)
      ).rejects.toThrow(
        "`Reading secret files is blocked to prevent exposure of sensitive data including API keys, credentials, and configuration.`"
      );

      const input3 = { tool: "read" };
      const output3 = { args: { filePath: ".secrets" } };
      await expect(
        plugin["tool.execute.before"](input3, output3)
      ).rejects.toThrow(
        "`Reading secret files is blocked to prevent exposure of sensitive data including API keys, credentials, and configuration.`"
      );
    });

    it("should block reading SSH key files", async () => {
      const input1 = { tool: "read" };
      const output1 = { args: { filePath: ".ssh/id_rsa" } };
      await expect(
        plugin["tool.execute.before"](input1, output1)
      ).rejects.toThrow(
        "`Reading secret files is blocked to prevent exposure of sensitive data including API keys, credentials, and configuration.`"
      );

      const input2 = { tool: "read" };
      const output2 = { args: { filePath: "id_rsa" } };
      await expect(
        plugin["tool.execute.before"](input2, output2)
      ).rejects.toThrow(
        "`Reading secret files is blocked to prevent exposure of sensitive data including API keys, credentials, and configuration.`"
      );
    });

    it("should block reading AWS credentials", async () => {
      const input1 = { tool: "read" };
      const output1 = { args: { filePath: ".aws/credentials" } };
      await expect(
        plugin["tool.execute.before"](input1, output1)
      ).rejects.toThrow(
        "`Reading secret files is blocked to prevent exposure of sensitive data including API keys, credentials, and configuration.`"
      );

      const input2 = { tool: "read" };
      const output2 = { args: { filePath: ".aws/config" } };
      await expect(
        plugin["tool.execute.before"](input2, output2)
      ).rejects.toThrow(
        "`Reading secret files is blocked to prevent exposure of sensitive data including API keys, credentials, and configuration.`"
      );
    });

    it("should allow reading other files", async () => {
      const input1 = { tool: "read" };
      const output1 = { args: { filePath: "package.json" } };
      await expect(async () => {
        await plugin["tool.execute.before"](input1, output1);
      }).not.toThrow();

      const input2 = { tool: "read" };
      const output2 = { args: { filePath: "src/main.ts" } };
      await expect(async () => {
        await plugin["tool.execute.before"](input2, output2);
      }).not.toThrow();

      const input3 = { tool: "read" };
      const output3 = { args: { filePath: "README.md" } };
      await expect(async () => {
        await plugin["tool.execute.before"](input3, output3);
      }).not.toThrow();
    });

    it("should handle empty file path", async () => {
      const input1 = { tool: "read" };
      const output1 = { args: { filePath: "" } };
      await expect(async () => {
        await plugin["tool.execute.before"](input1, output1);
      }).not.toThrow();

      const input2 = { tool: "read" };
      const output2 = { args: { filePath: undefined } };
      await expect(async () => {
        await plugin["tool.execute.before"](input2, output2);
      }).not.toThrow();
    });

    it("should handle file paths with query parameters and fragments", async () => {
      const input1 = { tool: "read" };
      const output1 = { args: { filePath: ".env?version=1" } };
      await expect(
        plugin["tool.execute.before"](input1, output1)
      ).rejects.toThrow();

      const input2 = { tool: "read" };
      const output2 = { args: { filePath: "secrets.json#section" } };
      await expect(
        plugin["tool.execute.before"](input2, output2)
      ).rejects.toThrow();
    });

    it("should block reading certificate and key files", async () => {
      const inputs = [
        { tool: "read", args: { filePath: "certificate.pem" } },
        { tool: "read", args: { filePath: "private.key" } },
        { tool: "read", args: { filePath: "server.crt" } },
        { tool: "read", args: { filePath: "keystore.jks" } },
        { tool: "read", args: { filePath: "config/cert.p12" } },
      ];

      for (const input of inputs) {
        await expect(
          plugin["tool.execute.before"]({ tool: input.tool }, { args: input.args })
        ).rejects.toThrow(
          "`Reading secret files is blocked to prevent exposure of sensitive data including API keys, credentials, and configuration.`"
        );
      }
    });

    it("should block reading authentication and token files", async () => {
      const inputs = [
        { tool: "read", args: { filePath: "auth.json" } },
        { tool: "read", args: { filePath: "token.txt" } },
        { tool: "read", args: { filePath: "passwords.yml" } },
        { tool: "read", args: { filePath: ".npmrc" } },
        { tool: "read", args: { filePath: ".git-credentials" } },
        { tool: "read", args: { filePath: ".vault-token" } },
      ];

      for (const input of inputs) {
        await expect(
          plugin["tool.execute.before"]({ tool: input.tool }, { args: input.args })
        ).rejects.toThrow(
          "`Reading secret files is blocked to prevent exposure of sensitive data including API keys, credentials, and configuration.`"
        );
      }
    });

    it("should block reading config files that may contain secrets", async () => {
      const inputs = [
        { tool: "read", args: { filePath: "config.json" } },
        { tool: "read", args: { filePath: "settings.yml" } },
        { tool: "read", args: { filePath: ".kube/config" } },
        { tool: "read", args: { filePath: ".docker/config.json" } },
        { tool: "read", args: { filePath: ".terraformrc" } },
      ];

      for (const input of inputs) {
        await expect(
          plugin["tool.execute.before"]({ tool: input.tool }, { args: input.args })
        ).rejects.toThrow(
          "`Reading secret files is blocked to prevent exposure of sensitive data including API keys, credentials, and configuration.`"
        );
      }
    });
  });

  describe("checkTypeScriptAnyType", () => {
    let plugin: any;
    let mockApp: any;
    let mockClient: any;
    let mock$: any;

    beforeEach(async () => {
      mockApp = {};
      mockClient = {};
      mock$ = {};
      plugin = await CommandBlocker({
        app: mockApp,
        client: mockClient,
        $: mock$,
      });
    });

    it("should allow any type annotations (temporarily disabled)", async () => {
      const input1 = { tool: "edit" };
      const output1 = {
        args: { filePath: "test.ts", newString: "const x: any = 5;" },
      };
      await expect(async () => {
        await plugin["tool.execute.before"](input1, output1);
      }).not.toThrow();

      const input2 = { tool: "edit" };
      const output2 = {
        args: { filePath: "test.ts", newString: "function f(param: any) {}" },
      };
      await expect(async () => {
        await plugin["tool.execute.before"](input2, output2);
      }).not.toThrow();

      const input3 = { tool: "edit" };
      const output3 = {
        args: { filePath: "test.ts", newString: "const arr: any[] = [];" },
      };
      await expect(async () => {
        await plugin["tool.execute.before"](input3, output3);
      }).not.toThrow();

      const input4 = { tool: "edit" };
      const output4 = {
        args: {
          filePath: "test.ts",
          newString: "const obj: Record<string, any> = {};",
        },
      };
      await expect(async () => {
        await plugin["tool.execute.before"](input4, output4);
      }).not.toThrow();

      const input5 = { tool: "edit" };
      const output5 = {
        args: { filePath: "test.ts", newString: "const x = value as any;" },
      };
      await expect(async () => {
        await plugin["tool.execute.before"](input5, output5);
      }).not.toThrow();
    });

    it("should allow proper type annotations", async () => {
      const input1 = { tool: "edit" };
      const output1 = {
        args: { filePath: "test.ts", newString: 'const x: string = "hello";' },
      };
      await expect(async () => {
        await plugin["tool.execute.before"](input1, output1);
      }).not.toThrow();

      const input2 = { tool: "edit" };
      const output2 = {
        args: { filePath: "test.ts", newString: "const x: number = 42;" },
      };
      await expect(async () => {
        await plugin["tool.execute.before"](input2, output2);
      }).not.toThrow();
    });

    it("should only check TypeScript files", async () => {
      const input1 = { tool: "edit" };
      const output1 = {
        args: { filePath: "test.js", newString: "const x: any = 5;" },
      };
      await expect(async () => {
        await plugin["tool.execute.before"](input1, output1);
      }).not.toThrow();

      const input2 = { tool: "edit" };
      const output2 = {
        args: { filePath: "test.txt", newString: "const x: any = 5;" },
      };
      await expect(async () => {
        await plugin["tool.execute.before"](input2, output2);
      }).not.toThrow();
    });

    it("should handle empty inputs", async () => {
      const input1 = { tool: "edit" };
      const output1 = { args: { filePath: "", newString: "content" } };
      await expect(async () => {
        await plugin["tool.execute.before"](input1, output1);
      }).not.toThrow();

      const input2 = { tool: "edit" };
      const output2 = { args: { filePath: "test.ts", newString: "" } };
      await expect(async () => {
        await plugin["tool.execute.before"](input2, output2);
      }).not.toThrow();
    });
  });

  describe("CommandBlocker Plugin", () => {
    let mockApp;
    let mockClient;
    let mock$;

    beforeEach(() => {
      mockApp = {};
      mockClient = {};
      mock$ = {};
    });

    it("should return plugin with tool.execute.before hook", async () => {
      const plugin = await CommandBlocker({
        app: mockApp,
        client: mockClient,
        $: mock$,
      });
      expect(Object.keys(plugin)).toContain("tool.execute.before");
      const hook = (plugin as PluginHook)["tool.execute.before"];
      expect(typeof hook).toBe("function");
    });

    it("should check file edits for read-only files", async () => {
      const plugin = await CommandBlocker({
        app: mockApp,
        client: mockClient,
        $: mock$,
      });
      const input = { tool: "edit" };
      const output = { args: { filePath: "package-lock.json" } };

      const hook = (plugin as PluginHook)["tool.execute.before"];
      await expect(hook(input, output)).rejects.toThrow(
        "`package-lock.json` editing is blocked"
      );
    });

    it("should allow file content with TypeScript any types (temporarily disabled)", async () => {
      const plugin = await CommandBlocker({
        app: mockApp,
        client: mockClient,
        $: mock$,
      });
      const input = { tool: "write" };
      const output = {
        args: { filePath: "test.ts", content: "const x: any = 5;" },
      };

      await expect(async () => {
        await plugin["tool.execute.before"](input, output);
      }).not.toThrow();
    });

    it("should check bash commands", async () => {
      const plugin = await CommandBlocker({
        app: mockApp,
        client: mockClient,
        $: mock$,
      });
      const input = { tool: "bash" };
      const output = { args: { command: "node --version" } };

      await expect(
        plugin["tool.execute.before"](input, output)
      ).rejects.toThrow("`node` is blocked");
    });

    it("should allow valid operations", async () => {
      const plugin = await CommandBlocker({
        app: mockApp,
        client: mockClient,
        $: mock$,
      });
      const input = { tool: "edit" };
      const output = {
        args: {
          filePath: "src/main.ts",
          newString: 'const x: string = "hello";',
        },
      };

      const hook = (plugin as PluginHook)["tool.execute.before"];
      await expect(async () => {
        await hook(input, output);
      }).not.toThrow();
    });

    // Integration tests for escape methods
    it("should block bash commands with piping", async () => {
      const plugin = await CommandBlocker({
        app: mockApp,
        client: mockClient,
        $: mock$,
      });
      const input = { tool: "bash" };
      const output = { args: { command: 'echo "node --version" | bash' } };

      const hook = (plugin as PluginHook)["tool.execute.before"];
      await expect(hook(input, output)).rejects.toThrow("`node` is blocked");
    });

    it("should block bash commands with command substitution", async () => {
      const plugin = await CommandBlocker({
        app: mockApp,
        client: mockClient,
        $: mock$,
      });
      const input = { tool: "bash" };
      const output = { args: { command: "echo $(npm install)" } };

      const hook = (plugin as PluginHook)["tool.execute.before"];
      await expect(hook(input, output)).rejects.toThrow("`npm` is blocked");
    });

    it("should block bash commands with semicolons", async () => {
      const plugin = await CommandBlocker({
        app: mockApp,
        client: mockClient,
        $: mock$,
      });
      const input = { tool: "bash" };
      const output = { args: { command: "ls; pip install requests" } };

      const hook = (plugin as PluginHook)["tool.execute.before"];
      await expect(hook(input, output)).rejects.toThrow("`pip` is blocked");
    });

    it("should block bash commands with && operators", async () => {
      const plugin = await CommandBlocker({
        app: mockApp,
        client: mockClient,
        $: mock$,
      });
      const input = { tool: "bash" };
      const output = { args: { command: 'echo "test" && python script.py' } };

      const hook = (plugin as PluginHook)["tool.execute.before"];
      await expect(hook(input, output)).rejects.toThrow("`python` is blocked");
    });

    it("should block bash commands with background execution", async () => {
      const plugin = await CommandBlocker({
        app: mockApp,
        client: mockClient,
        $: mock$,
      });
      const input = { tool: "bash" };
      const output = { args: { command: "node --version &" } };

      const hook = (plugin as PluginHook)["tool.execute.before"];
      await expect(hook(input, output)).rejects.toThrow("`node` is blocked");
    });

    it("should block bash commands with redirection", async () => {
      const plugin = await CommandBlocker({
        app: mockApp,
        client: mockClient,
        $: mock$,
      });
      const input = { tool: "bash" };
      const output = { args: { command: "npm install > /dev/null" } };

      const hook = (plugin as PluginHook)["tool.execute.before"];
      await expect(hook(input, output)).rejects.toThrow("`npm` is blocked");
    });

    it("should block bash commands with eval", async () => {
      const plugin = await CommandBlocker({
        app: mockApp,
        client: mockClient,
        $: mock$,
      });
      const input = { tool: "bash" };
      const output = { args: { command: 'eval "pip install requests"' } };

      const hook = (plugin as PluginHook)["tool.execute.before"];
      await expect(hook(input, output)).rejects.toThrow("`pip` is blocked");
    });

    it("should block bash commands with exec", async () => {
      const plugin = await CommandBlocker({
        app: mockApp,
        client: mockClient,
        $: mock$,
      });
      const input = { tool: "bash" };
      const output = { args: { command: "exec git add ." } };

      const hook = (plugin as PluginHook)["tool.execute.before"];
      await expect(hook(input, output)).rejects.toThrow(
        "`git` write operations are blocked to prevent agents from managing version control. Only read-only commands are allowed: `git status`, `git diff`, `git show`, `git log`, `git rev-parse`."
      );
    });

    it("should allow safe bash commands with pipes", async () => {
      const plugin = await CommandBlocker({
        app: mockApp,
        client: mockClient,
        $: mock$,
      });
      const input = { tool: "bash" };
      const output = { args: { command: "ls -la | grep test" } };

      const hook = (plugin as PluginHook)["tool.execute.before"];
      await expect(async () => {
        await hook(input, output);
      }).not.toThrow();
    });

    it("should allow safe bash commands with command substitution", async () => {
      const plugin = await CommandBlocker({
        app: mockApp,
        client: mockClient,
        $: mock$,
      });
      const input = { tool: "bash" };
      const output = { args: { command: "echo $(date)" } };

      const hook = (plugin as PluginHook)["tool.execute.before"];
      await expect(async () => {
        await hook(input, output);
      }).not.toThrow();
    });

    it("should block any shell commands that reference secret files", async () => {
      const plugin = await CommandBlocker({
        app: mockApp,
        client: mockClient,
        $: mock$,
      });

      const secretFileCommands = [
        { tool: "bash", args: { command: "cat .envrc" } },
        { tool: "bash", args: { command: "less secrets.json" } },
        { tool: "bash", args: { command: "head .ssh/id_rsa" } },
        { tool: "bash", args: { command: "tail .aws/credentials" } },
        { tool: "bash", args: { command: "grep password config.json" } },
        { tool: "bash", args: { command: "vi .npmrc" } },
        { tool: "bash", args: { command: "vim .git-credentials" } },
        { tool: "bash", args: { command: "nano .vault-token" } },
        { tool: "bash", args: { command: "emacs .kube/config" } },
        { tool: "bash", args: { command: "view certificate.pem" } },
        { tool: "bash", args: { command: "hexdump private.key" } },
        // Test non-file-reading commands that reference secret files
        { tool: "bash", args: { command: "cp .envrc backup.env" } },
        { tool: "bash", args: { command: "mv secrets.json secrets.bak" } },
        { tool: "bash", args: { command: "rm .ssh/id_rsa" } },
        { tool: "bash", args: { command: "chmod 600 .aws/credentials" } },
        { tool: "bash", args: { command: "chown user .npmrc" } },
        { tool: "bash", args: { command: "ls -la .git-credentials" } },
        { tool: "bash", args: { command: "touch .vault-token" } },
      ];

      for (const input of secretFileCommands) {
        await expect(
          plugin["tool.execute.before"](input, { args: input.args })
        ).rejects.toThrow(
          "`Reading secret files is blocked to prevent exposure of sensitive data including API keys, credentials, and configuration.`"
        );
      }
    });

    it("should block shell commands with secret files in complex structures", async () => {
      const plugin = await CommandBlocker({
        app: mockApp,
        client: mockClient,
        $: mock$,
      });

      const complexCommands = [
        { tool: "bash", args: { command: 'cat $(echo ".envrc")' } },
        { tool: "bash", args: { command: 'less `echo secrets.json`' } },
        { tool: "bash", args: { command: 'head ".ssh/id_rsa"' } },
        { tool: "bash", args: { command: "grep token $HOME/.vault-token" } },
        { tool: "bash", args: { command: 'vi ".kube/config"' } },
      ];

      for (const input of complexCommands) {
        await expect(
          plugin["tool.execute.before"](input, { args: input.args })
        ).rejects.toThrow(
          "`Reading secret files is blocked to prevent exposure of sensitive data including API keys, credentials, and configuration.`"
        );
      }
    });

    it("should allow shell commands that don't access secret files", async () => {
      const plugin = await CommandBlocker({
        app: mockApp,
        client: mockClient,
        $: mock$,
      });

      const safeCommands = [
        { tool: "bash", args: { command: "cat package.json" } },
        { tool: "bash", args: { command: "less README.md" } },
        { tool: "bash", args: { command: "head src/main.ts" } },
        { tool: "bash", args: { command: "tail .gitignore" } },
        { tool: "bash", args: { command: "grep function src/" } },
        { tool: "bash", args: { command: "vi tsconfig.json" } },
        { tool: "bash", args: { command: "ls -la" } },
        { tool: "bash", args: { command: "pwd" } },
        { tool: "bash", args: { command: "echo hello" } },
        { tool: "bash", args: { command: "mkdir .kube" } }, // Directory name, not a secret file
      ];

      for (const input of safeCommands) {
        await expect(async () => {
          await plugin["tool.execute.before"](input, { args: input.args });
        }).not.toThrow();
      }
    });

    it("should handle shell commands with flags correctly", async () => {
      const plugin = await CommandBlocker({
        app: mockApp,
        client: mockClient,
        $: mock$,
      });

      // Should block even with flags
      const blockedCommand = { tool: "bash", args: { command: "cat -n .envrc" } };
      await expect(
        plugin["tool.execute.before"](blockedCommand, { args: blockedCommand.args })
      ).rejects.toThrow();

      // Should allow safe commands with flags
      const safeCommand = { tool: "bash", args: { command: "cat -n package.json" } };
      await expect(async () => {
        await plugin["tool.execute.before"](safeCommand, { args: safeCommand.args });
      }).not.toThrow();
    });

    it("should allow safe bash commands with semicolons", async () => {
      const plugin = await CommandBlocker({
        app: mockApp,
        client: mockClient,
        $: mock$,
      });
      const input = { tool: "bash" };
      const output = { args: { command: "ls; pwd" } };

      const hook = (plugin as PluginHook)["tool.execute.before"];
      await expect(hook(input, output)).resolves.toBeUndefined();
    });
  });
});
