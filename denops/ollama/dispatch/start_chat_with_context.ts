import { Denops } from "https://deno.land/x/denops_std@v5.2.0/mod.ts";
import {
  ensure,
  is,
  maybe,
  ObjectOf as O,
} from "https://deno.land/x/unknownutil@v3.11.0/mod.ts";
import {
  generateChatCompletion,
  GenerateChatCompletionResponse,
} from "../api.ts";
import { Opener } from "./types.ts";
import { getLogger } from "https://deno.land/std@0.210.0/log/mod.ts";
import * as fn from "https://deno.land/x/denops_std@v5.2.0/function/mod.ts";
import * as batch from "https://deno.land/x/denops_std@v5.2.0/batch/batch.ts";
import * as option from "https://deno.land/x/denops_std@v5.2.0/option/mod.ts";
import * as datetime from "https://deno.land/std@0.210.0/datetime/mod.ts";
import * as helper from "https://deno.land/x/denops_std@v5.2.0/helper/mod.ts";
import * as lambda from "https://deno.land/x/denops_std@v5.2.0/lambda/mod.ts";

const chatContextFields = {
  selection: is.OptionalOf(is.Boolean),
  currentBuffer: is.OptionalOf(is.Boolean),
  buffers: is.OptionalOf(is.ArrayOf(is.OneOf([
    is.Number,
    is.ObjectOf({
      bufnr: is.Number,
    }),
  ]))),
  files: is.OptionalOf(is.ArrayOf(is.String)),
};

export type ChatContext = O<typeof chatContextFields>;
export const isChatContext = is.ObjectOf(chatContextFields);

export async function start_chat_with_context(
  denops: Denops,
  signal: AbortSignal,
  model: string,
  opener?: Opener,
  context?: ChatContext,
) {
  const now = datetime.format(new Date(), "yyyy-MM-ddTHH-mm-ss.SSS");
  const bufname = `ollama://chat/${now}`;
  const bufnr = await fn.bufadd(denops, bufname);

  await batch.batch(denops, async () => {
    await option.filetype.setBuffer(
      denops,
      bufnr,
      "ollama.chat",
    );
    await option.buftype.setBuffer(denops, bufnr, "prompt");
    await option.buflisted.setBuffer(denops, bufnr, true);
    await option.swapfile.setBuffer(denops, bufnr, false);
    await fn.bufload(denops, bufnr);
    await fn.setbufline(denops, bufnr, 1, [
      "Enter the name of the completion to generate: ",
    ]);
    await fn.prompt_setprompt(denops, bufnr, ">> ");
    await denops.cmd(
      "call prompt_setcallback(bufnr, function('ollama#internal#callback_helper', [denops_name, lambda_id]))",
      {
        bufnr,
        denops_name: denops.name,
        lambda_id: lambda.register(
          denops,
          async (uPrompt) => {
            const prompt = ensure(uPrompt, is.String);
            await promptCallback(denops, signal, bufnr, model, prompt);
          },
        ),
      },
    );
    await helper.execute(denops, `${opener ?? "tabnew"} ${bufname}`);
    await helper.execute(denops, "setlocal wrap");
    await helper.execute(denops, "startinsert");
  });
}

async function promptCallback(
  denops: Denops,
  signal: AbortSignal,
  bufnr: number,
  model: string,
  prompt: string,
) {
  const context = maybe(
    await fn.getbufvar(
      denops,
      bufnr,
      "ollama_generate_completion_context",
    ),
    is.ArrayOf(is.Number),
  );
  getLogger("denops-ollama-verbose").debug(`reserved context: ${context}`);
  getLogger("denops-ollama-verbose").debug(`prompt: ${prompt}`);

  if (prompt === "exit") {
    await helper.execute(denops, `bunload! ${bufnr}`);
    return;
  }

  // prepare writer to set response to buffer
  let continuation = false;
  const writer = new WritableStream<GenerateChatCompletionResponse>({
    write: async (item) => {
      const newLines = item.response.split(/\r?\n/);
      const info = await fn.getbufinfo(denops, bufnr);
      const lastLineAt = info[0].linecount - 1;
      if (continuation) {
        const lastLine = await fn.getline(denops, lastLineAt);
        await fn.setline(denops, lastLineAt, lastLine + newLines[0]);
      } else {
        getLogger("denops-ollama-verbose").debug(`content: "${newLines[0]}"`);
        getLogger("denops-ollama-verbose").debug(`lastLineAt: ${lastLineAt}`);
        await fn.append(denops, lastLineAt, newLines[0]);
        continuation = true;
      }
      if (newLines.length > 0) {
        await fn.append(denops, lastLineAt, newLines.slice(1));
      }
      if (item.context) {
        await fn.setbufvar(
          denops,
          bufnr,
          "ollama_generate_completion_context",
          item.context,
        );
      }
    },
  });

  try {
    // call generateCompletion
    const result = await generateChatCompletion({ model, prompt, context }, {
      init: { signal },
    });
    if (!result.body) {
      return;
    }
    await result.body.pipeTo(writer);
  } catch (err) {
    getLogger("denops-ollama").error(err);
  } finally {
    await fn.setbufvar(denops, bufnr, "&modified", 0);
  }
}