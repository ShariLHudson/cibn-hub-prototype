import OpenAI from "openai";
import fs from "node:fs";
import path from "node:path";

export const runtime = "nodejs";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";
const KNOWLEDGE_DIR = path.join(process.cwd(), "lib", "knowledge_v2");
const MAX_KNOWLEDGE_CHARS = 500_000;

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
  events: "https://cibnconnect.com/events",
  meetn: "https://meetn.com/cibnspecial",
  meetnTerms: "https://meetn.com/terms",
  networkerJoin:
    "https://link.fastpaydirect.com/payment-link/671e9c515146ea6e3f6c6953",
  speakerJoin:
    "https://link.fastpaydirect.com/payment-link/671e9cbc43b93a0db2eb799e",
  salesProJoin:
    "https://link.fastpaydirect.com/payment-link/671e9d1b43b93a56edeb79a2",
  youtube:
    "https://www.youtube.com/c/CIBNTVCIBNConnectWithBusinessOwners",
};

const PUBLIC_URLS = new Set([
  URLS.site,
  `${URLS.site}/`,
  URLS.membership,
  URLS.booking,
  URLS.events,
  URLS.meetn,
  URLS.meetnTerms,
  URLS.networkerJoin,
  URLS.speakerJoin,
  URLS.salesProJoin,
  URLS.youtube,
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
    prompt:
      "Which feels most natural for how you like to grow your business?",
    choices: [
      "Building trusted referral relationships",
      "Sharing expertise and educating others",
      "Having meaningful business conversations that lead to opportunities",
      "A mix of these",
    ],
  },
  {
    prompt: "What kind of visibility feels most important right now?",
    choices: [
      "Being known and trusted by strong referral partners",
      "Being seen as a speaker or thought leader",
      "Having stronger sales conversations",
      "A mix of these",
    ],
  },
  {
    prompt: "Which kind of support would help you most right now?",
    choices: [
      "Networking structure and relationship-building",
      "Speaking opportunities and audience growth",
      "Sales confidence and conversion support",
      "A mix of these",
    ],
  },
  {
    prompt: "When you think about growth, what feels most natural?",
    choices: [
      "Growing through trusted connections",
      "Growing through teaching and presenting",
      "Growing through business development conversations",
      "A mix of these",
    ],
  },
  {
    prompt: "Which area do you most want to strengthen next?",
    choices: [
      "Referral relationships",
      "Speaking presence",
      "Sales conversations",
      "All three",
    ],
  },
  {
    prompt: "What sounds most aligned for your next step?",
    choices: [
      "A networking-focused path",
      "A speaking-focused path",
      "A sales-focused path",
      "A blended path",
    ],
  },
];

const DIRECT_EXPLORE_ANSWERS = {
  shortDefinition: `**What is CIBN?**

CIBN stands for Collaborative International Business Network.

It is a professional networking community that helps members build strong, meaningful relationships focused on collaboration, referrals, and long-term business growth.

**Why CIBN Matters**
- It focuses on trust-based relationships instead of transactional contacts
- It encourages meaningful collaboration, not random networking
- It creates warm introductions and referral opportunities
- It uses a more intentional structure for building business relationships

**Best Next Step**
- Explore membership options here: ${URLS.membership}
- Or book a tour here: ${URLS.booking}`,

  corePhilosophy: `**Core Philosophy of CIBN**

CIBN is built on the idea that better business grows through better relationships.

The Collaborative International Business Network is not about random networking, collecting contacts, or giving rushed pitches. It is about building trusted relationships with the right people over time.

**What This Looks Like**
- Focus on quality relationships, not just quantity
- Build 3–5 strong collaborating partners
- Look for people who serve the same audience in a complementary way
- Turn networking into a structured process instead of guessing

**The Big Shift**
Instead of asking:
- How many people can I meet?

CIBN asks:
- Who are the right few people I should build with?`,

  howItWorks: `**How CIBN Works**

CIBN helps members turn networking into a more intentional relationship-building system.

**The Basic Flow**
- Attend networking opportunities and events
- Book one-on-one conversations
- Learn who serves your audience
- Identify collaborating partners
- Build trust over time
- Begin exchanging introductions and referrals

**Why It Works**
- It moves networking from random to intentional
- It focuses on relationship depth instead of shallow volume
- It creates repeatable referral pathways
- It helps members build a stronger long-term growth system

**Best Next Step**
- Explore CIBN membership here: ${URLS.membership}
- Or book a tour here: ${URLS.booking}`,
};

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

function appendNextSteps(text: string, nextMenu: string): string {
  return `${text}\n\n---\n\n${nextMenu}`;
}

const SYSTEM_PROMPT = `
You are the CIBN Connect Hub assistant.

CIBN always stands for Collaborative International Business Network.

Your job:
- Help people explore CIBN Connect and understand its value
- Help new members get started
- Help current members use CIBN more fully
- Explain public information about events, groups, programs, and training
- Keep actual member-only access gated

Use ONLY the CIBN knowledge files provided. Do NOT use outside facts.

CRITICAL RULES:
- Preserve the same meaning, business logic, pricing, and membership/program names throughout the app
- Membership types must always be exactly:
  - Networker
  - Speaker
  - Sales Pro
- Give thorough, complete answers
- Do not invent new links, program names, or membership types

Do NOT:
- Hallucinate or invent facts or links
- Mention knowledge files in your answers
- Print "H. Back" or "M. Main Menu"
- Send users to an events page for collaboration or referral-relationship guidance
- Treat tools as training or training as tools

Formatting rules:
- Use bold ONLY for section titles
- Keep body text normal
- Use short, easy-to-scan sections with "-" bullets
- Always output full plain URLs so the page can make them clickable

Public links you may use:
- Main site: https://cibnconnect.com
- Membership options: https://cibnconnect.com/membership-options
- Book a tour: https://api.leadconnectorhq.com/widget/groups/bookcibn
- Networking event registration: https://cibnconnect.com/events
- YouTube Training: https://www.youtube.com/c/CIBNTVCIBNConnectWithBusinessOwners
- Meetn: https://meetn.com/cibnspecial
- Meetn Terms: https://meetn.com/terms
- Join as Networker: https://link.fastpaydirect.com/payment-link/671e9c515146ea6e3f6c6953
- Join as Speaker: https://link.fastpaydirect.com/payment-link/671e9cbc43b93a0db2eb799e
- Join as Sales Pro: https://link.fastpaydirect.com/payment-link/671e9d1b43b93a56edeb79a2

Access rule:
- Anyone may view general information about events, groups, programs, or training topics if the knowledge includes it
- Never expose private member-only links
- For member-only access, say: "To access member-only materials, go to https://cibnconnect.com and log in."

Event rule:
- Use https://cibnconnect.com/events only for networking event registration, schedules, or event/group information
- Do NOT use that link for collaboration strategy, referral relationships, one-on-one guidance, or general networking strategy

Video library rule:
- Public videos may include title, short description, and direct link when the knowledge provides them
- Member-only videos may include title and benefit-focused description
- Never include direct links to member-only videos
- Always direct users to https://cibnconnect.com for member-only videos

Meetn rule:
- Meetn is a meeting platform and discounted tool option
- Do not use Meetn as a substitute answer for collaboration, referrals, or networking strategy guidance
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
    out = `${out}\n\nTo access member-only materials, go to ${URLS.site} and log in.`.trim();
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
    response.output_text?.trim() ||
    "I'm sorry — I couldn't generate a response.";

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
    `**${title} — Question ${n} of 6**

${q.prompt}

1. ${q.choices[0]}
2. ${q.choices[1]}
3. ${q.choices[2]}
4. ${q.choices[3]}`
  );
}

function welcomeScreen(): string {
  return withCtx(
    "welcome",
    `**Welcome — I'm Kerry George, and I'm glad you're here.**

CIBN stands for Collaborative International Business Network.

CIBN Connect helps entrepreneurs, professionals, and business owners build trusted relationships, collaborating partnerships, warmed-up referrals, and revenue in a more intentional way.

This hub is here to help you explore CIBN, understand how it works, and make better use of everything available inside the community.

**Where would you like to start?**

1. Explore CIBN
2. I'm a Member
3. Tools
4. Training`
  );
}

function mainMenu(): string {
  return withCtx(
    "main",
    `**Where would you like to start?**

1. Explore CIBN
2. I'm a Member
3. Tools
4. Training`
  );
}

function exploringMenu(): string {
  return withCtx(
    "exploring",
    `**Explore CIBN**

A. What is CIBN?
B. Is CIBN a Good Fit for Me?
C. Membership Options`
  );
}

function whatIsCibnMenu(): string {
  return withCtx(
    "exploring>what",
    `**What is CIBN?**

1. Short Definition
2. Core Philosophy
3. How It Works`
  );
}

function fitMenu(): string {
  return withCtx(
    "exploring>fit",
    `**Is CIBN a Good Fit for Me?**

1. Take the CIBN Fit Quiz
2. View CIBN Fit Quiz Summary`
  );
}

function membershipMenu(): string {
  return withCtx(
    "exploring>membership",
    `**Membership Options**

1. Types of Memberships
2. Membership Quiz / Summary`
  );
}

function memberMenu(): string {
  return withCtx(
    "member",
    `**I'm a Member**

A. Getting Started
B. Member Navigation Help
C. Collaboration & Referral Growth
D. Member Events Info`
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

function first48HoursMenu(): string {
  return withCtx(
    "member>start>48hours",
    `**First 48 Hours**

A. Schedule Your Onboarding Call
B. Install the Chrome Extension
C. Update Your LinkedIn Profile`
  );
}

function first30DaysMenu(): string {
  return withCtx(
    "member>start>30days",
    `**First 30 Days**

1. Attend Networking Opportunities
2. Schedule One-on-One Meetings
3. Begin Referral Activity`
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

A. Collaboration Strategy
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

function memberGrowthMenu(): string {
  return withCtx(
    "member>growth",
    `**Collaboration & Referral Growth**

1. Improve My Results
2. Collaborating Partners
3. Referral Growth`
  );
}

function toolsTopMenu(): string {
  return withCtx(
    "tools",
    `**Tools**

A. Chrome Extension
B. LinkedIn
C. Meetn
D. Nolodex`
  );
}

function chromeExtensionMenu(): string {
  return withCtx(
    "tools>chrome",
    `**Chrome Extension**

A. Match Me
B. Golden Recommendation
C. Trusted Connections`
  );
}

function trainingTopMenu(): string {
  return withCtx(
    "training",
    `**Training**

A. Training Programs & Membership Levels
B. Speaker Level Membership
C. Sales Pro Training
D. Training for Serious Networkers
E. Quarter Launch
F. Excalibur MasterMind
G. Community Builders Program
H. Video Training Library`
  );
}

function fitQuizIntro(): string {
  return withCtx(
    "quiz>fit>intro",
    `**CIBN Fit Quiz**

This quick quiz helps you see whether CIBN's style of networking fits how you want to grow.

I'll ask 6 questions, one at a time. Click or type your answer number and I'll give you a personalised summary at the end.

1. Start the Quiz`
  );
}

function membershipQuizIntro(): string {
  return withCtx(
    "quiz>membership>intro",
    `**Membership Quiz**

This quiz asks 6 questions, one at a time.

Choose the answer that fits you best and I will give you a summary at the end.

1. Start the Quiz`
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

function collectSequentialQuizAnswers(
  history: ChatMessage[],
  prefix: string
): number[] {
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
    recommendation = "CIBN sounds like a very strong fit for you.";
    reason =
      "Your answers suggest that you value trusted relationships, collaborating partners, and a more intentional networking system — which aligns closely with how CIBN works.";
  }

  return withCtx(
    "quiz>fit>summary",
    `**CIBN Fit Quiz — Your Results**

${recommendation}

**Why this fits you**
${reason}

**Ready to explore membership?**

1. Membership Options
2. Book a Tour
3. Main Menu`
  );
}

function membershipQuizSummary(history: ChatMessage[]): string {
  const answers = collectSequentialQuizAnswers(history, "quiz>membership>");
  const scores = { networker: 0, speaker: 0, salesPro: 0 };

  for (const answer of answers) {
    if (answer === 1) scores.networker += 2;
    if (answer === 2) scores.speaker += 2;
    if (answer === 3) scores.salesPro += 2;
    if (answer === 4) {
      scores.networker += 1;
      scores.speaker += 1;
      scores.salesPro += 1;
    }
  }

  const top = Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];

  let recommendation = "Networker";
  let reason =
    "Your answers suggest that building trusted referral relationships is the strongest fit right now.";

  if (top === "speaker") {
    recommendation = "Speaker";
    reason =
      "Your answers suggest that sharing expertise, speaking visibility, and authority-building are the strongest fit right now.";
  } else if (top === "salesPro") {
    recommendation = "Sales Pro";
    reason =
      "Your answers suggest that stronger business conversations and sales-focused growth are the strongest fit right now.";
  }

  return withCtx(
    "quiz>membership>summary",
    `**Membership Quiz — Your Results**

**Recommended Path**
${recommendation}

**Why**
${reason}

**Join Options**

1. Networker — ${URLS.networkerJoin}
2. Speaker — ${URLS.speakerJoin}
3. Sales Pro — ${URLS.salesProJoin}
4. Book a Tour — ${URLS.booking}
5. Main Menu`
  );
}

function parentOf(ctx: string): string {
  if (!ctx) return "main";
  if (ctx.endsWith(">deeper")) return ctx.replace(/>deeper$/, "");
  if (ctx === "welcome") return "main";
  if (ctx === "main") return "main";
  if (ctx === "exploring") return "main";
  if (ctx === "exploring>fit") return "exploring";
  if (ctx === "exploring>membership") return "exploring";
  if (ctx === "member") return "main";
  if (ctx === "tools") return "main";
  if (ctx === "training") return "main";
  if (ctx === "quiz>fit>intro" || ctx === "quiz>fit>summary") return "exploring>fit";
  if (
    ctx === "quiz>membership>intro" ||
    ctx === "quiz>membership>summary"
  ) {
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
    case "tools":
      return toolsTopMenu();
    case "tools>chrome":
      return chromeExtensionMenu();
    case "training":
      return trainingTopMenu();
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
        if (!Number.isNaN(q) && q >= 1 && q <= 6) {
          return fitQuizQuestion(q);
        }
      }

      if (ctx.startsWith("quiz>membership>")) {
        const q = Number(ctx.split(">")[2]);
        if (!Number.isNaN(q) && q >= 1 && q <= 6) {
          return membershipQuizQuestion(q);
        }
      }

      return mainMenu();
  }
}

function topicFromContext(ctx: string): string | null {
  const map: Record<string, string> = {
    "member>growth>1": "How to Improve My Results in CIBN",
    "member>growth>2": "Collaborating Partners in CIBN",
    "member>growth>3": "Referral Growth in CIBN",
    "tools>b": "LinkedIn for CIBN Members",
    "tools>c": "Meetn",
    "tools>d": "Nolodex",
    "tools>chrome>a": "Chrome Extension: Match Me",
    "tools>chrome>b": "Chrome Extension: Golden Recommendation",
    "tools>chrome>c": "Chrome Extension: Trusted Connections",
    "member>help>flows>a": "One-on-One Prep",
    "member>help>flows>b": "Referral Conversations",
    "member>help>flows>c": "Follow-Up System",
    "member>help>marketing>a": "Collaboration Strategy",
    "member>help>marketing>b": "Referral Systems in CIBN",
    "member>help>marketing>c": "One Minute Infomercial",
    "member>help>trainingvideos>1": "Member Training",
    "member>help>trainingvideos>2": "Courses",
    "member>start>48hours>a": "How to Schedule Your CIBN Onboarding Call",
    "member>start>48hours>b": "How to Install the CIBN Chrome Extension",
    "member>start>48hours>c": "How to Update Your LinkedIn Profile for CIBN",
    "member>start>30days>1": "How to Attend Networking Opportunities",
    "member>start>30days>2": "How to Schedule One-on-One Meetings",
    "member>start>30days>3": "How to Begin Referral Activity",
    "training>a": "Training Programs and Membership Levels",
    "training>b": "Speaker Level Membership",
    "training>c": "Sales Pro Training",
    "training>d": "Training for Serious Networkers",
    "training>e": "Quarter Launch",
    "training>f": "Excalibur MasterMind",
    "training>g": "Community Builders Program",
    "training>h": "Video Training Library",
    "member>d": "Member Events and Networking Groups",
  };

  return map[ctx] || null;
}

function stripCtxTag(text: string): string {
  return text.replace(/^\[\[CTX:[^\]]+\]\]\n?/, "").trim();
}

function buildNextMenu(parentCtx: string): string {
  const parentMenu = stripCtxTag(renderContextMenu(parentCtx));
  return `**What would you like to do next?**\n\n${parentMenu}`;
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
    const lower = message.toLowerCase().trim();
    const ctx = lastAssistantContext(history);
    const knowledge = buildKnowledgeBlock();

    if (!message) {
      return Response.json({ text: welcomeScreen() });
    }

    if (lower === "start here") {
      return Response.json({ text: welcomeScreen() });
    }

    if (lower === "main" || lower === "main menu") {
      return Response.json({ text: mainMenu() });
    }

    if (lower === "back") {
      const target = parentOf(ctx);
      return Response.json({ text: renderContextMenu(target, history) });
    }

    if (lower === "dig deeper") {
      const topic = topicFromContext(ctx);
      const parentCtx = parentOf(ctx);

      if (topic) {
        const text = await aiSectionAnswer(
          topic,
          history,
          "Dig deeper into this topic.",
          knowledge,
          "Go one level deeper than before. Be thorough and specific. Use bold section titles only. Include practical steps and examples."
        );

        const withMenu = appendNextSteps(text, buildNextMenu(parentCtx));
        return Response.json({ text: withCtx(`${ctx}>deeper`, withMenu) });
      }

      const text = await aiSectionAnswer(
        "Current CIBN topic",
        history,
        "Dig deeper into the current topic.",
        knowledge,
        "Use the recent conversation to deepen the most recent topic. Be specific, practical, and thorough. Use bold section titles only."
      );

      const withMenu = appendNextSteps(text, buildNextMenu(parentCtx));
      return Response.json({ text: withCtx(`${ctx}>deeper`, withMenu) });
    }

    if (lower === "member events info") {
      const text = await aiSectionAnswer(
        "Member Events and Networking Groups",
        history,
        message,
        knowledge,
        `Give public-facing information about member events and networking groups.
Explain what they are, how they help, and what someone can understand without member login.
If the knowledge includes registration info for networking events, include:
${URLS.events}
Do not expose private links or member-only access.`,
        true
      );
      const withMenu = appendNextSteps(text, buildNextMenu("member"));
      return Response.json({ text: withCtx("member>d", withMenu) });
    }

    if (lower === "video training library") {
      const text = await aiSectionAnswer(
        "Video Training Library",
        history,
        message,
        knowledge,
        `Use the video library rules exactly.
- Answer the user's question first
- Recommend videos only when helpful
- Keep recommendations focused
- Public videos may include direct links if the knowledge provides them
- Member-only videos must not include direct links
- Member-only videos must direct users to:
${URLS.site}
Use bold section titles.`,
        true
      );
      const withMenu = appendNextSteps(text, buildNextMenu("training"));
      return Response.json({ text: withCtx("training>h", withMenu) });
    }

    if (ctx === "welcome" || ctx === "main") {
      if (lower === "1") return Response.json({ text: exploringMenu() });
      if (lower === "2") return Response.json({ text: memberMenu() });
      if (lower === "3") return Response.json({ text: toolsTopMenu() });
      if (lower === "4") return Response.json({ text: trainingTopMenu() });
    }

    if (ctx === "exploring") {
      if (lower === "a" || lower === "1") {
        return Response.json({ text: whatIsCibnMenu() });
      }
      if (lower === "b" || lower === "2") {
        return Response.json({ text: fitMenu() });
      }
      if (lower === "c" || lower === "3") {
        return Response.json({ text: membershipMenu() });
      }
    }

    if (ctx === "exploring>what") {
      if (lower === "1") {
        const withMenu = appendNextSteps(
          DIRECT_EXPLORE_ANSWERS.shortDefinition,
          buildNextMenu("exploring>what")
        );
        return Response.json({ text: withCtx("exploring>what>1", withMenu) });
      }

      if (lower === "2") {
        const withMenu = appendNextSteps(
          DIRECT_EXPLORE_ANSWERS.corePhilosophy,
          buildNextMenu("exploring>what")
        );
        return Response.json({ text: withCtx("exploring>what>2", withMenu) });
      }

      if (lower === "3") {
        const withMenu = appendNextSteps(
          DIRECT_EXPLORE_ANSWERS.howItWorks,
          buildNextMenu("exploring>what")
        );
        return Response.json({ text: withCtx("exploring>what>3", withMenu) });
      }
    }

    if (ctx === "exploring>fit") {
      if (lower === "1") {
        return Response.json({ text: fitQuizIntro() });
      }
      if (lower === "2") {
        return Response.json({ text: fitQuizSummary(history) });
      }
    }

    if (ctx === "exploring>membership") {
      if (lower === "1") {
        const text = await aiSectionAnswer(
          "Types of CIBN Membership",
          history,
          message,
          knowledge,
          `Give a thorough explanation of the three CIBN membership types: Networker, Speaker, and Sales Pro.
For each one describe who it is for, what it includes, and the key benefits.
Use bold section titles.
End with join links exactly like this:

**Join Options**
- Networker: ${URLS.networkerJoin}
- Speaker: ${URLS.speakerJoin}
- Sales Pro: ${URLS.salesProJoin}
- Book a Tour: ${URLS.booking}`
        );

        const withMenu = appendNextSteps(text, buildNextMenu("exploring>membership"));
        return Response.json({
          text: withCtx("exploring>membership>1", withMenu),
        });
      }

      if (lower === "2") {
        return Response.json({ text: membershipQuizIntro() });
      }
    }

    if (ctx === "quiz>fit>intro") {
      if (lower === "1" || lower === "go") {
        return Response.json({ text: fitQuizQuestion(1) });
      }
      return Response.json({ text: fitQuizIntro() });
    }

    if (
      ctx.startsWith("quiz>fit>") &&
      ctx !== "quiz>fit>intro" &&
      ctx !== "quiz>fit>summary"
    ) {
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

    if (ctx === "quiz>fit>summary") {
      if (lower === "1") {
        return Response.json({ text: membershipMenu() });
      }
      if (lower === "2") {
        return Response.json({
          text: withCtx(
            "quiz>fit>summary>tour",
            `**Book a Tour**

The best next step is to book a tour here:
${URLS.booking}`
          ),
        });
      }
      if (lower === "3") return Response.json({ text: mainMenu() });
    }

    if (ctx === "quiz>membership>intro") {
      if (lower === "1" || lower === "go") {
        return Response.json({ text: membershipQuizQuestion(1) });
      }
      return Response.json({ text: membershipQuizIntro() });
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

    if (ctx === "quiz>membership>summary") {
      if (lower === "5") return Response.json({ text: mainMenu() });
    }

    if (ctx === "member") {
      if (lower === "a" || lower === "1") {
        return Response.json({ text: gettingStartedMenu() });
      }
      if (lower === "b" || lower === "2") {
        return Response.json({ text: memberHelpMenu() });
      }
      if (lower === "c" || lower === "3") {
        return Response.json({ text: memberGrowthMenu() });
      }
      if (lower === "d" || lower === "4") {
        const text = await aiSectionAnswer(
          "Member Events and Networking Groups",
          history,
          message,
          knowledge,
          `Give public-facing information about member events and networking groups.
Explain what they are, how they help, and what someone can understand without member login.
If the knowledge includes registration info for networking events, include:
${URLS.events}
Do not expose private links or member-only access.`,
          true
        );

        const withMenu = appendNextSteps(text, buildNextMenu("member"));
        return Response.json({ text: withCtx("member>d", withMenu) });
      }
    }

    if (ctx === "member>start") {
      if (lower === "1") return Response.json({ text: first48HoursMenu() });
      if (lower === "2") return Response.json({ text: first30DaysMenu() });

      if (lower === "3") {
        const text = await aiSectionAnswer(
          "Onboarding Help for New CIBN Members",
          history,
          message,
          knowledge,
          `Give thorough onboarding guidance. Include practical steps.
Include: Book a tour: ${URLS.booking}
Use bold section titles.`
        );

        const withMenu = appendNextSteps(text, buildNextMenu("member>start"));
        return Response.json({ text: withCtx("member>start>onboarding", withMenu) });
      }
    }

    if (ctx === "member>start>48hours") {
      const topics: Record<string, string> = {
        a: "How to Schedule Your CIBN Onboarding Call",
        b: "How to Install the CIBN Chrome Extension",
        c: "How to Update Your LinkedIn Profile for CIBN",
      };

      if (topics[lower]) {
        const text = await aiSectionAnswer(
          topics[lower],
          history,
          message,
          knowledge,
          "Give complete, step-by-step guidance. Use bold section titles. Be thorough and practical."
        );

        const withMenu = appendNextSteps(text, buildNextMenu("member>start>48hours"));
        return Response.json({
          text: withCtx(`member>start>48hours>${lower}`, withMenu),
        });
      }
    }

    if (ctx === "member>start>30days") {
      const topics: Record<string, string> = {
        "1": "How to Attend Networking Opportunities",
        "2": "How to Schedule One-on-One Meetings",
        "3": "How to Begin Referral Activity",
      };

      if (topics[lower]) {
        const text = await aiSectionAnswer(
          topics[lower],
          history,
          message,
          knowledge,
          "Give complete, practical guidance. Use bold section titles. Include specific steps and tips."
        );

        const withMenu = appendNextSteps(text, buildNextMenu("member>start>30days"));
        return Response.json({
          text: withCtx(`member>start>30days>${lower}`, withMenu),
        });
      }
    }

    if (ctx === "member>help") {
      if (lower === "a" || lower === "1") {
        return Response.json({ text: networkingFlowsMenu() });
      }
      if (lower === "b" || lower === "2") {
        return Response.json({ text: marketingMenu() });
      }
      if (lower === "c" || lower === "3") {
        return Response.json({ text: memberTrainingVideosMenu() });
      }
    }

    if (ctx === "member>help>flows") {
      const topics: Record<string, string> = {
        a: "One-on-One Prep for CIBN Members",
        b: "Referral Conversations in CIBN",
        c: "Follow-Up System for CIBN Members",
      };

      if (topics[lower]) {
        const text = await aiSectionAnswer(
          topics[lower],
          history,
          message,
          knowledge,
          "Give complete, practical guidance. Use bold section titles. Include specific steps and examples."
        );

        const withMenu = appendNextSteps(text, buildNextMenu("member>help>flows"));
        return Response.json({
          text: withCtx(`member>help>flows>${lower}`, withMenu),
        });
      }
    }

    if (ctx === "member>help>marketing") {
      const topics: Record<string, string> = {
        a: "Collaboration Strategy",
        b: "Referral Systems in CIBN",
        c: "One Minute Infomercial",
      };

      if (topics[lower]) {
        const text = await aiSectionAnswer(
          topics[lower],
          history,
          message,
          knowledge,
          "Give a thorough, complete explanation. Use bold section titles. Include specific steps and examples. Do not send users to an events page for collaboration or referral relationship guidance."
        );

        const withMenu = appendNextSteps(text, buildNextMenu("member>help>marketing"));
        return Response.json({
          text: withCtx(`member>help>marketing>${lower}`, withMenu),
        });
      }
    }

    if (ctx === "member>help>trainingvideos") {
      if (lower === "1") {
        const text = await aiSectionAnswer(
          "Member Training in CIBN",
          history,
          message,
          knowledge,
          `Give a thorough overview of member training options.
Include the YouTube training channel: ${URLS.youtube}
Use bold section titles.`
        );

        const withMenu = appendNextSteps(text, buildNextMenu("member>help>trainingvideos"));
        return Response.json({
          text: withCtx("member>help>trainingvideos>1", withMenu),
        });
      }

      if (lower === "2") {
        const text = await aiSectionAnswer(
          "CIBN Courses",
          history,
          message,
          knowledge,
          "Give complete information about available CIBN courses. Use bold section titles."
        );

        const withMenu = appendNextSteps(text, buildNextMenu("member>help>trainingvideos"));
        return Response.json({
          text: withCtx("member>help>trainingvideos>2", withMenu),
        });
      }

      if (lower === "3") {
        const text = await aiSectionAnswer(
          "Member-Only Videos",
          history,
          message,
          knowledge,
          "List the member-only video titles and short descriptions only. Never show private links. Always direct members to log in at cibnconnect.com to access them.",
          true
        );

        const withMenu = appendNextSteps(text, buildNextMenu("member>help>trainingvideos"));
        return Response.json({
          text: withCtx("member>help>trainingvideos>3", withMenu),
        });
      }
    }

    if (ctx === "member>growth") {
      const topics: Record<string, string> = {
        "1": "How to Improve My Results in CIBN",
        "2": "Collaborating Partners in CIBN",
        "3": "Referral Growth in CIBN",
      };

      if (topics[lower]) {
        const text = await aiSectionAnswer(
          topics[lower],
          history,
          message,
          knowledge,
          "Give a thorough, complete answer. Use bold section titles. Include practical steps and examples. Do not send users to an events page for collaboration or referral relationship guidance."
        );

        const withMenu = appendNextSteps(text, buildNextMenu("member>growth"));
        return Response.json({
          text: withCtx(`member>growth>${lower}`, withMenu),
        });
      }
    }

    if (ctx === "tools") {
      if (lower === "a" || lower === "1") {
        return Response.json({ text: chromeExtensionMenu() });
      }

      if (lower === "b" || lower === "2") {
        const text = await aiSectionAnswer(
          "LinkedIn for CIBN Members",
          history,
          message,
          knowledge,
          "Give thorough guidance on how CIBN members use LinkedIn. Include the Chrome Extension connection. Use bold section titles. Do not drift into training-program answers."
        );

        const withMenu = appendNextSteps(text, buildNextMenu("tools"));
        return Response.json({ text: withCtx("tools>b", withMenu) });
      }

      if (lower === "c" || lower === "3") {
        const text = await aiSectionAnswer(
          "Meetn",
          history,
          message,
          knowledge,
          `Explain what Meetn is and how it is used as a platform option inside the CIBN ecosystem.

Important facts about Meetn:
- Meetn is a meeting platform option
- It is not a collaboration strategy answer
- It is not referral guidance
- CIBN members may receive a special discount

Use bold section titles.

Include both links exactly like this:

**Meetn Discount for CIBN Members:**
${URLS.meetn}

**Meetn Terms of Service:**
${URLS.meetnTerms}`
        );

        const withMenu = appendNextSteps(text, buildNextMenu("tools"));
        return Response.json({ text: withCtx("tools>c", withMenu) });
      }

      if (lower === "d" || lower === "4") {
        const text = await aiSectionAnswer(
          "Nolodex for CIBN Members",
          history,
          message,
          knowledge,
          "Give thorough information about Nolodex — what it is, how members use it, and why it matters. Use bold section titles. Do not drift into training-program answers."
        );

        const withMenu = appendNextSteps(text, buildNextMenu("tools"));
        return Response.json({ text: withCtx("tools>d", withMenu) });
      }
    }

    if (ctx === "tools>chrome") {
      const topics: Record<string, string> = {
        a: "Chrome Extension: Match Me Feature",
        b: "Chrome Extension: Golden Recommendation Feature",
        c: "Chrome Extension: Trusted Connections Feature",
      };

      if (topics[lower]) {
        const text = await aiSectionAnswer(
          topics[lower],
          history,
          message,
          knowledge,
          "Give a thorough, complete explanation. Include what this feature does, how to use it, and why it matters. Use bold section titles."
        );

        const withMenu = appendNextSteps(text, buildNextMenu("tools>chrome"));
        return Response.json({
          text: withCtx(`tools>chrome>${lower}`, withMenu),
        });
      }
    }

    if (ctx === "training") {
      const prompts: Record<string, { topic: string; memberOnly?: boolean; extra: string; next: string }> = {
        a: {
          topic: "Training Programs and Membership Levels",
          extra:
            "Give a thorough overview of the current CIBN training programs, membership levels, associated pricing, who each is best for, and what each includes. Use bold section titles.",
          next: "training>a",
        },
        b: {
          topic: "Speaker Level Membership",
          extra:
            "Give a thorough overview of Speaker Level Membership, including benefits, bonuses, what it is best for, and what training is included. Use bold section titles.",
          next: "training>b",
        },
        c: {
          topic: "Sales Pro Training",
          extra:
            "Give a thorough overview of Sales Pro Training, including pricing, what it covers, and who it is for. Use bold section titles.",
          next: "training>c",
        },
        d: {
          topic: "Training for Serious Networkers",
          extra:
            "Give a thorough overview of Training for Serious Networkers, including pricing, who it is for, and what it helps with. Use bold section titles.",
          next: "training>d",
        },
        e: {
          topic: "Quarter Launch",
          extra:
            "Give a thorough overview of Quarter Launch, including pricing, what is included, why it is structured around 90 days, and who it is for. Use bold section titles.",
          next: "training>e",
        },
        f: {
          topic: "Excalibur MasterMind",
          extra:
            "Give a thorough overview of Excalibur MasterMind, including who it is for, price, and the role Kerry George plays in it. Use bold section titles.",
          next: "training>f",
        },
        g: {
          topic: "Community Builders Program",
          extra:
            "Give a thorough overview of the Community Builders Program, including systems, tools, included training, pricing guidance, and who it is for. Use bold section titles.",
          next: "training>g",
        },
        h: {
          topic: "Video Training Library",
          extra:
            `Use the video library rules exactly.
- Answer the user's question first
- Recommend videos only when helpful
- Keep recommendations focused
- Public videos may include direct links if the knowledge provides them
- Member-only videos must not include direct links
- Member-only videos must direct users to:
${URLS.site}
Use bold section titles.`,
          next: "training>h",
          memberOnly: true,
        },
      };

      const selected = prompts[lower];
      if (selected) {
        const text = await aiSectionAnswer(
          selected.topic,
          history,
          message,
          knowledge,
          selected.extra,
          selected.memberOnly ?? false
        );

        const withMenu = appendNextSteps(text, buildNextMenu("training"));
        return Response.json({ text: withCtx(selected.next, withMenu) });
      }

      if (["1", "2", "3", "4", "5", "6", "7", "8"].includes(lower)) {
        const letterMap: Record<string, string> = {
          "1": "a",
          "2": "b",
          "3": "c",
          "4": "d",
          "5": "e",
          "6": "f",
          "7": "g",
          "8": "h",
        };
        const selected = prompts[letterMap[lower]];
        const text = await aiSectionAnswer(
          selected.topic,
          history,
          message,
          knowledge,
          selected.extra,
          selected.memberOnly ?? false
        );

        const withMenu = appendNextSteps(text, buildNextMenu("training"));
        return Response.json({ text: withCtx(selected.next, withMenu) });
      }
    }

    if (lower.includes("infomercial") || lower.includes("testimonial")) {
      const text = await aiSectionAnswer(
        "Infomercials and testimonial styles in CIBN",
        history,
        message,
        knowledge,
        "Give thorough guidance on infomercial styles and testimonial types. List all styles clearly with descriptions. Use bold section titles."
      );

      const withMenu = appendNextSteps(text, buildNextMenu("member>help>marketing"));
      return Response.json({ text: withCtx("direct>infomercial", withMenu) });
    }

    if (lower.includes("golden recommendation")) {
      const text = await aiSectionAnswer(
        "Golden Recommendation in CIBN",
        history,
        message,
        knowledge,
        "Give a thorough explanation of the Golden Recommendation. Include what it is, how to give one, and why it matters. Use bold section titles."
      );

      const withMenu = appendNextSteps(text, buildNextMenu("tools>chrome"));
      return Response.json({ text: withCtx("direct>goldenrec", withMenu) });
    }

    if (lower.includes("meetn")) {
      const text = await aiSectionAnswer(
        "Meetn",
        history,
        message,
        knowledge,
        `Explain what Meetn is and how it is used as a platform option in the CIBN ecosystem.

Include: Meetn Discount: ${URLS.meetn}
Include: Meetn Terms: ${URLS.meetnTerms}
Use bold section titles.`
      );

      const withMenu = appendNextSteps(text, buildNextMenu("tools"));
      return Response.json({ text: withCtx("direct>meetn", withMenu) });
    }

    if (
      lower.includes("event") ||
      lower.includes("events") ||
      lower.includes("networking group") ||
      lower.includes("networking groups")
    ) {
      const text = await aiSectionAnswer(
        "Member Events and Networking Groups",
        history,
        message,
        knowledge,
        `Answer the user's event or networking-group question.
If the knowledge includes registration info for networking events, include:
${URLS.events}
Do not treat this as collaboration strategy or referral guidance unless the user is specifically asking for that.`
      );

      const withMenu = appendNextSteps(text, buildNextMenu(parentOf(ctx)));
      return Response.json({ text: withCtx("direct>events", withMenu) });
    }

    const fallback = await aiSectionAnswer(
      "General CIBN question",
      history,
      message,
      knowledge,
      "Give a thorough, complete, and helpful answer. Use bold section titles where appropriate. Include practical next steps. Do not send users to an events page for collaboration or referral relationship guidance unless the question is specifically about event or group information."
    );

    const withMenu = appendNextSteps(fallback, buildNextMenu(parentOf(ctx)));
    return Response.json({ text: withCtx("content", withMenu) });
  } catch (error) {
    console.error("Chat route error:", error);

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unknown server error occurred.",
      },
      { status: 500 }
    );
  }
}