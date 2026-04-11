import { afterEach, describe, expect, it, vi } from "vitest";

describe("cerebras client", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
    delete process.env.CEREBRAS_API_KEY;
    delete process.env.CEREBRAS_API_KEY_2;
    delete process.env.CEREBRAS_MODEL;
  });

  it("rotates to a second key after a rate limit response", async () => {
    process.env.CEREBRAS_API_KEY = "key-1";
    process.env.CEREBRAS_API_KEY_2 = "key-2";
    process.env.CEREBRAS_MODEL = "llama3.1-8b";

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("too many requests", { status: 429, statusText: "Too Many Requests" }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            choices: [{ message: { content: "hello from cerebras" } }],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      );

    vi.stubGlobal("fetch", fetchMock);

    const { cerebrasChatCompletion } = await import("./cerebras");
    const result = await cerebrasChatCompletion({
      messages: [{ role: "user", content: "hi" }],
    });

    expect(result.text).toBe("hello from cerebras");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[1]?.headers?.Authorization).toBe("Bearer key-1");
    expect(fetchMock.mock.calls[1]?.[1]?.headers?.Authorization).toBe("Bearer key-2");
  });
});
