import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

// Next 16 の "use server" 制約をローカルで前置検出する。dev サーバが 500 を
// 返してから気づくのではなく、lint 時点で弾く。
// 対象は app/_actions/** ではなくディレクティブで判定する: ヘルパ用の
// errors.ts のように "use server" を付けないファイルは検査対象外にしたい。
const useServerProgram =
  "Program:has(ExpressionStatement[directive='use server'])";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
  {
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: `${useServerProgram} > ExportNamedDeclaration[declaration.type='ClassDeclaration']`,
          message:
            "'use server' files may only export async functions. Move classes (e.g. error classes) to a non-action module like app/_actions/errors.ts.",
        },
        {
          selector: `${useServerProgram} > ExportNamedDeclaration[declaration.type='FunctionDeclaration'][declaration.async=false]`,
          message:
            "'use server' files may only export async functions. Mark this function async, or move it to a non-action module.",
        },
        {
          selector: `${useServerProgram} > ExportNamedDeclaration[declaration.type='VariableDeclaration']`,
          message:
            "'use server' files may only export async function declarations. Use 'export async function ...' or move this binding to a non-action module.",
        },
        {
          selector: `${useServerProgram} > ExportNamedDeclaration[declaration.type='TSEnumDeclaration']`,
          message:
            "'use server' files may only export async functions. Enums must live in a non-action module.",
        },
        {
          selector: `${useServerProgram} > ExportDefaultDeclaration`,
          message:
            "'use server' files must use named async function exports, not default exports.",
        },
      ],
    },
  },
]);

export default eslintConfig;
