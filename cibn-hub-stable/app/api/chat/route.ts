import OpenAI from "openai";
import fs from "node:fs";
import path from "node:path";

export const runtime = "nodejs";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";
const KNOWLEDGE_DIR = path.join(process.cwd(), "lib", "knowledge");
const MAX_KNOWLEDGE_CHARS = 180_000;

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type ChatRequestBody = {
  message?: string;
  history?: ChatMessage[];
};

type ChoiceQuestion = {
  prompt: string;
  choices: [string, string, string, string];
};

const URLS = {
  site: "https://cibnconnect.com",
  membership: "https://cibnconnect.com/membership-options",
  booking: "https://api.leadconnectorhq.com/widget/groups/bookcibn",
  meetn: "https://meetn.com/cibnspecial",
  meetnTerms: "https://meetn.com/terms",
  networkerJoin:
    "https://link.fastpaydirect.com/payment-link/671e9c515146ea6e3f6c6953",
  speakerJoin:
    "https://link.fastpaydirect.com/payment-link/671e9cbc43b93a0db2eb799e",
  salesProJoin:
    "https://link.fastpaydirect.com/payment-link/671e9d1b43b93a56edeb79a2",
};

const PUBLIC_URLS = new Set([
  URLS.site,
  `${URLS.site}/`,
  `${URLS.site}/events`,
  URLS.membership,
  URLS.booking,
  URLS.meetn,
  URLS.meetnTerms,
  URLS.networkerJoin,
  URLS.speakerJoin,
  URLS.salesProJoin,
]);

const FIT_QUESTIONS: ChoiceQuestion[] = [
  {
    prompt: "How do you currently generate most of your business?",
    choices: ["Referrals", "Networking events", "Sales outreach", "A mix"],
  },
  {
    prompt: "Do trusted professionals introduce opportunities to you?",
    choices: ["Yes regularly", "Sometimes", "Rarely", "Trying to build that"],
  },
  {
    prompt: "How intentional is your networking strategy?",
    choices: [
      "Very intentional",
      "Somewhat intentional",
      "Mostly events",
      "Still figuring it out",
    ],
  },
  {
    prompt:
      "How valuable would it be to have 3–5 strategic partners help your business?",
    choices: [
      "Very valuable",
      "Somewhat valuable",
      "Not sure",
      "Want to learn more",
    ],
  },
  {
    prompt:
      "Would it help to have a clearer system for collaboration and referrals?",
    choices: ["Not at all", "A little", "Quite a bit", "Very much"],
  },
  {
    prompt: "Do you value long-term relationship building over quick wins?",
    choices: ["Not at all", "A little", "Quite a bit", "Very much"],
  },
];

const MEMBERSHIP_QUESTIONS: ChoiceQuestion[] = [
  {
    prompt: "What is your primary goal right now?",
    choices: [
      "Build stronger professional relationships",
      "Increase speaking visibility",
      "Improve sales conversations",
      "A mix of these",
    ],
  },
  {
    prompt: "What would help your business the most right now?",
    choices: [
      "Collaborating partners",
      "Speaking opportunities",
      "Better sales conversion",
      "All three",
    ],
  },
  {
    prompt: "Where do most of your current opportunities come from?",
    choices: ["Referrals", "Speaking", "Sales outreach", "A mix"],
  },
  {
    prompt: "How much structure and guidance do you want right now?",
    choices: ["A little", "Some", "A lot", "A mix depending on the area"],
  },
  {
    prompt: "Which area do you most want to strengthen next?",
    choices: [
      "Relationship-building",
      "Speaking presence",
      "Sales conversations",
      "All of the above",
    ],
  },
  {
    prompt: "What kind of growth path feels most aligned for you right now?",
    choices: [
      "Networking-focused growth",
      "Speaking-focused growth",
      "Sales-focused growth",
      "A blended path",
    ],
  },
];

function readMarkdownFilesRecursive(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const results: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      results.push(...readMarkdownFilesRecursive(fullPath));
      continue;
    }

    if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
      try {
        const content = fs.readFileSync(fullPath, "utf8");
        results.push(`FILE: ${entry.name}\n${content}`);
      } catch {
        // ignore unreadable files
      }
    }
  }

  return results;
}

function buildKnowledgeBlock(): string {
  return readMarkdownFilesRecursive(KNOWLEDGE_DIR)
    .join("\n\n━━━━━━━━━━━━━━━━━━\n\n")
    .slice(0, MAX_KNOWLEDGE_CHARS);
}

function stripCtx(text: string): string {
  return text.replace(/\[\[CTX:[^\]]+\]\]/g, "").trim();
}

function withCtx(ctx: string, text: string): string {
  return `[[CTX:${ctx}]]\n${text}`.trim();
}

function getCtx(content: string): string | null {
  const match = content.match(/\[\[CTX:([^\]]+)\]\]/);
  return match ? match[1] : null;
}

function lastAssistantContext(history: ChatMessage[]): string {
  for (let i = history.length - 1; i >= 0; i--) {
    const msg = history[i];
    if (msg.role !== "assistant") continue;
    const ctx = getCtx(msg.content);
    if (ctx) return ctx;
  }
  return "welcome";
}

function conversationText(history: ChatMessage[], latestMessage: string): string {
  const recent = history
    .slice(-10)
    .map((m) => `${m.role.toUpperCase()}: ${stripCtx(m.content)}`)
    .join("\n\n");

  return `${recent ? `Conversation so far:\n${recent}\n\n` : ""}USER: ${latestMessage}`.trim();
}

const SYSTEM_PROMPT = `
You are the CIBN Connect Hub assistant.

Your job:
- help people explore CIBN
- help new members get started
- help current members use CIBN more fully

Use ONLY:
- the user's local CIBN knowledge files
- the clearly provided public links

Do not:
- hallucinate
- invent private links
- use outside facts that are not in the knowledge
- say "the knowledge files do not specify"
- mention knowledge files in your answer
- print "H. Back" or "M. Main Menu"

If something is not directly clear in the source material:
- give the closest helpful guidance you can based on CIBN principles
- stay positive, clear, and useful
- suggest a next step when appropriate

Formatting rules:
- Use bold ONLY for section titles, like **Short Definition**
- Keep body text normal, not bold
- Use short sections
- Keep answers easy to scan
- Use short lists with "-"
- Keep submenu lists to 2–3 items max when possible
- If more detail is needed, offer a smaller follow-up submenu
- Always output full plain URLs so the page can make them clickable

Navigation rules:
- The interface already has buttons for Back, Main Menu, and Dig Deeper
- If the user types Back, move back one level
- If the user types Main Menu, show the main menu
- If the user types Dig Deeper, go deeper into the current topic
- If the user types just a number or letter, interpret it using the current visible menu context

Member-only rule:
- Never expose private member-only video links
- If content is member-only, tell the user:
  "To view member-only videos, go to https://cibnconnect.com and log in."

Public links:
- Main site: https://cibnconnect.com
- Membership options: https://cibnconnect.com/membership-options
- Book a tour: https://api.leadconnectorhq.com/widget/groups/bookcibn
- Meetn special: https://meetn.com/cibnspecial
- Meetn terms: https://meetn.com/terms
`.trim();

function sanitizeOutput(text: string, memberOnly = false): string {
  const urlRegex = /https?:\/\/[^\s)]+/g;

  let out = text.replace(urlRegex, (url) => {
    if (PUBLIC_URLS.has(url)) return url;
    if (url.includes("youtube.com") || url.includes("youtu.be")) return url;
    if (url.startsWith("https://cibnconnect.com")) return URLS.site;
    return "";
  });

  out = out
    .replace(/^\s*[HM]\.\s*(Back|Main Menu)\s*$/gim, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (memberOnly && !out.includes(URLS.site)) {
    out = `${out}\n\nTo view member-only videos, go to ${URLS.site} and log in.`.trim();
  }

  return out;
}

async function aiSectionAnswer(
  topic: string,
  history: ChatMessage[],
  message: string,
  knowledge: string,
  extraInstructions = "",
  memberOnly = false
): Promise<string> {
  const prompt = `
${SYSTEM_PROMPT}

You are answering a CIBN topic.

Use ONLY the knowledge below.

Current topic: ${topic}

${extraInstructions}

Knowledge:
${knowledge}

Conversation:
${conversationText(history, message)}
`.trim();

  const response = await client.responses.create({
    model: MODEL,
    input: prompt,
  });

  const raw =
    response.output_text?.trim() || "I’m sorry — I couldn’t generate a response.";

  return sanitizeOutput(raw, memberOnly);
}

function renderChoiceQuestion(
  ctxBase: string,
  title: string,
  n: number,
  q: ChoiceQuestion
): string {
  return withCtx(
    `${ctxBase}>${n}`,
    `**${title}**

**Question ${n} of 6**

${q.prompt}

1. ${q.choices[0]}
2. ${q.choices[1]}
3. ${q.choices[2]}
4. ${q.choices[3]}

Type the number for your answer.`
  );
}

function welcomeScreen(): string {
  return withCtx(
    "welcome",
    `**Welcome — I’m Kerry George, and I’m glad you’re here.**

CIBN Connect helps entrepreneurs, professionals, and business owners build trusted relationships, collaborating partnerships, warmed-up referrals, and revenue in a more intentional way.

This hub is here to help you explore CIBN, understand how it works, and make better use of everything available inside the community.

Whether you are exploring membership, just getting started, or already a member who wants to use CIBN more fully, this hub can help you find the next best step.

**Inside, you can:**
- learn what CIBN is and how it works
- explore membership options
- get help as a member
- find tools, training, videos, and next steps
- dig deeper into specific topics as you go`
  );
}

function mainMenu(): string {
  return withCtx(
    "main",
    `**Main Menu**

1. Explore CIBN
- Learn what CIBN is and see whether it fits.

2. I’m a Member
- Get support, structure, and next steps.

3. Tools & Training
- Explore tools, training, and videos.`
  );
}

function exploringMenu(): string {
  return withCtx(
    "exploring",
    `**Explore CIBN**

A. What is CIBN
B. Is CIBN a Good Fit for Me?
C. Membership Options`
  );
}

function whatIsCibnMenu(): string {
  return withCtx(
    "exploring>what",
    `**What is CIBN**

1. Short Definition
2. Core Philosophy
3. How It Works`
  );
}

function fitMenu(): string {
  return withCtx(
    "exploring>fit",
    `**Is CIBN a Good Fit for Me?**

1. CIBN Fit Quiz
2. Quiz Summary & Recommendation`
  );
}

function membershipMenu(): string {
  return withCtx(
    "exploring>membership",
    `**Membership Options**

1. Types of Membership
2. Membership Quiz
3. Membership Quiz Summary`
  );
}

function memberMenu(): string {
  return withCtx(
    "member",
    `**I’m a Member**

A. Getting Started
B. Member Navigation Help
C. Collaboration & Referral Growth`
  );
}

function gettingStartedMenu(): string {
  return withCtx(
    "member>start",
    `**Getting Started**

1. First 48 Hours
2. First 30 Days
3. Onboarding Help`
  );
}

function memberHelpMenu(): string {
  return withCtx(
    "member>help",
    `**Member Navigation Help**

A. Networking Flows
B. Marketing Strategies
C. Member Training & Videos`
  );
}

function memberGrowthMenu(): string {
  return withCtx(
    "member>growth",
    `**Collaboration & Referral Growth**

1. Improve My Results
2. Collaborating Partners
3. Referral Growth`
  );
}

function first48HoursMenu(): string {
  return withCtx(
    "member>start>48hours",
    `**First 48 Hours**

1. Schedule Your Onboarding Call
2. Install Your Chrome Extension
3. Update Your LinkedIn Profile`
  );
}

function first30DaysMenu(): string {
  return withCtx(
    "member>start>30days",
    `**First 30 Days**

1. Attend Networking Meetings
2. Schedule One-on-One Meetings
3. Begin Referral Activity`
  );
}

function networkingFlowsMenu(): string {
  return withCtx(
    "member>help>flows",
    `**Networking Flows**

A. One-on-One Prep
B. Referral Conversations
C. Follow-Up System`
  );
}

function marketingMenu(): string {
  return withCtx(
    "member>help>marketing",
    `**Marketing Strategies**

A. $150K Collaboration Strategy
B. Referral Systems
C. One Minute Infomercial`
  );
}

function memberTrainingVideosMenu(): string {
  return withCtx(
    "member>help>trainingvideos",
    `**Member Training & Videos**

1. Member Training
2. Courses
3. Member-Only Videos`
  );
}

function ttvMenu(): string {
  return withCtx(
    "ttv",
    `**Tools & Training**

A. Training
B. Events
C. Tools`
  );
}

function trainingMenu(): string {
  return withCtx(
    "ttv>training",
    `**Training**

1. Smart Networking Training
2. Sales Pro Training
3. Speaker Training`
  );
}

function eventsMenu(): string {
  return withCtx(
    "ttv>events",
    `**Events**

1. Networking Groups
2. Weekly Meetings
3. Summits`
  );
}

function networkingGroupsMenu(): string {
  return withCtx(
    "ttv>events>groups",
    `**Networking Groups**

1. What They Are
2. How to Use Them
3. Best Next Step`
  );
}

function toolsMenu(): string {
  return withCtx(
    "ttv>tools",
    `**Tools**

A. Chrome Extension
B. LinkedIn
C. Meetn
D. Nolodex`
  );
}

function chromeExtensionMenu(): string {
  return withCtx(
    "ttv>tools>chrome",
    `**Chrome Extension**

A. Match Me
B. Golden Recommendation
C. Trusted Connections`
  );
}

function fitQuizIntro(): string {
  return withCtx(
    "quiz>fit>intro",
    `**CIBN Fit Quiz**

**What this helps you do**
- See whether CIBN’s style of networking fits how you want to grow.

**How this works**
- I’ll ask 6 quick questions
- One question at a time
- You answer, then I move to the next question

Type **go** to begin.`
  );
}

function membershipQuizIntro(): string {
  return withCtx(
    "quiz>membership>intro",
    `**Membership Quiz**

**What this helps you do**
- Identify a good starting membership level for where you are right now.

**How this works**
- I’ll ask 6 quick questions
- One question at a time
- You answer, then I move to the next question

Type **go** to begin.`
  );
}

function fitQuizQuestion(n: number): string {
  return renderChoiceQuestion("quiz>fit", "CIBN Fit Quiz", n, FIT_QUESTIONS[n - 1]);
}

function membershipQuizQuestion(n: number): string {
  return renderChoiceQuestion(
    "quiz>membership",
    "Membership Quiz",
    n,
    MEMBERSHIP_QUESTIONS[n - 1]
  );
}

function collectSequentialQuizAnswers(history: ChatMessage[], prefix: string): number[] {
  const answers: number[] = [];

  for (let i = 0; i < history.length; i++) {
    const msg = history[i];
    if (msg.role !== "assistant") continue;

    const ctx = getCtx(msg.content);
    if (!ctx || !ctx.startsWith(prefix)) continue;

    const next = history[i + 1];
    if (!next || next.role !== "user") continue;

    const n = Number(next.content.trim());
    if ([1, 2, 3, 4].includes(n)) answers.push(n);
  }

  return answers;
}

function fitQuizSummary(history: ChatMessage[]): string {
  const answers = collectSequentialQuizAnswers(history, "quiz>fit>");
  const score = answers.reduce((a, b) => a + b, 0);

  let recommendation = "CIBN sounds like a good fit for you.";
  let reason =
    "Your answers suggest that relationship-based growth, trusted introductions, and a clearer referral system may support your business well.";

  if (score >= 18) {
    recommendation = "CIBN sounds like a very good fit for you.";
    reason =
      "Your answers suggest that you value trusted relationships, collaborating partners, and a more intentional networking system — which aligns closely with how CIBN works.";
  }

  return withCtx(
    "quiz>fit>summary",
    `**CIBN Fit Quiz Summary**

${recommendation}

**Why**
${reason}

**Join Options**
- Networker: ${URLS.networkerJoin}
- Speaker: ${URLS.speakerJoin}
- Sales Pro: ${URLS.salesProJoin}`
  );
}

function membershipQuizSummary(history: ChatMessage[]): string {
  const answers = collectSequentialQuizAnswers(history, "quiz>membership>");
  const score = answers.reduce((a, b) => a + b, 0);

  let recommendation = "Networker may be the best place to start.";
  let reason = "It sounds like you may want a lighter entry point with room to grow.";

  if (score >= 18) {
    recommendation = "Speaker or Sales Pro may be the strongest fit for you.";
    reason =
      "You seem ready for more structure, stronger implementation, and a more advanced growth path.";
  } else if (score >= 15) {
    recommendation = "Sales Pro may be a strong fit for you.";
    reason =
      "You appear to want more growth support, stronger accountability, and a more sales-focused path.";
  } else if (score >= 12) {
    recommendation = "Networker may be a good fit, with room to grow later.";
    reason =
      "You seem interested in learning the system, building consistency, and strengthening your networking foundation first.";
  }

  return withCtx(
    "quiz>membership>summary",
    `**Membership Quiz Summary**

${recommendation}

**Why**
${reason}

**Join Links**
- Networker: ${URLS.networkerJoin}
- Speaker: ${URLS.speakerJoin}
- Sales Pro: ${URLS.salesProJoin}`
  );
}

function parentOf(ctx: string): string {
  if (!ctx) return "main";

  if (ctx.endsWith(">deeper")) {
    return ctx.replace(/>deeper$/, "");
  }

  if (ctx === "welcome") return "main";
  if (ctx === "main") return "main";
  if (ctx === "exploring") return "main";
  if (ctx === "member") return "main";
  if (ctx === "ttv") return "main";

  if (ctx === "quiz>fit>intro" || ctx === "quiz>fit>summary") return "exploring>fit";
  if (ctx === "quiz>membership>intro" || ctx === "quiz>membership>summary") {
    return "exploring>membership";
  }

  if (ctx.startsWith("quiz>fit>")) {
    const q = Number(ctx.split(">")[2]);
    if (q <= 1) return "quiz>fit>intro";
    return `quiz>fit>${q - 1}`;
  }

  if (ctx.startsWith("quiz>membership>")) {
    const q = Number(ctx.split(">")[2]);
    if (q <= 1) return "quiz>membership>intro";
    return `quiz>membership>${q - 1}`;
  }

  const parts = ctx.split(">");
  if (parts.length <= 1) return "main";
  return parts.slice(0, -1).join(">");
}

function renderContextMenu(ctx: string, history: ChatMessage[] = []): string {
  switch (ctx) {
    case "welcome":
      return welcomeScreen();
    case "main":
      return mainMenu();
    case "exploring":
      return exploringMenu();
    case "exploring>what":
      return whatIsCibnMenu();
    case "exploring>fit":
      return fitMenu();
    case "exploring>membership":
      return membershipMenu();
    case "member":
      return memberMenu();
    case "member>start":
      return gettingStartedMenu();
    case "member>help":
      return memberHelpMenu();
    case "member>growth":
      return memberGrowthMenu();
    case "member>start>48hours":
      return first48HoursMenu();
    case "member>start>30days":
      return first30DaysMenu();
    case "member>help>flows":
      return networkingFlowsMenu();
    case "member>help>marketing":
      return marketingMenu();
    case "member>help>trainingvideos":
      return memberTrainingVideosMenu();
    case "ttv":
      return ttvMenu();
    case "ttv>training":
      return trainingMenu();
    case "ttv>events":
      return eventsMenu();
    case "ttv>events>groups":
      return networkingGroupsMenu();
    case "ttv>tools":
      return toolsMenu();
    case "ttv>tools>chrome":
      return chromeExtensionMenu();
    case "quiz>fit>intro":
      return fitQuizIntro();
    case "quiz>membership>intro":
      return membershipQuizIntro();
    case "quiz>fit>summary":
      return fitQuizSummary(history);
    case "quiz>membership>summary":
      return membershipQuizSummary(history);
    default:
      if (ctx.startsWith("quiz>fit>")) {
        const q = Number(ctx.split(">")[2]);
        if (!Number.isNaN(q) && q >= 1 && q <= 6) return fitQuizQuestion(q);
      }
      if (ctx.startsWith("quiz>membership>")) {
        const q = Number(ctx.split(">")[2]);
        if (!Number.isNaN(q) && q >= 1 && q <= 6) return membershipQuizQuestion(q);
      }
      return mainMenu();
  }
}

function topicFromContext(ctx: string): string | null {
  const map: Record<string, string> = {
    "exploring>what>1": "What is CIBN",
    "exploring>what>2": "Core Philosophy",
    "exploring>what>3": "How It Works",
    "member>growth>1": "Improve My Results",
    "member>growth>2": "Collaborating Partners",
    "member>growth>3": "Referral Growth",
    "ttv>training>1": "Smart Networking Training",
    "ttv>training>2": "Sales Pro Training",
    "ttv>training>3": "Speaker Training",
    "ttv>events>2": "Weekly Meetings",
    "ttv>events>3": "Summits",
    "ttv>tools>b": "LinkedIn",
    "ttv>tools>c": "Meetn",
    "ttv>tools>d": "Nolodex",
    "ttv>tools>chrome>a": "Chrome Extension: Match Me",
    "ttv>tools>chrome>b": "Chrome Extension: Golden Recommendation",
    "ttv>tools>chrome>c": "Chrome Extension: Trusted Connections",
    "member>help>flows>a": "One-on-One Prep",
    "member>help>flows>b": "Referral Conversations",
    "member>help>flows>c": "Follow-Up System",
    "member>help>marketing>a": "$150K Collaboration Strategy",
    "member>help>marketing>b": "Referral Systems",
    "member>help>marketing>c": "One Minute Infomercial",
    "member>help>trainingvideos>1": "Member Training",
    "member>help>trainingvideos>2": "Courses",
    "member>help>trainingvideos>3": "Member-Only Videos",
  };

  return map[ctx] || null;
}

export async function POST(request: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return Response.json(
        { error: "Missing OPENAI_API_KEY environment variable." },
        { status: 500 }
      );
    }

    const body = (await request.json()) as ChatRequestBody;
    const message = body.message?.trim() || "";
    const history = Array.isArray(body.history) ? body.history : [];
    const lower = message.toLowerCase();
    const ctx = lastAssistantContext(history);
    const knowledge = buildKnowledgeBlock();

    if (!message) return Response.json({ text: welcomeScreen() });
    if (lower === "start here") return Response.json({ text: welcomeScreen() });

    if (lower === "main" || lower === "main menu") {
      return Response.json({ text: mainMenu() });
    }

    if (lower === "back") {
      const target = parentOf(ctx);
      return Response.json({ text: renderContextMenu(target, history) });
    }

    if (lower === "dig deeper") {
      const topic = topicFromContext(ctx);
      if (topic) {
        const text = await aiSectionAnswer(
          topic,
          history,
          "Dig deeper into this topic.",
          knowledge,
          "Go one level deeper than before. Keep it easy to scan. Use bold section titles only."
        );
        return Response.json({ text: withCtx(`${ctx}>deeper`, text) });
      }

      const text = await aiSectionAnswer(
        "Current CIBN topic",
        history,
        "Dig deeper into the current topic.",
        knowledge,
        "Use the recent conversation context to deepen the most recent CIBN topic. Be specific, practical, and concise. Use bold section titles only."
      );
      return Response.json({ text: withCtx(`${ctx}>deeper`, text) });
    }

    if (ctx === "welcome" || ctx === "main") {
      if (lower === "1") return Response.json({ text: exploringMenu() });
      if (lower === "2") return Response.json({ text: memberMenu() });
      if (lower === "3") return Response.json({ text: ttvMenu() });
    }

    if (ctx === "exploring") {
      if (lower === "a") return Response.json({ text: whatIsCibnMenu() });
      if (lower === "b") return Response.json({ text: fitMenu() });
      if (lower === "c") return Response.json({ text: membershipMenu() });
    }

    if (ctx === "exploring>what") {
      const topics: Record<string, string> = {
        "1": "What is CIBN",
        "2": "Core Philosophy",
        "3": "How It Works",
      };
      if (topics[lower]) {
        const text = await aiSectionAnswer(
          topics[lower],
          history,
          message,
          knowledge,
          "Keep it short. Use bold section titles only."
        );
        return Response.json({ text: withCtx(`exploring>what>${lower}`, text) });
      }
    }

    if (ctx === "exploring>fit") {
      if (lower === "1") return Response.json({ text: fitQuizIntro() });
      if (lower === "2") return Response.json({ text: fitQuizSummary(history) });
    }

    if (ctx === "exploring>membership") {
      if (lower === "1") {
        const text = await aiSectionAnswer(
          "Types of Membership",
          history,
          message,
          knowledge,
          "Keep this short. Include the three membership names."
        );
        const appended = `${text}

**Join Options**
- Networker: ${URLS.networkerJoin}
- Speaker: ${URLS.speakerJoin}
- Sales Pro: ${URLS.salesProJoin}`.trim();

        return Response.json({ text: withCtx("exploring>membership>1", appended) });
      }

      if (lower === "2") return Response.json({ text: membershipQuizIntro() });
      if (lower === "3") return Response.json({ text: membershipQuizSummary(history) });
    }

    if (ctx === "quiz>fit>intro") {
      if (lower === "go") return Response.json({ text: fitQuizQuestion(1) });
      return Response.json({ text: fitQuizIntro() });
    }

    if (ctx === "quiz>membership>intro") {
      if (lower === "go") return Response.json({ text: membershipQuizQuestion(1) });
      return Response.json({ text: membershipQuizIntro() });
    }

    if (ctx.startsWith("quiz>fit>") && ctx !== "quiz>fit>intro" && ctx !== "quiz>fit>summary") {
      const q = Number(ctx.split(">")[2]);
      const answer = Number(lower);

      if (![1, 2, 3, 4].includes(answer)) {
        return Response.json({ text: fitQuizQuestion(q) });
      }
      if (q < 6) {
        return Response.json({ text: fitQuizQuestion(q + 1) });
      }
      return Response.json({
        text: fitQuizSummary([...history, { role: "user", content: message }]),
      });
    }

    if (
      ctx.startsWith("quiz>membership>") &&
      ctx !== "quiz>membership>intro" &&
      ctx !== "quiz>membership>summary"
    ) {
      const q = Number(ctx.split(">")[2]);
      const answer = Number(lower);

      if (![1, 2, 3, 4].includes(answer)) {
        return Response.json({ text: membershipQuizQuestion(q) });
      }
      if (q < 6) {
        return Response.json({ text: membershipQuizQuestion(q + 1) });
      }
      return Response.json({
        text: membershipQuizSummary([...history, { role: "user", content: message }]),
      });
    }

    if (ctx === "member") {
      if (lower === "a") return Response.json({ text: gettingStartedMenu() });
      if (lower === "b") return Response.json({ text: memberHelpMenu() });
      if (lower === "c") return Response.json({ text: memberGrowthMenu() });
    }

    if (ctx === "member>start") {
      if (lower === "1") return Response.json({ text: first48HoursMenu() });
      if (lower === "2") return Response.json({ text: first30DaysMenu() });
      if (lower === "3") {
        const text = await aiSectionAnswer(
          "Onboarding Help",
          history,
          message,
          knowledge,
          `Keep it short. If helpful, include:
- Book a tour: ${URLS.booking}`
        );
        return Response.json({ text: withCtx("member>start>onboarding", text) });
      }
    }

    if (ctx === "member>help") {
      if (lower === "a") return Response.json({ text: networkingFlowsMenu() });
      if (lower === "b") return Response.json({ text: marketingMenu() });
      if (lower === "c") return Response.json({ text: memberTrainingVideosMenu() });
    }

    if (ctx === "member>growth") {
      if (lower === "1") {
        const text = await aiSectionAnswer(
          "Improve My Results",
          history,
          message,
          knowledge,
          "Keep it short."
        );
        return Response.json({ text: withCtx("member>growth>1", text) });
      }
      if (lower === "2") {
        const text = await aiSectionAnswer(
          "Collaborating Partners",
          history,
          message,
          knowledge,
          "Keep it short."
        );
        return Response.json({ text: withCtx("member>growth>2", text) });
      }
      if (lower === "3") {
        const text = await aiSectionAnswer(
          "Referral Growth",
          history,
          message,
          knowledge,
          "Keep it short."
        );
        return Response.json({ text: withCtx("member>growth>3", text) });
      }
    }

    if (ctx === "member>start>48hours") {
      const topics: Record<string, string> = {
        "1": "Schedule your onboarding call",
        "2": "Install your Chrome Extension",
        "3": "Update your LinkedIn profile",
      };

      if (topics[lower]) {
        const text = await aiSectionAnswer(
          topics[lower],
          history,
          message,
          knowledge,
          "Keep it short."
        );
        return Response.json({ text: withCtx(`member>start>48hours>${lower}`, text) });
      }
    }

    if (ctx === "member>start>30days") {
      const topics: Record<string, string> = {
        "1": "Attend Networking Meetings",
        "2": "Schedule One-on-One Meetings",
        "3": "Begin Referral Activity",
      };

      if (topics[lower]) {
        const text = await aiSectionAnswer(
          topics[lower],
          history,
          message,
          knowledge,
          "Keep it short."
        );
        return Response.json({ text: withCtx(`member>start>30days>${lower}`, text) });
      }
    }

    if (ctx === "member>help>flows") {
      const topics: Record<string, string> = {
        a: "One-on-One Prep",
        b: "Referral Conversations",
        c: "Follow-Up System",
      };

      if (topics[lower]) {
        const text = await aiSectionAnswer(
          topics[lower],
          history,
          message,
          knowledge,
          "Keep it short."
        );
        return Response.json({ text: withCtx(`member>help>flows>${lower}`, text) });
      }
    }

    if (ctx === "member>help>marketing") {
      const topics: Record<string, string> = {
        a: "$150K Collaboration Strategy",
        b: "Referral Systems",
        c: "One Minute Infomercial",
      };

      if (topics[lower]) {
        const extra =
          lower === "a"
            ? "Answer questions about ideas, methods, and concepts from the Smart Networking Method and related CIBN resources. Do not provide full book text."
            : "Keep it short.";

        const text = await aiSectionAnswer(
          topics[lower],
          history,
          message,
          knowledge,
          extra
        );
        return Response.json({ text: withCtx(`member>help>marketing>${lower}`, text) });
      }
    }

    if (ctx === "member>help>trainingvideos") {
      if (lower === "1") {
        const text = await aiSectionAnswer(
          "Member Training",
          history,
          message,
          knowledge,
          "Keep it short."
        );
        return Response.json({ text: withCtx("member>help>trainingvideos>1", text) });
      }

      if (lower === "2") {
        const text = await aiSectionAnswer(
          "Courses",
          history,
          message,
          knowledge,
          "Keep it short."
        );
        return Response.json({ text: withCtx("member>help>trainingvideos>2", text) });
      }

      if (lower === "3") {
        const text = await aiSectionAnswer(
          "Member-Only Videos",
          history,
          message,
          knowledge,
          "Provide only names and short descriptions. Never show private member-only links.",
          true
        );
        return Response.json({ text: withCtx("member>help>trainingvideos>3", text) });
      }
    }

    if (ctx === "ttv") {
      if (lower === "a") return Response.json({ text: trainingMenu() });
      if (lower === "b") return Response.json({ text: eventsMenu() });
      if (lower === "c") return Response.json({ text: toolsMenu() });
    }

    if (ctx === "ttv>training") {
      const topics: Record<string, string> = {
        "1": "Smart Networking Training",
        "2": "Sales Pro Training",
        "3": "Speaker Training",
      };

      if (topics[lower]) {
        const text = await aiSectionAnswer(
          topics[lower],
          history,
          message,
          knowledge,
          "Keep it short."
        );
        return Response.json({ text: withCtx(`ttv>training>${lower}`, text) });
      }
    }

    if (ctx === "ttv>events") {
      if (lower === "1") return Response.json({ text: networkingGroupsMenu() });

      if (lower === "2") {
        const text = await aiSectionAnswer(
          "Weekly Meetings",
          history,
          message,
          knowledge,
          "Keep it short."
        );
        return Response.json({ text: withCtx("ttv>events>2", text) });
      }

      if (lower === "3") {
        const text = await aiSectionAnswer(
          "Summits",
          history,
          message,
          knowledge,
          "Keep it short."
        );
        return Response.json({ text: withCtx("ttv>events>3", text) });
      }
    }

    if (ctx === "ttv>events>groups") {
      const topics: Record<string, string> = {
        "1": "Networking Groups: What they are",
        "2": "Networking Groups: How to use them",
        "3": "Networking Groups: Best next step",
      };

      if (topics[lower]) {
        const text = await aiSectionAnswer(
          topics[lower],
          history,
          message,
          knowledge,
          "Use bold section titles only. Keep it short."
        );
        return Response.json({ text: withCtx(`ttv>events>groups>${lower}`, text) });
      }
    }

    if (ctx === "ttv>tools") {
      if (lower === "a") {
        return Response.json({ text: chromeExtensionMenu() });
      }

      if (lower === "b") {
        const text = await aiSectionAnswer(
          "LinkedIn",
          history,
          message,
          knowledge,
          "Keep it short."
        );
        return Response.json({ text: withCtx("ttv>tools>b", text) });
      }

      if (lower === "c") {
        const text = await aiSectionAnswer(
          "Meetn",
          history,
          message,
          knowledge,
          `Explain what Meetn is, how CIBN members use it, and why it matters.

Keep it short.
Use bold section titles only.

Then include BOTH of these links exactly like this:

Meetn Discount:
https://meetn.com/cibnspecial

Meetn Terms of Service:
https://meetn.com/terms`
        );

        return Response.json({
          text: withCtx("ttv>tools>c", text),
        });
      }

      if (lower === "d") {
        const text = await aiSectionAnswer(
          "Nolodex",
          history,
          message,
          knowledge,
          "Explain what Nolodex is, how CIBN members use it, and why it matters. Keep it short. Use bold section titles only."
        );
        return Response.json({ text: withCtx("ttv>tools>d", text) });
      }
    }

    if (ctx === "ttv>tools>chrome") {
      const topics: Record<string, string> = {
        a: "Chrome Extension: Match Me",
        b: "Chrome Extension: Golden Recommendation",
        c: "Chrome Extension: Trusted Connections",
      };

      if (topics[lower]) {
        const text = await aiSectionAnswer(
          topics[lower],
          history,
          message,
          knowledge,
          "Use bold section titles only. Keep it short."
        );
        return Response.json({ text: withCtx(`ttv>tools>chrome>${lower}`, text) });
      }
    }

    if (lower.includes("infomercial") || lower.includes("testimonial")) {
      const text = await aiSectionAnswer(
        "Infomercials and testimonial styles",
        history,
        message,
        knowledge,
        "Search the knowledge for infomercial guidance and testimonial styles. If 5 styles are present, list them clearly. If not found, give the closest helpful guidance. Keep it short."
      );
      return Response.json({ text: withCtx("direct>infomercial", text) });
    }

    const fallback = await aiSectionAnswer(
      "General CIBN question",
      history,
      message,
      knowledge,
      "Keep it short and helpful."
    );

    return Response.json({ text: withCtx("content", fallback) });
  } catch (error) {
    console.error("Chat route error:", error);
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Unknown server error occurred.",
      },
      { status: 500 }
    );
  }
}