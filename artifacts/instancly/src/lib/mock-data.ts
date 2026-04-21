export const mockUser = {
  username: "johndoe",
  displayName: "John Doe",
  balance: 18.43,
  plan: "Pro",
  email: "john@example.com",
  bio: "Full-stack developer building cool things.",
  signupDate: "2023-11-15",
  publicProjects: 12,
  totalClones: 485
};

export const mockProjects = [
  { id: "1", name: "Todo App", slug: "todo-app", status: "live", builds: 5, lastActive: "2m ago", framework: "Next.js", clones: 12, description: "A simple todo app with authentication and a postgres database." },
  { id: "2", name: "Recipe Vault", slug: "recipe-vault", status: "live", builds: 12, lastActive: "1h ago", framework: "React", clones: 45, description: "Store your favorite recipes and share them with friends." },
  { id: "3", name: "Finance Tracker", slug: "finance-tracker", status: "provisioning", builds: 2, lastActive: "5m ago", framework: "Vue", clones: 3, description: "Track your expenses and income with charts." },
  { id: "4", name: "Blog CMS", slug: "blog-cms", status: "live", builds: 8, lastActive: "1d ago", framework: "Next.js", clones: 89, description: "A headless CMS for your blog." },
  { id: "5", name: "Kanban Board", slug: "kanban-board", status: "error", builds: 1, lastActive: "2d ago", framework: "React", clones: 0, description: "Manage your tasks with a drag-and-drop kanban board." },
  { id: "6", name: "Weather App", slug: "weather-app", status: "live", builds: 3, lastActive: "3d ago", framework: "Vanilla", clones: 5, description: "Check the weather in your area." },
  { id: "7", name: "URL Shortener", slug: "url-shortener", status: "live", builds: 15, lastActive: "1w ago", framework: "Next.js", clones: 120, description: "Shorten long URLs and track clicks." },
  { id: "8", name: "Chat Room", slug: "chat-room", status: "live", builds: 7, lastActive: "2w ago", framework: "React", clones: 34, description: "Real-time chat room with WebSockets." },
];

export const mockModels = [
  { name: "Claude Sonnet 4.5", provider: "Anthropic", costRange: "£0.01 - £0.05", status: "active" },
  { name: "Claude Opus", provider: "Anthropic", costRange: "£0.05 - £0.20", status: "active" },
  { name: "GPT-4o", provider: "OpenAI", costRange: "£0.02 - £0.10", status: "active" },
  { name: "GPT-4o mini", provider: "OpenAI", costRange: "£0.005 - £0.02", status: "active" },
  { name: "Gemini 2.5 Pro", provider: "Google", costRange: "£0.01 - £0.04", status: "active" },
  { name: "Gemini Flash", provider: "Google", costRange: "£0.002 - £0.01", status: "active" },
];

export const mockAdminStats = {
  totalUsers: 1420,
  mrr: "£12,450",
  buildsToday: 845,
  activeModels: 6,
  recentBuilds: [
    { id: "b1", user: "johndoe", project: "todo-app", duration: "4.2s", cost: "£0.03", status: "success" },
    { id: "b2", user: "sarah", project: "crm", duration: "12.1s", cost: "£0.15", status: "success" },
    { id: "b3", user: "mike", project: "blog", duration: "2.4s", cost: "£0.01", status: "error" },
    { id: "b4", user: "alex", project: "shop", duration: "8.5s", cost: "£0.08", status: "success" },
  ],
  users: [
    { username: "johndoe", email: "john@example.com", plan: "Pro", balance: 18.43, signupDate: "2023-11-15", status: "active" },
    { username: "sarah", email: "sarah@example.com", plan: "Team", balance: 150.00, signupDate: "2023-10-01", status: "active" },
    { username: "mike", email: "mike@example.com", plan: "Free", balance: 0.50, signupDate: "2024-01-20", status: "active" },
    { username: "alex", email: "alex@example.com", plan: "Pro", balance: 5.20, signupDate: "2024-02-10", status: "suspended" },
  ]
};

export const mockExploreProjects = Array.from({ length: 24 }).map((_, i) => ({
  id: `exp-${i}`,
  name: `Awesome Project ${i+1}`,
  author: i % 3 === 0 ? "johndoe" : i % 2 === 0 ? "sarah" : "alex",
  framework: ["Next.js", "React", "Vue", "Vanilla"][i % 4],
  clones: Math.floor(Math.random() * 500) + 10
}));

export const mockTransactions = [
  { id: "tx1", date: "2024-03-01", amount: "£25.00", status: "Success", method: "Visa •••• 4242" },
  { id: "tx2", date: "2024-02-15", amount: "£10.00", status: "Success", method: "Visa •••• 4242" },
  { id: "tx3", date: "2024-01-20", amount: "£5.00", status: "Success", method: "Visa •••• 4242" },
];
