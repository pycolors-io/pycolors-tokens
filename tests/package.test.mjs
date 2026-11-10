import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const directory = fileURLToPath(new URL("../", import.meta.url));

test("the actual tarball preserves CSS and supports ESM + strict TS consumers outside the repository", async () => {
  const temporary = await mkdtemp(
    path.join(os.tmpdir(), "pycolors-native-package-"),
  );
  try {
    const userConfig = path.join(temporary, "npmrc");
    const globalConfig = path.join(temporary, "global-npmrc");
    await writeFile(userConfig, "");
    await writeFile(globalConfig, "");
    const environment = {
      PATH: process.env.PATH,
      npm_config_userconfig: userConfig,
      npm_config_globalconfig: globalConfig,
      npm_config_cache: path.join(temporary, "npm-cache"),
      npm_config_registry: "https://registry.npmjs.org/",
      npm_config_audit: "false",
      npm_config_fund: "false",
    };
    const packed = JSON.parse(
      execFileSync(
        "npm",
        [
          "pack",
          "--offline",
          "--ignore-scripts",
          "--json",
          "--pack-destination",
          temporary,
        ],
        { cwd: directory, env: environment, encoding: "utf8", timeout: 30000 },
      ),
    );
    assert.equal(packed.length, 1);
    const paths = packed[0].files.map((file) => file.path);
    for (const name of [
      "tokens.css",
      "native.js",
      "native.d.ts",
      "native.provenance.json",
      "appearance.snapshot.json",
      "LICENSE",
      "README.md",
      "package.json",
    ])
      assert(paths.includes(name), `Missing ${name}`);
    assert(
      !paths.some((name) => /^(?:tests|scripts|node_modules)\//.test(name)),
    );
    const consumer = path.join(temporary, "consumer");
    const installed = path.join(
      consumer,
      "node_modules",
      "@pycolors",
      "tokens",
    );
    await mkdir(installed, { recursive: true });
    execFileSync(
      "tar",
      [
        "-xzf",
        path.join(temporary, packed[0].filename),
        "--strip-components",
        "1",
        "-C",
        installed,
      ],
      { timeout: 10000 },
    );
    const manifest = JSON.parse(
      await readFile(path.join(installed, "package.json"), "utf8"),
    );
    assert.equal(manifest.exports["./tokens.css"], "./tokens.css");
    assert.deepEqual(manifest.dependencies ?? {}, {});
    assert.deepEqual(
      await readFile(path.join(installed, "tokens.css")),
      await readFile(path.join(directory, "tokens.css")),
    );
    assert.match(
      await readFile(path.join(installed, "LICENSE"), "utf8"),
      /MIT License/,
    );
    await writeFile(
      path.join(consumer, "package.json"),
      '{"private":true,"type":"module"}\n',
    );
    await writeFile(
      path.join(consumer, "runtime.mjs"),
      `import assert from 'node:assert/strict';
import { nativePalettes, nativeColors, nativePaletteOptions, nativeRadiusPreferences, nativeTouchTarget } from '@pycolors/tokens/native';
assert.equal(nativePaletteOptions.length, 10);
assert.equal(nativePalettes.monochrome.dark.background, '#000000');
assert.equal(nativeTouchTarget, 48);
assert.equal(nativeRadiusPreferences.large, 24);
assert.equal(Object.keys(nativeColors.light).length, 32);
assert(import.meta.resolve('@pycolors/tokens/tokens.css').endsWith('/tokens.css'));
console.log('Independent token consumer PASS');\n`,
    );
    const output = execFileSync(
      process.execPath,
      [path.join(consumer, "runtime.mjs")],
      { cwd: consumer, env: environment, encoding: "utf8", timeout: 10000 },
    );
    assert.match(output, /Independent token consumer PASS/);
    await writeFile(
      path.join(consumer, "consumer.ts"),
      await readFile(path.join(directory, "tests/types/public-consumer.ts")),
    );
    await writeFile(
      path.join(consumer, "tsconfig.json"),
      JSON.stringify({
        compilerOptions: {
          target: "ES2022",
          module: "NodeNext",
          moduleResolution: "NodeNext",
          strict: true,
          noEmit: true,
          types: [],
          lib: ["ES2022"],
          skipLibCheck: false,
        },
        include: ["consumer.ts"],
      }),
    );
    const require = createRequire(import.meta.url);
    const compiler = path.join(
      path.dirname(require.resolve("typescript/package.json")),
      "bin/tsc",
    );
    execFileSync(
      process.execPath,
      [compiler, "-p", path.join(consumer, "tsconfig.json")],
      { cwd: consumer, env: environment, encoding: "utf8", timeout: 30000 },
    );
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});
