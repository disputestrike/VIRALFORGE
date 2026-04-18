import fs from "node:fs/promises";
import path from "node:path";
import { ENV } from "../_core/env";

export type BargeInDecision = "CONTINUE" | "PIVOT";

type RuntimeOrt = {
  InferenceSession: {
    create(modelPath: string): Promise<unknown>;
  };
  Tensor: new (type: string, data: BigInt64Array, dims: number[]) => unknown;
};

type TokenizerConfig = {
  model?: {
    vocab?: Record<string, number>;
  };
};

export type BargeInPrediction = {
  decision: BargeInDecision;
  provider: "rules" | "onnx";
  elapsedMs: number;
  reason: string;
};

const CONTINUE_KEYWORDS = [
  "go on",
  "continue",
  "keep going",
  "you were saying",
  "carry on",
  "finish that",
  "okay go",
  "yeah go on",
  "yes go on",
];

const PIVOT_KEYWORDS = [
  "wait",
  "hold on",
  "stop",
  "actually",
  "forget that",
  "forget it",
  "no listen",
  "tell me about",
  "what about",
  "how about",
  "let me ask",
];

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

function simpleHashToken(token: string): number {
  let hash = 17;
  for (let i = 0; i < token.length; i++) {
    hash = (hash * 31 + token.charCodeAt(i)) >>> 0;
  }
  return 1000 + (hash % 30000);
}

function ruleDecision(aiWasSaying: string, userSaid: string): { decision: BargeInDecision; reason: string } {
  const user = normalize(userSaid);
  const ai = normalize(aiWasSaying);

  if (!user) return { decision: "CONTINUE", reason: "empty_user_utterance" };
  if (user.length < 3) return { decision: "CONTINUE", reason: "very_short" };
  if (CONTINUE_KEYWORDS.some((kw) => user.includes(kw))) {
    return { decision: "CONTINUE", reason: "continue_keyword" };
  }
  if (PIVOT_KEYWORDS.some((kw) => user.includes(kw))) {
    return { decision: "PIVOT", reason: "pivot_keyword" };
  }
  if (/\?$/.test(user)) {
    return { decision: "PIVOT", reason: "question" };
  }
  if (/^(yes|yeah|yep|okay|ok|sure|go ahead|keep going)$/i.test(user)) {
    return { decision: "CONTINUE", reason: "affirm_continue" };
  }
  if (/^(no|nah|nope)$/i.test(user)) {
    return { decision: "PIVOT", reason: "negative_pivot" };
  }
  if (/\b(price|pricing|cost|calendar|book|demo|solar|hvac|roofing|insurance|plumbing|dental|medical|legal|sms|crm|website|number)\b/i.test(user)) {
    return { decision: "PIVOT", reason: "fresh_business_topic" };
  }
  if (ai && user.length <= 18 && /\b(that|this|it)\b/i.test(user)) {
    return { decision: "CONTINUE", reason: "short_reference_to_prior_topic" };
  }
  return { decision: "PIVOT", reason: "default_pivot" };
}

export class BargeInClassifier {
  private ortPromise: Promise<RuntimeOrt | null> | null = null;
  private sessionPromise: Promise<unknown | null> | null = null;
  private tokenizerPromise: Promise<TokenizerConfig | null> | null = null;

  private async loadOrt(): Promise<RuntimeOrt | null> {
    if (!this.ortPromise) {
      this.ortPromise = import("onnxruntime-node")
        .then((mod) => mod as unknown as RuntimeOrt)
        .catch(() => null);
    }
    return this.ortPromise;
  }

  private async loadSession(): Promise<unknown | null> {
    if (!ENV.voiceBargeInClassifierEnabled) return null;
    if (!this.sessionPromise) {
      this.sessionPromise = (async () => {
        try {
          const modelPath = path.resolve(process.cwd(), ENV.voiceBargeInClassifierModelPath);
          await fs.access(modelPath);
          const ort = await this.loadOrt();
          if (!ort) return null;
          return await ort.InferenceSession.create(modelPath);
        } catch {
          return null;
        }
      })();
    }
    return this.sessionPromise;
  }

  private async loadTokenizer(): Promise<TokenizerConfig | null> {
    if (!this.tokenizerPromise) {
      this.tokenizerPromise = (async () => {
        try {
          const tokenizerPath = path.resolve(
            process.cwd(),
            ENV.voiceBargeInClassifierTokenizerPath,
            "tokenizer.json"
          );
          const raw = await fs.readFile(tokenizerPath, "utf8");
          return JSON.parse(raw) as TokenizerConfig;
        } catch {
          return null;
        }
      })();
    }
    return this.tokenizerPromise;
  }

  private async encode(aiWasSaying: string, userSaid: string): Promise<{ ids: number[]; mask: number[] }> {
    const tokenizer = await this.loadTokenizer();
    const vocab = tokenizer?.model?.vocab ?? {};
    const cls = vocab["[CLS]"] ?? 101;
    const sep = vocab["[SEP]"] ?? 102;
    const pad = vocab["[PAD]"] ?? 0;
    const unk = vocab["[UNK]"] ?? 100;
    const rawTokens = `${aiWasSaying} [SEP] ${userSaid}`
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean)
      .map((token) => vocab[token] ?? simpleHashToken(token) ?? unk);
    const maxLen = 128;
    const ids = [cls, ...rawTokens, sep].slice(0, maxLen);
    while (ids.length < maxLen) ids.push(pad);
    const mask = ids.map((token) => (token === pad ? 0 : 1));
    return { ids, mask };
  }

  async predict(aiWasSaying: string, userSaid: string): Promise<BargeInPrediction> {
    const start = Date.now();
    const rules = ruleDecision(aiWasSaying, userSaid);
    const session = await this.loadSession();
    const ort = await this.loadOrt();
    if (!session || !ort) {
      return {
        decision: rules.decision,
        provider: "rules",
        elapsedMs: Date.now() - start,
        reason: rules.reason,
      };
    }

    try {
      const encoded = await this.encode(aiWasSaying, userSaid);
      const inputIds = new ort.Tensor(
        "int64",
        BigInt64Array.from(encoded.ids.map((id) => BigInt(id))),
        [1, encoded.ids.length]
      );
      const attentionMask = new ort.Tensor(
        "int64",
        BigInt64Array.from(encoded.mask.map((id) => BigInt(id))),
        [1, encoded.mask.length]
      );
      const outputs = await (session as {
        run(feeds: Record<string, unknown>): Promise<Record<string, { data: Float32Array }>>;
      }).run({
        input_ids: inputIds,
        attention_mask: attentionMask,
      });
      const logits = outputs.logits?.data;
      if (!logits || logits.length < 2) {
        return {
          decision: rules.decision,
          provider: "rules",
          elapsedMs: Date.now() - start,
          reason: `${rules.reason}:missing_logits`,
        };
      }
      return {
        decision: logits[0] > logits[1] ? "CONTINUE" : "PIVOT",
        provider: "onnx",
        elapsedMs: Date.now() - start,
        reason: "onnx_logits",
      };
    } catch {
      return {
        decision: rules.decision,
        provider: "rules",
        elapsedMs: Date.now() - start,
        reason: `${rules.reason}:onnx_fallback`,
      };
    }
  }
}
