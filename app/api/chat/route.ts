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

type TopicMap = Record<string, string>;

type CanonicalIntent =
  | "main"
  | "explore"
  | "member"
  | "tools"
  | "training"
  | "memberLogin"
  | "chromeExtension"
  | "videoTrainingLibrary"
  | "oneOnOne"
  | "fitQuiz"
  | "membershipQuiz"
  | "eventInvitations"
  | null;

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
  youtube: "https://www.youtube.com/c/CIBNTVCIBNConnectWithBusinessOwners",
  memberLogin: "https://cibnconnect.com",
  nolodex: "https://nolodex.com",
  inviteVideo1: "https://www.youtube.com/watch?v=qLpOEkj6mww&t=1s",
  inviteVideo2: "https://www.youtube.com/watch?v=FVCBApZ21J4",
  inviteVideo3: "https://www.youtube.com/watch?v=zqTn4La4Jl4",
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
  URLS.memberLogin,
  URLS.nolodex,
  URLS.inviteVideo1,
  URLS.inviteVideo2,
  URLS.inviteVideo3,
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
    prompt: "Which feels most natural for how you like to grow your business?",
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

const PUBLIC_YOUTUBE_VIDEOS = [
  {
    title: "CIBN YouTube Channel",
    url: URLS.youtube,
    description: "Main hub for public CIBN YouTube videos.",
  },
];

const MEMBER_ONLY_VIDEO_TOPICS = [
  "Member-only strategy walkthroughs",
  "Advanced referral system training",
  "Private implementation workshops",
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
- Never direct users to cibnconnect.com/login or any specific login path — always use ${URLS.site} for member access
- Remove unavailable external login directions and never send users to dead-end destinations

LinkedIn Connection Requests:
- Always recommend sending LinkedIn connection requests WITHOUT a message
- Sending too many connection requests with a message can result in LinkedIn flagging or restricting the account
- A clean, message-free request is the current best practice inside CIBN

Events Policy:
- Guests may attend networking events up to 3 times before needing to become a member
- After 3 visits, membership is required to continue attending

Do NOT:
- Hallucinate or invent facts or links
- Mention knowledge files in your answers
- Send users to an events page for collaboration or referral-relationship guidance
- Treat tools as training or training as tools

Formatting rules:
- Use bold ONLY for section titles
- Keep body text normal
- Use short, easy-to-scan sections with "-" bullets
- Always output full plain URLs so the page can make them clickable

Public links you may use:
- Main site: https://cibnconnect.com
- Member Access: https://cibnconnect.com
- Membership options: https://cibnconnect.com/membership-options
- Book a tour: https://api.leadconnectorhq.com/widget/groups/bookcibn
- Networking event registration: https://cibnconnect.com/events
- YouTube Training: https://www.youtube.com/c/CIBNTVCIBNConnectWithBusinessOwners
- Meetn: https://meetn.com/cibnspecial
- Meetn Terms: https://meetn.com/terms
- Join as Networker: https://link.fastpaydirect.com/payment-link/671e9c515146ea6e3f6c6953
- Join as Speaker: https://link.fastpaydirect.com/payment-link/671e9cbc43b93a0db2eb799e
- Join as Sales Pro: https://link.fastpaydirect.com/payment-link/671e9d1b43b93a56edeb79a2
- Nolodex: https://nolodex.com (terms and privacy policy can be found at nolodex.com)

Access rule:
- Anyone may view general information about events, groups, programs, or training topics if the knowledge includes it
- Never expose private member-only links
- For member-only access, say: "To access member-only materials, go to https://cibnconnect.com and log in from the main site."

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
  for (let i = history.length - 1; i >= 0; i -= 1) {
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

function sanitizeOutput(text: string, memberOnly = false): string {
  const urlRegex = /https?:\/\/[^\s)]+/g;

  let out = text.replace(urlRegex, (url) => {
    if (PUBLIC_URLS.has(url)) return url;
    if (url.includes("youtube.com") || url.includes("youtu.be")) return url;
    if (url.includes("nolodex.com")) return url;
    if (url.startsWith("https://cibnconnect.com")) return URLS.site;
    return "";
  });

  out = out.replace(/\n{3,}/g, "\n\n").trim();

  if (memberOnly && !out.includes(URLS.site)) {
    out = `${out}\n\nTo access member-only materials, go to ${URLS.site} and log in from the main site.`.trim();
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

---

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

This hub is here to help you explore CIBN, understand how it works, and make better use of the tools, training, and member resources.

---

1. Explore CIBN
2. I'm a Member
3. Tools
4. Training
5. Member Login`
  );
}

function mainMenu(): string {
  return withCtx(
    "main",
    `**Main Menu**

---

1. Explore CIBN
2. I'm a Member
3. Tools
4. Training
5. Member Login`
  );
}

function exploringMenu(): string {
  return withCtx(
    "exploring",
    `**Explore CIBN**

---

A. What is CIBN?
B. Is CIBN a Good Fit for Me?
C. Membership Options`
  );
}

function whatIsCibnMenu(): string {
  return withCtx(
    "exploring>what",
    `**What is CIBN?**

---

1. Short Definition
2. Core Philosophy
3. How It Works`
  );
}

function fitMenu(): string {
  return withCtx(
    "exploring>fit",
    `**Is CIBN a Good Fit for Me?**

---

1. Take the CIBN Fit Quiz`
  );
}

function membershipMenu(): string {
  return withCtx(
    "exploring>membership",
    `**Membership Options**

---

1. Types of Membership
2. Take the Membership Quiz`
  );
}

function memberMenu(): string {
  return withCtx(
    "member",
    `**I'm a Member**

---

1. Getting Started
2. Networking Flows
3. Networking Strategies`
  );
}

function gettingStartedMenu(): string {
  return withCtx(
    "member>start",
    `**Getting Started**

---

1. First 48 Hours
2. First 30 Days
3. Onboarding Help`
  );
}

function first48HoursMenu(): string {
  return withCtx(
    "member>start>48hours",
    `**First 48 Hours**

---

A. Schedule Your Onboarding Call
B. Install the Chrome Extension
C. Update Your LinkedIn Profile`
  );
}

function first30DaysMenu(): string {
  return withCtx(
    "member>start>30days",
    `**First 30 Days**

---

1. Attend Networking Opportunities
2. Schedule One-on-One Meetings
3. Begin Referral Activity`
  );
}

function networkingFlowsMenu(): string {
  return withCtx(
    "member>flows",
    `**Networking Flows**

---

A. One-on-One Prep
B. Referral Conversations
C. Follow-Up System`
  );
}

function strategiesMenu(): string {
  return withCtx(
    "member>strategies",
    `**Networking Strategies**

---

A. $150,000 Smart Networking
B. Collaborating Partners
C. Collaboration Strategy
D. Referral Systems
E. Referral Growth
F. One Minute Infomercial
G. Improve My Results`
  );
}
function toolsTopMenu(): string {
  return withCtx(
    "tools",
    `**Tools**

---

A. Chrome Extension
B. LinkedIn
C. Meetn
D. Nolodex`
  );
}

function trainingTopMenu(): string {
  return withCtx(
    "training",
    `**Training**

---

A. Membership Training
B. Membership Programs
C. Video Training Library`
  );
}

function membershipTrainingMenu(): string {
  return withCtx(
    "training>membership-training",
    `**Membership Training**

---

1. Networker Training
2. Speaker Training
3. Sales Pro Training`
  );
}

function membershipProgramsMenu(): string {
  return withCtx(
    "training>membership-programs",
    `**Membership Programs**

---

1. Quarter Launch
2. Excalibur MasterMind
3. Community Builders Program
4. Cohorts`
  );
}

function chromeExtensionPage(): string {
  return withCtx(
    "tools>chrome",
    `**CIBN Chrome Extension**

The CIBN Chrome Extension helps members identify collaboration and referral opportunities while using LinkedIn.

**What It Does**

- Helps surface useful relationship opportunities inside LinkedIn
- Supports collaboration-oriented networking
- Gives members a more practical workflow inside their day-to-day networking activity

**Why It Matters**

- It helps turn networking into a more intentional process
- It supports better follow-up and collaboration visibility
- It keeps Chrome extension questions routed to one canonical destination

**How to Install**

1. Open Google Chrome
2. Go to the Chrome Web Store
3. Search for "CIBN Connect"
4. Click "Add to Chrome"
5. Follow the prompts to install
6. Open LinkedIn after installation
7. Use your member access from ${URLS.site} if needed

---

A. Match Me
B. Trust-o-Meter
C. Golden Recommendation
D. Trusted Connections`
  );
}

function videoTrainingLibraryPage(): string {
  const publicLines = PUBLIC_YOUTUBE_VIDEOS.map(
    (video, index) =>
      `${index + 1}. ${video.title} — ${video.description}\n${video.url}`
  ).join("\n\n");

  const memberOnlyLines = MEMBER_ONLY_VIDEO_TOPICS.map(
    (topic, index) => `${index + 1}. ${topic}`
  ).join("\n");

  return withCtx(
    "training>video-library",
    `**Video Training Library**

**Public Videos**

${publicLines}

**All CIBN YouTube Videos**

- ${URLS.youtube}

**Member Only**

${memberOnlyLines}

**Member Access**

- Go to ${URLS.site} to log in from the main site.`
  );
}

function eventInvitationResource(): string {
  return withCtx(
    "resource>event-invitations",
    `**Inviting People to Your Event (Training Resources)**

Inviting is one of the most important skills in networking. Most people do not struggle with events — they struggle with how they invite. This is a skill inside the networking process, and these resources can help improve attendance and engagement.

**Videos**

1. ${URLS.inviteVideo1}
2. ${URLS.inviteVideo2}
3. ${URLS.inviteVideo3}

**Next Step**

Would you like a simple script or step-by-step process to use these strategies?`
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

  for (let i = 0; i < history.length; i += 1) {
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

---

1. View Membership Types
2. Take the Membership Quiz
3. Book a Tour
4. Back to Explore CIBN`
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

  const top = Object.entries(scores).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "networker";

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

---

1. View All Membership Types
2. Join Networker
3. Join Speaker
4. Join Sales Pro
5. Book a Tour
6. Back to Membership Options`
  );
}

function parentOf(ctx: string): string {
  if (!ctx) return "main";
  if (ctx.endsWith(">deeper")) return ctx.replace(/>deeper$/, "");
  if (ctx === "welcome" || ctx === "main" || ctx === "content") return "main";

  if (ctx === "exploring") return "main";
  if (
    ctx === "exploring>fit" ||
    ctx === "exploring>what" ||
    ctx === "exploring>membership"
  ) {
    return "exploring";
  }

  if (ctx === "member") return "main";
  if (
    ctx === "member>start" ||
    ctx === "member>flows" ||
    ctx === "member>strategies"
  ) {
    return "member";
  }

  if (ctx === "member>start>48hours" || ctx === "member>start>30days") {
    return "member>start";
  }

  if (ctx === "tools") return "main";
  if (ctx.startsWith("tools>")) return "tools";

  if (ctx === "training") return "main";
  if (ctx.startsWith("training>")) return "training";

  if (ctx === "quiz>fit>summary") return "exploring>fit";
  if (ctx === "quiz>membership>summary") return "exploring>membership";

  if (ctx.startsWith("quiz>fit>")) {
    const q = Number(ctx.split(">")[2]);
    if (q <= 1) return "exploring>fit";
    return `quiz>fit>${q - 1}`;
  }

  if (ctx.startsWith("quiz>membership>")) {
    const q = Number(ctx.split(">")[2]);
    if (q <= 1) return "exploring>membership";
    return `quiz>membership>${q - 1}`;
  }

  if (ctx === "member>flows>oneonone>step1") return "member>flows";
  if (ctx === "member>flows>oneonone>step2") return "member>flows>oneonone>step1";
  if (ctx === "member>flows>oneonone>dashboard") return "member>flows";
  if (ctx === "resource>event-invitations") return "training";

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
    case "member>flows":
      return networkingFlowsMenu();
    case "member>strategies":
      return strategiesMenu();
    case "member>start>48hours":
      return first48HoursMenu();
    case "member>start>30days":
      return first30DaysMenu();
    case "tools":
      return toolsTopMenu();
    case "tools>chrome":
      return chromeExtensionPage();
    case "training":
      return trainingTopMenu();
    case "training>membership-training":
      return membershipTrainingMenu();
    case "training>membership-programs":
      return membershipProgramsMenu();
    case "training>video-library":
      return videoTrainingLibraryPage();
    case "quiz>fit>summary":
      return fitQuizSummary(history);
    case "quiz>membership>summary":
      return membershipQuizSummary(history);
    case "resource>event-invitations":
      return eventInvitationResource();
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
  const map: TopicMap = {
    "member>strategies>a": "$150,000 Smart Networking",
    "member>strategies>b": "Collaborating Partners in CIBN",
    "member>strategies>c": "Collaboration Strategy",
    "member>strategies>d": "Referral Systems in CIBN",
    "member>strategies>e": "Referral Growth in CIBN",
    "member>strategies>f": "One Minute Infomercial",
    "member>strategies>g": "How to Improve My Results in CIBN",
    "tools>b": "LinkedIn for CIBN Members",
    "tools>c": "Meetn",
    "tools>d": "Nolodex",
    "tools>chrome>a": "Chrome Extension: Match Me",
    "tools>chrome>b": "Chrome Extension: Trust-o-Meter",
    "tools>chrome>c": "Chrome Extension: Golden Recommendation",
    "tools>chrome>d": "Chrome Extension: Trusted Connections",
    "member>flows>b": "Referral Conversations in CIBN",
    "member>flows>c": "Follow-Up System for CIBN Members",
    "member>start>48hours>c": "How to Update Your LinkedIn Profile for CIBN",
    "member>start>30days>1": "How to Attend Networking Opportunities",
    "member>start>30days>2": "How to Schedule One-on-One Meetings",
    "member>start>30days>3": "How to Begin Referral Activity",
    "training>membership-training>1": "Networker Training",
    "training>membership-training>2": "Speaker Training",
    "training>membership-training>3": "Sales Pro Training",
    "training>membership-programs>1": "Quarter Launch",
    "training>membership-programs>2": "Excalibur MasterMind",
    "training>membership-programs>3": "Community Builders Program",
    "training>membership-programs>4": "Cohorts",
    "resource>event-invitations": "Inviting People to Your Event",
  };

  return map[ctx] || null;
}

function stripCtxTag(text: string): string {
  return text.replace(/^\[\[CTX:[^\]]+\]\]\n?/, "").trim();
}

function buildNextMenu(parentCtx: string, history: ChatMessage[] = []): string {
  const parentMenu = stripCtxTag(renderContextMenu(parentCtx, history));
  return `**What would you like to do next?**

${parentMenu}`;
}

function normalizeNaturalText(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s\-]/g, " ").replace(/\s+/g, " ").trim();
}

function resolveCanonicalIntent(lower: string): CanonicalIntent {
  if (lower === "main" || lower === "main menu" || lower === "menu") return "main";
  if (lower === "explore cibn" || lower === "explore") return "explore";
  if (
  lower === "i m a member" ||
  lower === "im a member" ||
  lower === "i'm a member"
) {
  return "member";
}
  if (lower === "tools") return "tools";
  if (lower === "training") return "training";
  if (lower === "member login" || lower === "login") return "memberLogin";

  if (
    lower.includes("chrome extension") ||
    lower === "extension" ||
    lower.includes("install the chrome extension") ||
    lower.includes("install chrome extension")
  ) {
    return "chromeExtension";
  }

  if (lower.includes("video training library") || lower.includes("video library") || lower === "video") {
    return "videoTrainingLibrary";
  }

  if (
    lower.includes("one-on-one") ||
    lower.includes("one on one") ||
    lower.includes("1-on-1") ||
    lower.includes("prep for my meeting") ||
    lower.includes("meeting prep")
  ) {
    return "oneOnOne";
  }

  if (lower.includes("take the cibn fit quiz") || lower === "fit quiz") return "fitQuiz";
  if (lower.includes("take the membership quiz") || lower === "membership quiz") return "membershipQuiz";

  if (isEventInvitationIntent(lower)) return "eventInvitations";

  return null;
}

function isMeaningfulPersonInfo(message: string): boolean {
  const hasUrl = /https?:\/\//i.test(message) || /linkedin\.com/i.test(message);
  const enoughWords = message.trim().split(/\s+/).filter(Boolean).length >= 8;
  return hasUrl || enoughWords;
}

function isEventInvitationIntent(lower: string): boolean {
  return [
    "how to invite people",
    "how to get more attendees",
    "inviting to events",
    "event attendance",
    "getting people to show up",
    "promoting an event",
    "how to fill an event",
    "how do i invite people",
    "how do i get more attendees",
    "invite people",
    "get more attendees",
    "get people to show up",
    "promote an event",
    "fill an event",
  ].some((phrase) => lower.includes(phrase));
}

async function membershipTypesContent(
  history: ChatMessage[],
  message: string,
  knowledge: string
): Promise<string> {
  return aiSectionAnswer(
    "Types of CIBN Membership",
    history,
    message,
    knowledge,
    `Give a thorough explanation of the three CIBN membership types: Networker, Speaker, and Sales Pro.

For each one describe who it is for, what it includes, and the key benefits.

Use bold section titles.

End exactly with this section:

**Join Options**

- Networker: ${URLS.networkerJoin}
- Speaker: ${URLS.speakerJoin}
- Sales Pro: ${URLS.salesProJoin}
- Book a Tour: ${URLS.booking}`
  );
}

function contextualTokenSelection(ctx: string, lower: string): string | null {
  const token = lower.trim();
  if (!token) return null;

  const singleToken = /^([a-z]|\d+)$/.test(token);
  if (!singleToken) return null;

  switch (ctx) {
    case "welcome":
    case "main":
      return token;
    case "exploring":
    case "exploring>what":
    case "exploring>fit":
    case "exploring>membership":
    case "member":
    case "member>start":
    case "member>start>48hours":
    case "member>start>30days":
    case "member>flows":
    case "member>strategies":
    case "tools":
    case "tools>chrome":
    case "training":
    case "training>membership-training":
    case "training>membership-programs":
    case "quiz>fit>summary":
    case "quiz>membership>summary":
      return token;
    default:
      if (ctx.startsWith("quiz>fit>") || ctx.startsWith("quiz>membership>")) {
        return token;
      }
      return null;
  }
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
    const lower = normalizeNaturalText(message);
    const rawLower = message.toLowerCase().trim();
    const ctx = lastAssistantContext(history);
    const knowledge = buildKnowledgeBlock();

    if (!message) {
      return Response.json({ text: welcomeScreen() });
    }

    if (rawLower === "start here") {
      return Response.json({ text: welcomeScreen() });
    }

    if (rawLower === "back") {
      const target = parentOf(ctx);
      return Response.json({ text: renderContextMenu(target, history) });
    }

    const stateToken = contextualTokenSelection(ctx, rawLower);
    const canonicalIntent = stateToken ? null : resolveCanonicalIntent(lower);

    if (canonicalIntent === "main") {
      return Response.json({ text: mainMenu() });
    }

    if (canonicalIntent === "memberLogin") {
      return Response.json({
        text: withCtx(
          "member-login",
          `**Member Login**

Go to ${URLS.site} and log in from the main site.`
        ),
      });
    }

    if (canonicalIntent === "chromeExtension") {
      return Response.json({ text: chromeExtensionPage() });
    }

    if (canonicalIntent === "videoTrainingLibrary") {
      return Response.json({ text: videoTrainingLibraryPage() });
    }

    if (canonicalIntent === "oneOnOne") {
      return Response.json({
        text: withCtx(
          "member>flows>oneonone>step1",
          `**One-on-One Preparation — Step 1 of 3**

One-on-one meetings are one of the most important activities in CIBN.

**Before we build your prep dashboard, I need information about the person you are meeting.**

Please paste any of the following:

- Their LinkedIn profile URL or About section
- Their website or bio
- Their services and who they serve
- Any notes from a previous conversation

A LinkedIn profile alone is usually enough to get started.

**Note:** This step is required. I will not move forward until you share information about your contact.`
        ),
      });
    }

    if (canonicalIntent === "fitQuiz") {
      return Response.json({ text: fitQuizQuestion(1) });
    }

    if (canonicalIntent === "membershipQuiz") {
      return Response.json({ text: membershipQuizQuestion(1) });
    }

    if (canonicalIntent === "eventInvitations") {
      return Response.json({ text: eventInvitationResource() });
    }

    if (canonicalIntent === "explore") {
      return Response.json({ text: exploringMenu() });
    }

    if (canonicalIntent === "member") {
      return Response.json({ text: memberMenu() });
    }

    if (canonicalIntent === "tools") {
      return Response.json({ text: toolsTopMenu() });
    }

    if (canonicalIntent === "training") {
      return Response.json({ text: trainingTopMenu() });
    }

    if (ctx === "welcome" || ctx === "main") {
      if (rawLower === "1") {
        return Response.json({ text: exploringMenu() });
      }
      if (rawLower === "2") {
        return Response.json({ text: memberMenu() });
      }
      if (rawLower === "3") {
        return Response.json({ text: toolsTopMenu() });
      }
      if (rawLower === "4") {
        return Response.json({ text: trainingTopMenu() });
      }
      if (rawLower === "5") {
        return Response.json({
          text: withCtx(
            "member-login",
            `**Member Login**

Go to ${URLS.site} and log in from the main site.`
          ),
        });
      }
    }

    if (ctx === "exploring") {
      if (rawLower === "a" || rawLower === "1" || lower === "what is cibn") {
        return Response.json({ text: whatIsCibnMenu() });
      }
      if (
        rawLower === "b" ||
        rawLower === "2" ||
        lower === "is cibn a good fit for me"
      ) {
        return Response.json({ text: fitMenu() });
      }
      if (rawLower === "c" || rawLower === "3" || lower === "membership options") {
        return Response.json({ text: membershipMenu() });
      }
    }

    if (ctx === "exploring>what") {
      if (rawLower === "1" || lower === "short definition") {
        const withMenu = appendNextSteps(
          DIRECT_EXPLORE_ANSWERS.shortDefinition,
          buildNextMenu("exploring>what", history)
        );
        return Response.json({ text: withCtx("exploring>what>1", withMenu) });
      }

      if (rawLower === "2" || lower === "core philosophy") {
        const withMenu = appendNextSteps(
          DIRECT_EXPLORE_ANSWERS.corePhilosophy,
          buildNextMenu("exploring>what", history)
        );
        return Response.json({ text: withCtx("exploring>what>2", withMenu) });
      }

      if (rawLower === "3" || lower === "how it works") {
        const withMenu = appendNextSteps(
          DIRECT_EXPLORE_ANSWERS.howItWorks,
          buildNextMenu("exploring>what", history)
        );
        return Response.json({ text: withCtx("exploring>what>3", withMenu) });
      }
    }

    if (ctx === "exploring>fit") {
      if (rawLower === "1" || lower.includes("take the cibn fit quiz")) {
        return Response.json({ text: fitQuizQuestion(1) });
      }
    }

    if (ctx === "exploring>membership") {
      if (rawLower === "1" || lower.includes("types of membership")) {
        const text = await membershipTypesContent(history, message, knowledge);
        const withMenu = appendNextSteps(
          text,
          buildNextMenu("exploring>membership", history)
        );
        return Response.json({ text: withCtx("exploring>membership>1", withMenu) });
      }

      if (rawLower === "2" || lower.includes("take the membership quiz")) {
        return Response.json({ text: membershipQuizQuestion(1) });
      }
    }

    if (ctx.startsWith("quiz>fit>") && ctx !== "quiz>fit>summary") {
      const q = Number(ctx.split(">")[2]);
      const answer = Number(rawLower);

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
      if (rawLower === "1") {
        const text = await membershipTypesContent(history, message, knowledge);
        const withMenu = appendNextSteps(
          text,
          buildNextMenu("exploring>membership", history)
        );
        return Response.json({ text: withCtx("exploring>membership>1", withMenu) });
      }
      if (rawLower === "2") {
        return Response.json({ text: membershipQuizQuestion(1) });
      }
      if (rawLower === "3") {
        return Response.json({
          text: withCtx(
            "quiz>fit>summary>tour",
            `**Book a Tour**

The best next step is to book a tour here:
${URLS.booking}`
          ),
        });
      }
      if (rawLower === "4") {
        return Response.json({ text: exploringMenu() });
      }
    }

    if (ctx.startsWith("quiz>membership>") && ctx !== "quiz>membership>summary") {
      const q = Number(ctx.split(">")[2]);
      const answer = Number(rawLower);

      if (![1, 2, 3, 4].includes(answer)) {
        return Response.json({ text: membershipQuizQuestion(q) });
      }

      if (q < 6) {
        return Response.json({ text: membershipQuizQuestion(q + 1) });
      }

      return Response.json({
        text: membershipQuizSummary([
          ...history,
          { role: "user", content: message },
        ]),
      });
    }

    if (ctx === "quiz>membership>summary") {
      if (rawLower === "1") {
        const text = await membershipTypesContent(history, message, knowledge);
        const withMenu = appendNextSteps(
          text,
          buildNextMenu("exploring>membership", history)
        );
        return Response.json({ text: withCtx("exploring>membership>1", withMenu) });
      }
      if (rawLower === "2") {
        return Response.json({
          text: withCtx("quiz>membership>join>networker", `**Join Networker**\n\n${URLS.networkerJoin}`),
        });
      }
      if (rawLower === "3") {
        return Response.json({
          text: withCtx("quiz>membership>join>speaker", `**Join Speaker**\n\n${URLS.speakerJoin}`),
        });
      }
      if (rawLower === "4") {
        return Response.json({
          text: withCtx("quiz>membership>join>salespro", `**Join Sales Pro**\n\n${URLS.salesProJoin}`),
        });
      }
      if (rawLower === "5") {
        return Response.json({
          text: withCtx("quiz>membership>summary>tour", `**Book a Tour**\n\n${URLS.booking}`),
        });
      }
      if (rawLower === "6") {
        return Response.json({ text: membershipMenu() });
      }
    }

   if (ctx === "member") {
  if (rawLower === "1" || lower === "getting started") {
    return Response.json({ text: gettingStartedMenu() });
  }
  if (rawLower === "2" || lower === "networking flows") {
    return Response.json({ text: networkingFlowsMenu() });
  }
  if (
    rawLower === "3" ||
    lower === "networking strategies" ||
    lower === "strategies"
  ) {
    return Response.json({ text: strategiesMenu() });
  }
}

    if (ctx === "member>start") {
      if (rawLower === "1" || lower === "first 48 hours") {
        return Response.json({ text: first48HoursMenu() });
      }
      if (rawLower === "2" || lower === "first 30 days") {
        return Response.json({ text: first30DaysMenu() });
      }
      if (rawLower === "3" || lower === "onboarding help") {
        const text = await aiSectionAnswer(
          "Onboarding Help for New CIBN Members",
          history,
          message,
          knowledge,
          `Give thorough onboarding guidance.

Include practical steps.
Include: Book a tour: ${URLS.booking}
Use bold section titles.`
        );

        const withMenu = appendNextSteps(
          text,
          buildNextMenu("member>start", history)
        );
        return Response.json({ text: withCtx("member>start>onboarding", withMenu) });
      }
    }

    if (ctx === "member>start>48hours") {
      if (rawLower === "a") {
        const content48a = `**Schedule Your Onboarding / Orientation Call**

Once you become a member, use the membership page below to continue your onboarding path.

- Membership options: ${URLS.membership}
- Book a tour: ${URLS.booking}`;
        const withMenu48a = appendNextSteps(
          content48a,
          buildNextMenu("member>start>48hours", history)
        );
        return Response.json({ text: withCtx("member>start>48hours>a", withMenu48a) });
      }

      if (rawLower === "b") {
        const canonicalPage = stripCtxTag(chromeExtensionPage());
        const withMenu = appendNextSteps(
          canonicalPage,
          buildNextMenu("member>start>48hours", history)
        );
        return Response.json({ text: withCtx("tools>chrome", withMenu) });
      }

      if (rawLower === "c") {
        const text = await aiSectionAnswer(
          "How to Update Your LinkedIn Profile for CIBN",
          history,
          message,
          knowledge,
          "Give practical profile guidance for a CIBN member. Mention that LinkedIn connection requests should be sent without a message."
        );
        const withMenu = appendNextSteps(
          text,
          buildNextMenu("member>start>48hours", history)
        );
        return Response.json({ text: withCtx("member>start>48hours>c", withMenu) });
      }
    }

    if (ctx === "member>start>30days") {
      if (["1", "2", "3"].includes(rawLower)) {
        const topicMap: Record<string, string> = {
          "1": "How to Attend Networking Opportunities",
          "2": "How to Schedule One-on-One Meetings",
          "3": "How to Begin Referral Activity",
        };

        const text = await aiSectionAnswer(
          topicMap[rawLower],
          history,
          message,
          knowledge,
          "Give a practical, member-friendly answer with concrete next steps."
        );

        const withMenu = appendNextSteps(
          text,
          buildNextMenu("member>start>30days", history)
        );
        return Response.json({ text: withCtx(`member>start>30days>${rawLower}`, withMenu) });
      }
    }

    if (ctx === "member>flows") {
      if (rawLower === "a" || lower.includes("one on one") || lower.includes("one-on-one")) {
        return Response.json({
          text: withCtx(
            "member>flows>oneonone>step1",
            `**One-on-One Preparation — Step 1 of 3**

One-on-one meetings are one of the most important activities in CIBN.

**Before we build your prep dashboard, I need information about the person you are meeting.**

Please paste any of the following:

- Their LinkedIn profile URL or About section
- Their website or bio
- Their services and who they serve
- Any notes from a previous conversation

A LinkedIn profile alone is usually enough to get started.

**Note:** This step is required. I will not move forward until you share information about your contact.`
          ),
        });
      }

      if (rawLower === "b" || lower.includes("referral conversations")) {
        const text = await aiSectionAnswer(
          "Referral Conversations in CIBN",
          history,
          message,
          knowledge,
          "Explain how members can approach referral conversations in a relationship-first way."
        );
        const withMenu = appendNextSteps(
          text,
          buildNextMenu("member>flows", history)
        );
        return Response.json({ text: withCtx("member>flows>b", withMenu) });
      }

      if (rawLower === "c" || lower.includes("follow up system") || lower.includes("follow-up system")) {
        const text = await aiSectionAnswer(
          "Follow-Up System for CIBN Members",
          history,
          message,
          knowledge,
          "Give practical follow-up guidance for CIBN members."
        );
        const withMenu = appendNextSteps(
          text,
          buildNextMenu("member>flows", history)
        );
        return Response.json({ text: withCtx("member>flows>c", withMenu) });
      }
    }

    if (ctx === "member>flows>oneonone>step1") {
      if (!isMeaningfulPersonInfo(message)) {
        return Response.json({
          text: withCtx(
            "member>flows>oneonone>step1",
            `**One-on-One Preparation — Step 1 of 3**

I still need information about the person you are meeting before I can move forward.

Please paste one of the following:

- LinkedIn profile URL
- Website or bio
- Description of their services and who they serve
- Notes from your prior conversation

**This is a required step.**`
          ),
        });
      }

      return Response.json({
        text: withCtx(
          "member>flows>oneonone>step2",
          `**One-on-One Preparation — Step 2 of 3**

Great. Now tell me about you and your business.

Please include:

- What you do
- Who you serve
- Your best-fit clients
- What outcome you want from this meeting

**Note:** This step is also required before I build your prep dashboard.**`
        ),
      });
    }

    if (ctx === "member>flows>oneonone>step2") {
      if (message.trim().split(/\s+/).filter(Boolean).length < 8) {
        return Response.json({
          text: withCtx(
            "member>flows>oneonone>step2",
            `**One-on-One Preparation — Step 2 of 3**

I still need more information about you and your business before I can build the dashboard.

Please share:

- What you do
- Who you help
- Your best-fit clients
- The main goal for this meeting

**This is a required step.**`
          ),
        });
      }

      const text = await aiSectionAnswer(
        "One-to-One Networking Prep Dashboard",
        history,
        message,
        knowledge,
        `Create a one-on-one meeting prep dashboard.

Include:
- likely points of alignment
- possible collaboration angles
- good discovery questions
- how the user can explain their value clearly
- suggested next-step follow-up ideas

Use bold section titles only.`
      );

      const withMenu = appendNextSteps(
        text,
        buildNextMenu("member>flows", history)
      );
      return Response.json({
        text: withCtx("member>flows>oneonone>dashboard", withMenu),
      });
    }

    if (ctx === "member>strategies") {
        const strategyKeyMap: Record<string, string> = {
    a: "$150,000 Smart Networking",
    b: "Collaborating Partners in CIBN",
    c: "Collaboration Strategy",
    d: "Referral Systems in CIBN",
    e: "Referral Growth in CIBN",
    f: "One Minute Infomercial",
    g: "How to Improve My Results in CIBN",
  };

  if (rawLower in strategyKeyMap) {
    const topic = strategyKeyMap[rawLower];

    const text = await aiSectionAnswer(
      topic,
      history,
      message,
      knowledge,
      topic === "One Minute Infomercial"
        ? "Teach this as a structured networking skill. Include the one-thing rule, ideal client clarity, and types of infomercials."
        : "Give a thorough, practical member-facing answer."
    );

    const withMenu = appendNextSteps(
      text,
      buildNextMenu("member>strategies", history)
    );

    return Response.json({
      text: withCtx(`member>strategies>${rawLower}`, withMenu),
    });
  }
}

    if (ctx === "tools") {
      if (rawLower === "a" || lower.includes("chrome extension")) {
        return Response.json({ text: chromeExtensionPage() });
      }

      if (rawLower === "b" || lower.includes("linkedin")) {
        const text = await aiSectionAnswer(
          "LinkedIn for CIBN Members",
          history,
          message,
          knowledge,
          "Explain how to use LinkedIn in alignment with CIBN. Mention that connection requests should be sent without a message."
        );
        const withMenu = appendNextSteps(text, buildNextMenu("tools", history));
        return Response.json({ text: withCtx("tools>b", withMenu) });
      }

      if (rawLower === "c" || lower.includes("meetn")) {
        const text = await aiSectionAnswer(
          "Meetn",
          history,
          message,
          knowledge,
          `Explain what Meetn is and how it is used as a platform option in the CIBN ecosystem.

Include:
- Meetn Discount: ${URLS.meetn}
- Meetn Terms: ${URLS.meetnTerms}

Use bold section titles.`
        );
        const withMenu = appendNextSteps(text, buildNextMenu("tools", history));
        return Response.json({ text: withCtx("tools>c", withMenu) });
      }

      if (rawLower === "d" || lower.includes("nolodex")) {
        const text = await aiSectionAnswer(
          "Nolodex",
          history,
          message,
          knowledge,
          "Explain what Nolodex is and how it may be relevant to members."
        );
        const withMenu = appendNextSteps(text, buildNextMenu("tools", history));
        return Response.json({ text: withCtx("tools>d", withMenu) });
      }
    }

    if (ctx === "tools>chrome") {
  if (["a", "b", "c", "d"].includes(rawLower)) {
        const topic = topicFromContext(`tools>chrome>${rawLower}`) || "CIBN Chrome Extension";
        const text = await aiSectionAnswer(
          topic,
          history,
          message,
          knowledge,
          "Explain this Chrome extension feature clearly and practically."
        );
        const withMenu = appendNextSteps(
          text,
          buildNextMenu("tools>chrome", history)
        );
        return Response.json({ text: withCtx(`tools>chrome>${rawLower}`, withMenu) });
      }
    }

    if (ctx === "training") {
      if (rawLower === "a" || lower === "membership training") {
        return Response.json({ text: membershipTrainingMenu() });
      }
      if (rawLower === "b" || lower === "membership programs") {
        return Response.json({ text: membershipProgramsMenu() });
      }
      if (rawLower === "c" || lower === "video training library") {
        return Response.json({ text: videoTrainingLibraryPage() });
      }
    }

    if (ctx === "training>membership-training") {
      if (["1", "2", "3"].includes(rawLower)) {
        const topic = topicFromContext(`training>membership-training>${rawLower}`) || "Membership Training";
        const text = await aiSectionAnswer(
          topic,
          history,
          message,
          knowledge,
          "Explain this training clearly, with what it is for and who it helps."
        );
        const withMenu = appendNextSteps(
          text,
          buildNextMenu("training>membership-training", history)
        );
        return Response.json({
          text: withCtx(`training>membership-training>${rawLower}`, withMenu),
        });
      }
    }

    if (ctx === "training>membership-programs") {
      if (["1", "2", "3", "4"].includes(rawLower)) {
        const topic = topicFromContext(`training>membership-programs>${rawLower}`) || "Membership Programs";
        const text = await aiSectionAnswer(
          topic,
          history,
          message,
          knowledge,
          "Explain this program clearly, with practical detail."
        );
        const withMenu = appendNextSteps(
          text,
          buildNextMenu("training>membership-programs", history)
        );
        return Response.json({
          text: withCtx(`training>membership-programs>${rawLower}`, withMenu),
        });
      }
    }

    if (rawLower === "dig deeper") {
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
        const withMenu = appendNextSteps(text, buildNextMenu(parentCtx, history));
        return Response.json({ text: withCtx(`${ctx}>deeper`, withMenu) });
      }

      const text = await aiSectionAnswer(
        "Current CIBN topic",
        history,
        "Dig deeper into the current topic.",
        knowledge,
        "Use the recent conversation to deepen the most recent topic. Be specific, practical, and thorough. Use bold section titles only."
      );
      const withMenu = appendNextSteps(text, buildNextMenu(parentOf(ctx), history));
      return Response.json({ text: withCtx(`${ctx}>deeper`, withMenu) });
    }

    const fallback = await aiSectionAnswer(
      "General CIBN question",
      history,
      message,
      knowledge,
      "Give a thorough, complete, and helpful answer. Use bold section titles where appropriate. Include practical next steps. Do not send users to an events page for collaboration or referral relationship guidance unless the question is specifically about event or group information."
    );

       const withMenu = appendNextSteps(fallback, buildNextMenu(parentOf(ctx), history));
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
