import type { ConnectedAccount, FinancialProfile, Transaction } from "../types";
import { formatCurrency, formatDate, titleCase } from "../finance/format";

export type ScamRiskLevel = "low" | "medium" | "high";
export type ScamSeverity = "low" | "medium" | "high";
export type ScamFindingCategory =
  | "urgency"
  | "sensitive"
  | "payment"
  | "impersonation"
  | "pressure"
  | "isolation"
  | "contradiction";

export interface ScamFinding {
  id: string;
  category: ScamFindingCategory;
  label: string;
  severity: ScamSeverity;
  quotes: string[];
  explanation: string;
  weight: number;
}

export type FinancialCheckStatus = "matched" | "not-found" | "inconsistent" | "unverifiable";

export interface FinancialCheck {
  id: string;
  kind: "transaction" | "balance" | "account";
  claim: string;
  amount: number;
  status: FinancialCheckStatus;
  detail: string;
  evidence?: {
    merchant: string;
    date: string;
    amount: number;
    account: string;
    category: string;
  }[];
}

export interface ScamAnalysis {
  risk: ScamRiskLevel;
  score: number;
  headline: string;
  summary: string;
  findings: ScamFinding[];
  financialChecks: FinancialCheck[];
  nextSteps: string[];
  safeSignals: string[];
  stats: {
    critical: number;
    claims: number;
    matched: number;
    words: number;
  };
}

interface FindingRule {
  id: string;
  category: ScamFindingCategory;
  label: string;
  severity: ScamSeverity;
  weight: number;
  explanation: string;
  patterns: RegExp[];
  needsRequest?: boolean;
  skipSafeInstructions?: boolean;
}

const RULES: FindingRule[] = [
  {
    id: "verification_code",
    category: "sensitive",
    label: "Verification code request",
    severity: "high",
    weight: 34,
    needsRequest: true,
    explanation:
      "A one-time code is effectively a key to your account. Your bank, a government agency and PoyoVault will never ask you to read one back or forward it.",
    patterns: [
      /\b(?:verification|security|one[- ]time|confirmation|authentication)\s+(?:code|passcode)\b/,
      /\b(?:otp|passcode)\b/,
      /\b(?:four|five|six|seven|eight|nine|\d+)[- ]digit\b[^.!?]{0,25}\bcode\b/,
      /\b(?:give|read|tell|provide|share|send|forward|text)\b[^.!?]{0,35}\bcode\b/,
      /\bread (?:it|the code) (?:back|to me)\b/,
    ],
  },
  {
    id: "password_request",
    category: "sensitive",
    label: "Password request",
    severity: "high",
    weight: 30,
    needsRequest: true,
    explanation:
      "No legitimate representative needs your password. Someone who has it can sign in as you and change the account.",
    patterns: [/\bpassword\b/, /\bpassphrase\b/, /\blogin (?:credentials|details)\b/],
  },
  {
    id: "identity_request",
    category: "sensitive",
    label: "Sensitive identity request",
    severity: "high",
    weight: 28,
    needsRequest: true,
    explanation:
      "A Social Security number, PIN, CVV or full card number is not needed to 'verify' an unexpected call. Requests for these are a serious warning sign.",
    patterns: [
      /\bsocial security (?:number|card)\b/,
      /\bssn\b/,
      /\bpin\b/,
      /\bcard numbers?\b/,
      /\bcvv\b/,
      /\bsecurity code\b/,
      /\b(?:full )?account numbers?\b/,
    ],
  },
  {
    id: "remote_access",
    category: "sensitive",
    label: "Remote device access",
    severity: "high",
    weight: 34,
    explanation:
      "Remote-access software lets the caller see your screen and control your device, including your banking apps.",
    patterns: [
      /\banydesk\b/,
      /\bteamviewer\b/,
      /\bremote (?:access|desktop|session)\b/,
      /\bscreen shar/,
      /\bdownload (?:the |an? )?(?:app|software|tool)\b/,
      /\binstall (?:the |an? )?(?:app|software|tool)\b/,
    ],
  },
  {
    id: "gift_card",
    category: "payment",
    label: "Gift card payment",
    severity: "high",
    weight: 34,
    explanation:
      "Gift cards are untraceable and almost never recoverable. No legitimate bank, court or government agency accepts them as payment.",
    patterns: [
      /\bgift cards?\b/,
      /\b(?:itunes|google play|apple|amazon|steam) (?:gift )?cards?\b/,
      /\bprepaid (?:card|debit card)s?\b/,
    ],
  },
  {
    id: "wire_crypto",
    category: "payment",
    label: "Wire or crypto transfer",
    severity: "high",
    weight: 26,
    explanation:
      "Wires and crypto transfers are difficult to reverse. Scammers prefer them because the money can disappear quickly.",
    patterns: [
      /\bwire (?:transfer|the money|funds)\b/,
      /\bwestern union\b/,
      /\bmoneygram\b/,
      /\bmoney order\b/,
      /\b(?:bitcoin|btc|ethereum|crypto(?:currency)?)\b/,
    ],
  },
  {
    id: "p2p",
    category: "payment",
    label: "Payment app transfer",
    severity: "medium",
    weight: 26,
    explanation:
      "Peer-to-peer transfers are usually instant and irreversible. A stranger asking for one is a major red flag.",
    patterns: [/\bzelle\b/, /\bvenmo\b/, /\bcash app\b/, /\bcashapp\b/, /\bpaypal\b/],
  },
  {
    id: "unfamiliar_account",
    category: "payment",
    label: "Unfamiliar 'safe' account",
    severity: "high",
    weight: 30,
    explanation:
      "Money moved to a 'safe', 'secure' or newly provided account is typically controlled by the scammer, not by you. Your bank already has secure ways to protect an account.",
    patterns: [
      /\bsafe (?:account|place)\b/,
      /\bsecure (?:account|place)\b/,
      /\bgovernment (?:account|lockbox)\b/,
      /\bfederal lockbox\b/,
      /\bnew (?:bank )?account\b/,
      /\bdifferent (?:bank )?account\b/,
      /\brouting number\b/,
      /\bbeneficiary\b/,
      /\bmove (?:the |your )?(?:money|funds|balance)\b/,
      /\bsend (?:the |your )?(?:money|funds)\b/,
      /\btransfer (?:the |your )?(?:money|funds|balance)\b/,
    ],
  },
  {
    id: "urgency",
    category: "urgency",
    label: "Urgency and time pressure",
    severity: "medium",
    weight: 16,
    explanation:
      "Urgency stops you from checking the story. A real institution can wait while you verify through an official channel.",
    patterns: [
      /\burgent(?:ly)?\b/,
      /\bimmediately\b/,
      /\bright (?:now|away)\b/,
      /\bwithin (?:the next )?\d+ (?:minutes?|hours?)\b/,
      /\btoday only\b/,
      /\bact now\b/,
      /\blast chance\b/,
      /\bfinal notice\b/,
      /\bbefore (?:it'?s|it is) too late\b/,
      /\bexpires? (?:today|soon|in)\b/,
    ],
  },
  {
    id: "threat",
    category: "pressure",
    label: "Threats or account pressure",
    severity: "high",
    weight: 28,
    explanation:
      "Threats of arrest, legal action or account closure are pressure tactics. Real agencies do not demand immediate payment by phone.",
    patterns: [
      /\barrest(?:ed)?\b/,
      /\bwarrant\b/,
      /\blawsuit\b/,
      /\blegal action\b/,
      /\bpolice\b/,
      /\bjail\b/,
      /\bprosecut/,
      /\bdeport/,
      /\bsuspend(?:ed)? (?:your )?(?:account|card|social security number)\b/,
      /\bfreeze (?:your )?(?:account|funds)\b/,
      /\bclose (?:your )?(?:account|card)\b/,
    ],
  },
  {
    id: "secrecy",
    category: "isolation",
    label: "Secrecy or isolation",
    severity: "medium",
    weight: 22,
    explanation:
      "Isolation and secrecy prevent you from getting a second opinion. That is a classic scam tactic, especially when combined with money or account access.",
    patterns: [
      /\bdon'?t tell\b/,
      /\bdo not tell\b/,
      /\bkeep (?:this|it) (?:secret|confidential|between us)\b/,
      /\bbetween (?:you and me|us)\b/,
      /\bdon'?t hang up\b/,
      /\bdo not hang up\b/,
      /\bstay on the (?:line|phone)\b/,
      /\bdo not disconnect\b/,
    ],
  },
  {
    id: "app_isolation",
    category: "isolation",
    label: "Pressure to avoid your bank app",
    severity: "high",
    weight: 30,
    explanation:
      "A legitimate bank will never tell you not to open its app or contact it. This instruction is designed to keep you from discovering the truth.",
    patterns: [
      /\bdon'?t (?:check|look at|open|close)\b[^.!?]{0,35}\b(?:app|account|online banking|window)\b/,
      /\bdo not (?:check|look at|open|close)\b[^.!?]{0,35}\b(?:app|account|online banking|window)\b/,
      /\bdon'?t (?:call|contact)\b[^.!?]{0,25}\b(?:bank|police)\b/,
      /\bdo not (?:call|contact)\b[^.!?]{0,25}\b(?:bank|police)\b/,
    ],
  },
  {
    id: "institution_claim",
    category: "impersonation",
    label: "Institution claim",
    severity: "low",
    weight: 10,
    skipSafeInstructions: true,
    explanation:
      "The caller claims to represent an institution, but caller ID and official-sounding names can be faked. PoyoVault cannot verify their identity.",
    patterns: [
      /\bfraud (?:department|team|prevention)\b/,
      /\bsecurity (?:department|team)\b/,
      /\birs\b/,
      /\binternal revenue\b/,
      /\bsocial security administration\b/,
      /\bmedicare\b/,
      /\bfederal (?:agent|bureau|government)\b/,
      /\bchase\b/,
      /\bamerican express\b/,
      /\bwells fargo\b/,
      /\bbank of america\b/,
      /\bcitibank\b/,
      /\bamazon (?:security|fraud)\b/,
      /\bmicrosoft (?:support|security)\b/,
      /\bapple support\b/,
    ],
  },
  {
    id: "reassurance",
    category: "impersonation",
    label: "Unsolicited reassurance",
    severity: "low",
    weight: 18,
    skipSafeInstructions: true,
    explanation:
      "Unsolicited reassurance such as 'this is not a scam' is a persuasion tactic, not evidence. Verify the caller independently.",
    patterns: [
      /\bthis is not a scam\b/,
      /\bi'?m (?:not a scammer|legitimate)\b/,
      /\byou can trust me\b/,
      /\bi promise\b/,
      /\bwe are (?:legitimate|the real)\b/,
    ],
  },
  {
    id: "unexpected_link",
    category: "sensitive",
    label: "Unexpected link or download",
    severity: "medium",
    weight: 22,
    explanation:
      "Unexpected links can lead to fake login pages or malware. Open the official app or type the address yourself instead.",
    patterns: [
      /\bclick (?:this|that|the) link\b/,
      /\b(?:link|website) (?:i|we) (?:sent|texted|emailed)\b/,
      /\bvisit (?:this|the) (?:site|website|link)\b/,
      /\bgo to (?:this|the) (?:site|website|link)\b/,
    ],
  },
];

const SAFE_INSTRUCTION =
  /\b(?:we|i|banks?|lenders?|no one|nobody)\b[^.!?]{0,60}\b(?:never|won'?t|will not|do not|don'?t|does not)\b[^.!?]{0,40}\b(?:ask|need|request|require)\b[^.!?]{0,60}\b(?:password|code|pin|card number|gift card|information)\b|\b(?:never|don'?t|do not)\s+(?:share|give|provide|send|tell)\b[^.!?]{0,50}\b(?:password|code|pin|card number|information)\b/i;

const REQUEST_CONTEXT =
  /\b(?:give|tell|read|provide|share|send|confirm|verify|need|require|enter|type|text|dictate|repeat|disclose|forward|what(?:'s| is| are))\b/i;

const AMOUNT_PATTERN = /\$\s*([\d,]+(?:\.\d{1,2})?)|(\b[\d,]+(?:\.\d{1,2})?)\s*(?:dollars|usd)\b/gi;

const BALANCE_CONTEXT =
  /\b(?:checking|savings|bank account|account balance|card balance|current balance|available balance|your balance)\b/;

const TRANSACTION_CONTEXT =
  /\b(?:charge|transaction|purchase|payment|withdraw(?:al)?|deposit|paid|spent|transfer)\b/;

function splitSentences(text: string) {
  // Protect decimal points so "$145.00" stays inside one sentence.
  const protectedText = text.replace(/\r/g, "").replace(/(\d)\.(\d)/g, "$1\u0000$2");
  return protectedText
    .split(/\n+/)
    .flatMap((paragraph) => paragraph.match(/[^.!?]+[.!?]*/g) ?? [])
    .map((sentence) => sentence.replace(/\u0000/g, ".").trim())
    .filter((sentence) => sentence.length > 1);
}

function shortQuote(sentence: string) {
  const clean = sentence.replace(/\s+/g, " ").trim();
  return clean.length > 240 ? `${clean.slice(0, 237)}…` : clean;
}

function isSafeInstruction(sentence: string) {
  if (!SAFE_INSTRUCTION.test(sentence)) return false;
  // A warning followed by a contradictory request is not actually a warning.
  return !/\b(?:with me|with us|only me|but)\b/i.test(sentence);
}

function accountLabel(account: ConnectedAccount) {
  return `${account.institution} · ${account.name} · •••• ${account.mask}`;
}

function transactionsWithinWindow(profile: FinancialProfile): Transaction[] {
  const cutoff = new Date(profile.asOf).getTime() - 120 * 86_400_000;
  return profile.transactions
    .filter((transaction) => new Date(transaction.date).getTime() >= cutoff)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

function findTransactionsForAmount(amount: number, profile: FinancialProfile) {
  const tolerance = Math.max(0.51, amount * 0.01);
  return transactionsWithinWindow(profile)
    .filter((transaction) => Math.abs(transaction.amount - amount) <= tolerance)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

function evidenceFor(
  transaction: Transaction,
  profile: FinancialProfile,
): NonNullable<FinancialCheck["evidence"]>[number] {
  const account = profile.accounts.find((candidate) => candidate.id === transaction.accountId);
  return {
    merchant: transaction.merchant,
    date: transaction.date,
    amount: transaction.amount,
    account: account ? accountLabel(account) : "Connected account",
    category: titleCase(transaction.category),
  };
}

function balanceFor(sentence: string, profile: FinancialProfile) {
  const lower = sentence.toLowerCase();
  const depositAccounts = profile.accounts.filter(
    (account) => account.type === "checking" || account.type === "savings",
  );
  const cardAccounts = profile.accounts.filter((account) => account.type === "credit_card");

  if (/\bchecking\b/.test(lower)) {
    return {
      amount: depositAccounts
        .filter((account) => account.type === "checking")
        .reduce((sum, account) => sum + account.balance, 0),
      label: "checking",
      specific: true,
    };
  }
  if (/\bsavings\b/.test(lower)) {
    return {
      amount: depositAccounts
        .filter((account) => account.type === "savings")
        .reduce((sum, account) => sum + account.balance, 0),
      label: "savings",
      specific: true,
    };
  }
  if (/\b(?:card|credit)\b/.test(lower)) {
    return {
      amount: cardAccounts.reduce((sum, account) => sum + account.balance, 0),
      label: "credit card",
      specific: true,
    };
  }
  return {
    amount: depositAccounts.reduce((sum, account) => sum + account.balance, 0),
    label: "cash accounts",
    specific: false,
  };
}

function financialChecksFor(transcript: string, profile: FinancialProfile): FinancialCheck[] {
  const checks: FinancialCheck[] = [];
  const seen = new Set<string>();

  for (const sentence of splitSentences(transcript)) {
    const lower = sentence.toLowerCase();
    const balanceClaim = BALANCE_CONTEXT.test(lower);
    const transactionClaim = TRANSACTION_CONTEXT.test(lower);
    if (!balanceClaim && !transactionClaim) continue;

    const amounts = Array.from(new Set(Array.from(sentence.matchAll(AMOUNT_PATTERN)).map((match) => {
      const raw = (match[1] ?? match[2] ?? "").replace(/,/g, "");
      return Number(raw);
    }).filter((amount) => Number.isFinite(amount) && amount > 0)));
    if (!amounts.length) continue;

    for (const amount of amounts) {
      const kind = balanceClaim ? "balance" : "transaction";
      const key = `${kind}:${amount.toFixed(2)}`;
      if (seen.has(key)) continue;
      seen.add(key);

      if (kind === "balance") {
        const actual = balanceFor(sentence, profile);
        const difference = Math.abs(actual.amount - amount);
        const close = difference <= Math.max(2, actual.amount * 0.01);
        const status: FinancialCheckStatus = close
          ? "matched"
          : actual.specific
            ? "inconsistent"
            : "unverifiable";
        checks.push({
          id: `check_${checks.length + 1}`,
          kind: "balance",
          claim: shortQuote(sentence),
          amount,
          status,
          detail: close
            ? `Your connected ${actual.label} balance is ${formatCurrency(actual.amount, {
                cents: true,
              })}, which is consistent with the figure mentioned.`
            : actual.specific
              ? `Your connected ${actual.label} balance is ${formatCurrency(actual.amount, {
                  cents: true,
                })}, not ${formatCurrency(amount, {
                  cents: true,
                })}. Pending activity or an account at another institution could explain part of the gap, but the claim is not supported by your current records.`
              : `No connected ${actual.label} currently match ${formatCurrency(amount, {
                  cents: true,
                })}. The caller may be referring to another institution, so this cannot be confirmed either way.`,
        });
        continue;
      }

      const matches = findTransactionsForAmount(amount, profile);
      checks.push({
        id: `check_${checks.length + 1}`,
        kind: "transaction",
        claim: shortQuote(sentence),
        amount,
        status: matches.length ? "matched" : "not-found",
        detail: matches.length
          ? `I found ${matches.length === 1 ? "a matching transaction" : `${matches.length} matching transactions`} in the last 120 days. This confirms the amount appears in your history, but it does not verify the caller's identity.`
          : `No transaction for ${formatCurrency(amount, {
              cents: true,
            })} appears in the last 120 days of connected data. It could be pending, posted at another institution, or simply wrong. A missing transaction by itself does not prove this is a scam.`,
        evidence: matches.slice(0, 3).map((transaction) => evidenceFor(transaction, profile)),
      });
    }
  }

  return checks;
}

function accountReferences(transcript: string, profile: FinancialProfile) {
  const pattern = /(?:ending(?:\s+in)?|last four(?: digits)?(?: are)?|••••)\s*(\d{4})/gi;
  const digits = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(transcript)) !== null) {
    if (match[1]) digits.add(match[1]);
  }
  const references = Array.from(digits).map((value) => {
    const account = profile.accounts.find(
      (candidate) => candidate.mask === value || candidate.mask.endsWith(value),
    );
    return { digits: value, account };
  });
  return references;
}

function quoteForDigits(transcript: string, digits: string) {
  const sentence = splitSentences(transcript).find((candidate) => candidate.includes(digits));
  return shortQuote(sentence ?? `Account ending ${digits}`);
}

export function analyzeCallTranscript(
  transcript: string,
  profile: FinancialProfile,
): ScamAnalysis {
  const sentences = splitSentences(transcript);
  const findingMap = new Map<string, ScamFinding>();

  for (const sentence of sentences) {
    const quote = shortQuote(sentence);
    const normalized = sentence.toLowerCase().replace(/[’‘]/g, "'");
    const safe = isSafeInstruction(normalized);

    for (const rule of RULES) {
      if (safe && !rule.skipSafeInstructions) continue;
      if (rule.needsRequest && !REQUEST_CONTEXT.test(normalized)) continue;
      if (!rule.patterns.some((pattern) => pattern.test(normalized))) continue;

      const existing = findingMap.get(rule.id);
      if (existing) {
        if (existing.quotes.length < 2 && !existing.quotes.includes(quote)) {
          existing.quotes.push(quote);
        }
      } else {
        findingMap.set(rule.id, {
          id: rule.id,
          category: rule.category,
          label: rule.label,
          severity: rule.severity,
          quotes: [quote],
          explanation: rule.explanation,
          weight: rule.weight,
        });
      }
    }
  }

  const financialChecks = financialChecksFor(transcript, profile);
  const references = accountReferences(transcript, profile);
  const unknownReferences = references.filter((reference) => !reference.account);

  if (unknownReferences.length) {
    findingMap.set("unrecognized_account", {
      id: "unrecognized_account",
      category: "contradiction",
      label: "Unrecognized account reference",
      severity: "low",
      weight: 12,
      quotes: [quoteForDigits(transcript, unknownReferences[0].digits)],
      explanation: `None of your connected accounts end in ${unknownReferences
        .map((reference) => reference.digits)
        .join(" or ")}. The caller may be referring to another institution, but do not treat the reference as proof they are legitimate.`,
    });
  }

  const inconsistentChecks = financialChecks.filter((check) => check.status === "inconsistent");
  if (inconsistentChecks.length) {
    findingMap.set("records_mismatch", {
      id: "records_mismatch",
      category: "contradiction",
      label: "Claim doesn't match your records",
      severity: "medium",
      weight: 26,
      quotes: inconsistentChecks.slice(0, 2).map((check) => check.claim),
      explanation:
        "A balance you can check does not match what the caller said. This is a genuine inconsistency, though pending activity or another account could explain part of it.",
    });
  }

  const findings = Array.from(findingMap.values()).sort((a, b) => {
    const rank = { high: 3, medium: 2, low: 1 };
    return rank[b.severity] - rank[a.severity] || b.weight - a.weight;
  });

  const criticalIds = new Set([
    "verification_code",
    "password_request",
    "identity_request",
    "remote_access",
    "gift_card",
    "safe_account",
    "unfamiliar_account",
    "app_isolation",
  ]);
  const moneyIds = new Set(["gift_card", "wire_crypto", "p2p", "unfamiliar_account"]);
  const pressureIds = new Set(["urgency", "threat", "secrecy", "app_isolation"]);
  const has = (id: string) => findings.some((finding) => finding.id === id);
  const hasCritical = findings.some((finding) => criticalIds.has(finding.id));
  const hasMoney = findings.some((finding) => moneyIds.has(finding.id));
  const hasPressure = findings.some((finding) => pressureIds.has(finding.id));

  let score = findings.reduce((sum, finding) => sum + finding.weight, 0);
  if (has("institution_claim") && (hasCritical || hasMoney || hasPressure)) score += 8;
  if (has("urgency") && (hasCritical || hasMoney)) score += 6;
  if (has("threat") && hasMoney) score += 5;
  if (hasCritical) score = Math.max(score, 66);
  if (hasMoney && hasPressure) score = Math.max(score, 65);
  score = Math.min(100, Math.round(score));

  const risk: ScamRiskLevel = score >= 60 ? "high" : score >= 25 ? "medium" : "low";
  const matchedChecks = financialChecks.filter((check) => check.status === "matched");
  const missingChecks = financialChecks.filter((check) => check.status === "not-found");
  const matchedAccounts = references.filter((reference) => reference.account);

  const safeSignals: string[] = [];
  if (matchedChecks.length) {
    safeSignals.push(
      "At least one claimed amount matches a transaction in your connected history. That supports the amount only, not the caller's identity.",
    );
  }
  if (matchedAccounts.length) {
    safeSignals.push(
      `The account ending ${matchedAccounts
        .map((reference) => reference.digits)
        .join(" and ")} matches a connected account. Caller ID can still be spoofed, so verify separately.`,
    );
  }
  if (
    /\b(?:call|dial|use)\b.{0,50}\b(?:number on (?:the back of )?(?:your )?card|official (?:number|website|app)|bank'?s app)\b/i.test(
      transcript,
    ) ||
    /\bhang up and (?:call|use)\b/i.test(transcript)
  ) {
    safeSignals.push(
      "The transcript encourages independent verification through an official channel. Use a number or app you open yourself, never one supplied by the caller.",
    );
  }
  if (!findings.some((finding) => finding.category === "sensitive")) {
    safeSignals.push("No request for passwords, verification codes, PINs or remote access was detected.");
  }
  if (!hasMoney) {
    safeSignals.push("No gift-card, wire, crypto or unfamiliar-account payment request was detected.");
  }
  if (!hasPressure) {
    safeSignals.push("No urgent, threatening or isolating language was detected.");
  }

  const themes: string[] = [];
  if (findings.some((finding) => finding.category === "sensitive")) {
    themes.push("requests for codes, credentials or device access");
  }
  if (hasMoney) themes.push("instructions to move money");
  if (hasPressure) themes.push("urgency, threats or isolation");
  if (has("institution_claim")) themes.push("an unverified institutional identity");
  const themePhrase = themes.length
    ? `The transcript includes ${themes.length > 1 ? `${themes.slice(0, -1).join(", ")} and ${themes[themes.length - 1]}` : themes[0]}.`
    : "No strong warning patterns were found.";
  const financialSentence = inconsistentChecks.length
    ? "A balance the caller mentioned does not match your connected records."
    : missingChecks.length
      ? `The caller's ${formatCurrency(missingChecks[0].amount, {
          cents: true,
        })} transaction claim does not appear in your connected history, though that alone does not prove fraud.`
      : matchedChecks.length
        ? `A claimed ${formatCurrency(matchedChecks[0].amount, {
            cents: true,
          })} amount does appear in your history, but that does not verify the caller.`
        : "No specific dollar claim could be compared with your accounts.";

  const headline =
    risk === "high"
      ? "Do not act on this call"
      : risk === "medium"
        ? "Pause and verify this call"
        : "Few scam signals detected — verify anyway";

  const summary =
    risk === "high"
      ? `${themePhrase} ${financialSentence} Treat the caller as unverified and do not share information or move money while they are on the line.`
      : risk === "medium"
        ? `${themePhrase} ${financialSentence} Verify the story independently before sharing information or moving money.`
        : `No strong scam patterns were detected in this transcript. ${financialSentence} This is not a guarantee: caller ID can be spoofed, and a calm caller can still be fraudulent.`;

  const nextSteps: string[] = [];
  if (risk === "high") {
    nextSteps.push(
      "End the call now. Do not call back, reply to, or use any link or number the caller gave you.",
    );
  } else {
    nextSteps.push(
      "Verify the caller independently using the number on your card, statement or the official agency website.",
    );
  }
  if (findings.some((finding) => finding.category === "sensitive")) {
    nextSteps.push(
      "Never share a verification code, password, PIN or remote access. If you already did, call your bank's fraud line and change those credentials from a trusted device.",
    );
  } else {
    nextSteps.push(
      "Do not share a verification code, password or PIN. No legitimate bank or agency will ask for them.",
    );
  }
  if (hasMoney) {
    nextSteps.push(
      "Do not send money, buy gift cards, use crypto or move funds to a 'safe' account. No legitimate bank or agency handles fraud this way.",
    );
  }
  if (has("remote_access")) {
    nextSteps.push(
      "Disconnect remote access, uninstall the remote tool and run a security scan before opening a banking app again.",
    );
  }
  if (has("threat") || has("secrecy")) {
    nextSteps.push(
      "If you feel threatened, contact local police using a number you look up yourself. Do not rely on the caller's case number or instructions.",
    );
  }
  if (inconsistentChecks.length) {
    nextSteps.push(
      "Open your account in PoyoVault or your bank's app and compare the claimed balance before discussing it further.",
    );
  }
  if (missingChecks.length) {
    nextSteps.push(
      "Check pending transactions and any other bank apps. A missing transaction is not proof of fraud, and a caller's claim is not proof either.",
    );
  }
  if (matchedChecks.length) {
    nextSteps.push(
      "A matching amount may be genuine, but confirm the caller separately through your bank before acting on their instructions.",
    );
  }
  nextSteps.push(
    "If money or information was shared, contact your bank immediately and report the call to the FTC at ReportFraud.ftc.gov and IC3 at ic3.gov.",
  );

  return {
    risk,
    score,
    headline,
    summary,
    findings,
    financialChecks,
    nextSteps: Array.from(new Set(nextSteps)).slice(0, 6),
    safeSignals: Array.from(new Set(safeSignals)).slice(0, 5),
    stats: {
      critical: findings.filter((finding) => finding.severity === "high").length,
      claims: financialChecks.length,
      matched: matchedChecks.length,
      words: transcript.trim() ? transcript.trim().split(/\s+/).length : 0,
    },
  };
}
