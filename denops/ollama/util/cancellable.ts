import { map } from "https://deno.land/x/denops_std@v5.3.0/mapping/mod.ts";
import * as lambda from "https://deno.land/x/denops_std@v5.3.0/lambda/mod.ts";
import { generateUniqueString } from "https://deno.land/x/denops_std@v5.3.0/util.ts";
import * as autocmd from "https://deno.land/x/denops_std@v5.3.0/autocmd/mod.ts";
import { Denops } from "https://deno.land/x/denops_std@v5.3.0/mod.ts";

export async function mapCancel(denops: Denops) {
  // See ../../../autoload/ollama/internal.vim
  await map(denops, "<C-c>", `ollama#internal#cancel()`, {
    expr: true,
    mode: ["n"],
  });
}

export async function canceller(denops: Denops, timeout?: number) {
  const abort = new AbortController();
  if (timeout) {
    setTimeout(() => abort.abort(), timeout);
  }
  const group = generateUniqueString();
  await autocmd.group(denops, group, (helper) => {
    helper.define(
      "User",
      "OllamaCancel",
      `call ollama#internal#notify_callback("${denops.name}", "${
        lambda.register(denops, () => {
          abort.abort("cancelled");
        })
      }")`,
      { once: true },
    );
  });
  return {
    signal: abort.signal,
    cancel: async () => {
      await autocmd.remove(denops, "User", "OllamaCancel", { group });
      abort.abort();
    },
  };
}
