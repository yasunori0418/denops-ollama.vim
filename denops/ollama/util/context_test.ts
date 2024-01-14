import {
  assert,
  assertEquals,
  assertFalse,
} from "https://deno.land/std@0.210.0/assert/mod.ts";
import { test } from "https://deno.land/x/denops_test@v1.6.1/mod.ts";
import * as fn from "https://deno.land/x/denops_std@v5.2.0/function/mod.ts";
import * as testtarget from "./context.ts";

test({
  mode: "all",
  name: "isBufferInfo must accept number",
  fn: () => {
    assert(testtarget.isBufferInfo(1));
  },
});

test({
  mode: "all",
  name: "isBufferInfo must accept string (bufname)",
  fn: () => {
    assert(testtarget.isBufferInfo("%"));
  },
});

test({
  mode: "all",
  name: "isBufferInfo must accept getbufinfo() result",
  fn: async (denops) => {
    const bufinfo = await fn.getbufinfo(denops, "");
    assert(testtarget.isBufferInfo(bufinfo[0]));
  },
});

test({
  mode: "all",
  name: "isBufferInfo must NOT accept name only object",
  fn: () => {
    assertFalse(testtarget.isBufferInfo({ name: "foo" }));
  },
});

test({
  mode: "all",
  name: "isBufferInfo must NOT accept bufnr only object",
  fn: () => {
    assertFalse(testtarget.isBufferInfo({ bufnr: 1 }));
  },
});

test({
  mode: "all",
  name: "getCurrentBuffer should get current buffer content and the name",
  fn: async (denops) => {
    denops.cmd("file file-1");
    await fn.setline(denops, 1, ["foo", "bar", "baz"]);

    const buf = await testtarget.getCurrentBuffer(denops);
    assertEquals(buf.name, "file-1");
    assertEquals(buf.bufnr, 1);
    assertEquals(buf.content, "foo\nbar\nbaz");
  },
});

test({
  mode: "all",
  name:
    "getCurrentBuffer should get current buffer content and the name without another buffer",
  fn: async (denops) => {
    denops.cmd("file file-1");
    await fn.setbufline(denops, 1, 1, ["foo-1", "bar-1", "baz-1"]);
    denops.cmd("new file-2");
    await fn.setbufline(denops, 2, 1, ["foo-2", "bar-2", "baz-2"]);

    const buf = await testtarget.getCurrentBuffer(denops);
    assertEquals(buf.name, "file-2");
    assertEquals(buf.bufnr, 2);
    assertEquals(buf.content, "foo-2\nbar-2\nbaz-2");
  },
});

test({
  mode: "all",
  name: "getCurrentBuffer should get buffers and the name",
  fn: async (denops) => {
    denops.cmd("file file-1");
    await fn.setbufline(denops, 1, 1, ["foo-1", "bar-1", "baz-1"]);
    denops.cmd("new file-2");
    await fn.setbufline(denops, 2, 1, ["foo-2", "bar-2", "baz-2"]);
    denops.cmd("new file-3");
    await fn.setbufline(denops, 3, 1, ["foo-3", "bar-3", "baz-3"]);

    const buf1 = await testtarget.getBuffer(denops, 1);
    assertEquals(buf1.name, "file-1");
    assertEquals(buf1.bufnr, 1);
    assertEquals(buf1.content, "foo-1\nbar-1\nbaz-1");

    const buf2 = await testtarget.getBuffer(denops, "file-2");
    assertEquals(buf2.name, "file-2");
    assertEquals(buf2.bufnr, 2);
    assertEquals(buf2.content, "foo-2\nbar-2\nbaz-2");

    const buf3 = await testtarget.getBuffer(denops, {
      name: "spec-3",
      bufnr: 3,
    });
    assertEquals(buf3.name, "spec-3");
    assertEquals(buf3.bufnr, 3);
    assertEquals(buf3.content, "foo-3\nbar-3\nbaz-3");
  },
});
