import { db, pool } from "./index";
import {
  usersTable,
  projectsTable,
  buildsTable,
  transactionsTable,
} from "./schema";

async function seed() {
  console.log("Clearing existing data…");
  await db.delete(buildsTable);
  await db.delete(transactionsTable);
  await db.delete(projectsTable);
  await db.delete(usersTable);

  console.log("Inserting users…");
  const users = await db
    .insert(usersTable)
    .values([
      {
        username: "johndoe",
        displayName: "John Doe",
        email: "john@example.com",
        bio: "Full-stack developer building cool things.",
        plan: "Pro",
        balance: "18.43",
      },
      {
        username: "sarah",
        displayName: "Sarah Chen",
        email: "sarah@example.com",
        bio: "Designer-engineer. Shipping side projects on weekends.",
        plan: "Team",
        balance: "150.00",
      },
      {
        username: "mike",
        displayName: "Mike Patel",
        email: "mike@example.com",
        bio: "Tinkering with AI tools.",
        plan: "Free",
        balance: "0.50",
      },
      {
        username: "alex",
        displayName: "Alex Rivera",
        email: "alex@example.com",
        bio: "Building the future of indie commerce.",
        plan: "Pro",
        balance: "5.20",
        status: "suspended",
      },
    ])
    .returning();

  const byName = Object.fromEntries(users.map((u) => [u.username, u]));

  console.log("Inserting projects…");
  type Seed = {
    owner: string;
    name: string;
    slug: string;
    description: string;
    framework: string;
    status?: string;
    isPublic?: boolean;
    clones?: number;
    daysAgo?: number;
  };
  const projectSeeds: Seed[] = [
    { owner: "johndoe", name: "Todo App", slug: "todo-app", description: "A simple todo app with authentication and a postgres database.", framework: "Next.js", clones: 12, daysAgo: 0 },
    { owner: "johndoe", name: "Recipe Vault", slug: "recipe-vault", description: "Store your favorite recipes and share them with friends.", framework: "React", clones: 45, daysAgo: 0 },
    { owner: "johndoe", name: "Finance Tracker", slug: "finance-tracker", description: "Track your expenses and income with charts.", framework: "Vue", status: "provisioning", clones: 3, daysAgo: 0 },
    { owner: "johndoe", name: "Blog CMS", slug: "blog-cms", description: "A headless CMS for your blog.", framework: "Next.js", clones: 89, daysAgo: 1 },
    { owner: "johndoe", name: "Kanban Board", slug: "kanban-board", description: "Manage your tasks with a drag-and-drop kanban board.", framework: "React", status: "error", clones: 0, daysAgo: 2 },
    { owner: "johndoe", name: "Weather App", slug: "weather-app", description: "Check the weather in your area.", framework: "Vanilla", clones: 5, daysAgo: 3 },
    { owner: "johndoe", name: "URL Shortener", slug: "url-shortener", description: "Shorten long URLs and track clicks.", framework: "Next.js", clones: 120, daysAgo: 7 },
    { owner: "johndoe", name: "Chat Room", slug: "chat-room", description: "Real-time chat room with WebSockets.", framework: "React", clones: 34, daysAgo: 14 },
    { owner: "sarah", name: "Pixel Studio", slug: "pixel-studio", description: "Tiny in-browser pixel art editor with palettes.", framework: "React", clones: 312, daysAgo: 4 },
    { owner: "sarah", name: "Habit Garden", slug: "habit-garden", description: "Grow a virtual garden as you keep daily habits.", framework: "Next.js", clones: 220, daysAgo: 10 },
    { owner: "sarah", name: "Lo-fi Player", slug: "lofi-player", description: "Curated lo-fi radio with focus timers.", framework: "Vanilla", clones: 88, daysAgo: 21 },
    { owner: "mike", name: "GPT Notes", slug: "gpt-notes", description: "AI-summarised meeting notes with tagging.", framework: "Next.js", clones: 64, daysAgo: 6 },
    { owner: "mike", name: "Crypto Pulse", slug: "crypto-pulse", description: "Realtime crypto dashboard with price alerts.", framework: "Vue", clones: 41, daysAgo: 12 },
    { owner: "alex", name: "Zinemaker", slug: "zinemaker", description: "Print-ready PDF zines from a markdown editor.", framework: "React", clones: 175, daysAgo: 8 },
    { owner: "alex", name: "Indie Stripe", slug: "indie-stripe", description: "Drop-in checkout for indie product launches.", framework: "Next.js", clones: 410, daysAgo: 30 },
    { owner: "alex", name: "Track My Runs", slug: "track-my-runs", description: "Mobile-friendly run logger with charts.", framework: "Vanilla", clones: 22, daysAgo: 45 },
  ];

  const projectsInserted = await db
    .insert(projectsTable)
    .values(
      projectSeeds.map((p) => ({
        userId: byName[p.owner]!.id,
        name: p.name,
        slug: p.slug,
        description: p.description,
        framework: p.framework,
        status: p.status ?? "live",
        isPublic: p.isPublic ?? true,
        clones: p.clones ?? 0,
        lastBuiltAt: new Date(Date.now() - (p.daysAgo ?? 0) * 86_400_000),
      })),
    )
    .returning();

  console.log("Inserting builds…");
  const buildSeeds: Array<{ projectSlug: string; owner: string; rows: Array<Omit<typeof buildsTable.$inferInsert, "projectId" | "number">> }> = [
    {
      owner: "johndoe",
      projectSlug: "todo-app",
      rows: [
        { prompt: "Create a habit tracker with streaks and a weekly chart.", aiMessage: "Done. I built the initial habit tracker — daily checklist, automatic streak counter, and a weekly bar chart at the top showing completion. There's also a small celebration animation when you hit a 7-day streak. Tell me what to tweak next.", durationSec: 217, cost: "0.07", filesChanged: 11, tokensIn: 24500, tokensOut: 9800, model: "Claude Sonnet 4.5" },
        { prompt: "Wire the form to Postgres and add zod validation.", aiMessage: "Wired the signup form to Postgres and added zod validation on both client and server. I also added inline error states under each field and a friendly toast on success. Try submitting an empty email — you should see a clean error.", durationSec: 98, cost: "0.03", filesChanged: 4, tokensIn: 8310, tokensOut: 2640, model: "Claude Sonnet 4.5" },
        { prompt: "Add a leaderboard sorted by streak length with weekly reset.", aiMessage: "Added a leaderboard sorted by streak length. I created a new `/leaderboard` page, wrote a SQL view that recalculates weekly, and wired up a cron-style reset every Monday at 00:00 UTC.", durationSec: 142, cost: "0.04", filesChanged: 6, tokensIn: 12840, tokensOut: 4120, model: "Claude Sonnet 4.5" },
      ],
    },
    {
      owner: "johndoe",
      projectSlug: "recipe-vault",
      rows: [
        { prompt: "Initial recipe vault scaffold", aiMessage: "Set up the recipe vault with a list page, detail page, and a tags filter.", durationSec: 180, cost: "0.06", filesChanged: 14, tokensIn: 18000, tokensOut: 6800, model: "Claude Sonnet 4.5" },
        { prompt: "Add ratings + sharing.", aiMessage: "Added 5-star ratings stored per-user and a share link generator with OG image preview.", durationSec: 110, cost: "0.04", filesChanged: 7, tokensIn: 11000, tokensOut: 4000, model: "Claude Sonnet 4.5" },
      ],
    },
    {
      owner: "sarah",
      projectSlug: "pixel-studio",
      rows: [
        { prompt: "Build a pixel canvas with palette swatches.", aiMessage: "Canvas is in. I added 16x16 default with a swatch picker and undo/redo.", durationSec: 240, cost: "0.09", filesChanged: 18, tokensIn: 27000, tokensOut: 9500, model: "Claude Sonnet 4.5" },
      ],
    },
  ];

  const projectBySlug = new Map<string, typeof projectsInserted[number]>();
  for (const p of projectsInserted) {
    projectBySlug.set(`${p.userId}:${p.slug}`, p);
  }

  for (const seed of buildSeeds) {
    const owner = byName[seed.owner]!;
    const project = projectBySlug.get(`${owner.id}:${seed.projectSlug}`);
    if (!project) continue;
    await db.insert(buildsTable).values(
      seed.rows.map((row, i) => ({
        ...row,
        projectId: project.id,
        number: i + 1,
        createdAt: new Date(Date.now() - (seed.rows.length - i) * 7 * 60_000),
      })),
    );
  }

  console.log("Inserting transactions…");
  await db.insert(transactionsTable).values([
    { userId: byName.johndoe!.id, amount: "25.00", createdAt: new Date("2024-03-01") },
    { userId: byName.johndoe!.id, amount: "10.00", createdAt: new Date("2024-02-15") },
    { userId: byName.johndoe!.id, amount: "5.00", createdAt: new Date("2024-01-20") },
    { userId: byName.sarah!.id, amount: "100.00", createdAt: new Date("2024-03-10") },
  ]);

  console.log("Done.");
  await pool.end();
}

seed().catch(async (err) => {
  console.error(err);
  await pool.end();
  process.exit(1);
});
