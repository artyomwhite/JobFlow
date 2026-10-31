import { PrismaClient, AdapterStatus } from "@prisma/client";

const prisma = new PrismaClient();

const profiles = [
  ["project-manager", "Project Manager", ["Project Manager", "Junior Project Manager", "Trainee Project Manager", "IT Project Manager", "Technical Project Manager", "Associate Project Manager", "Project Coordinator", "Менеджер проектів", "Менеджер проектов"]],
  ["product-manager", "Product Manager", ["Product Manager", "Junior Product Manager", "Associate Product Manager", "Trainee Product Manager", "Product Owner", "Junior Product Owner", "Менеджер продукту", "Менеджер продукта"]],
  ["full-stack-developer", "Full-Stack Developer", ["Full-Stack Developer", "Junior Full-Stack Developer", "Full Stack Engineer", "JavaScript Developer", "TypeScript Developer", "Full Stack розробник", "Full Stack разработчик"]],
  ["react-developer", "React Developer", ["React Developer", "Junior React Developer", "Frontend Developer", "React.js Developer", "React розробник", "React разработчик"]],
  ["nextjs-developer", "Next.js Developer", ["Next.js Developer", "Next Developer", "Frontend Developer Next.js", "React / Next.js Developer"]],
  ["nodejs-developer", "Node.js Developer", ["Node.js Developer", "Junior Node.js Developer", "Node Developer", "Backend Developer Node.js", "Node.js розробник", "Node.js разработчик"]],
  ["python-developer", "Python Developer", ["Python Developer", "Junior Python Developer", "Python Backend Developer", "Django Developer", "FastAPI Developer", "Python розробник", "Python разработчик"]],
  ["ai-ml-engineer", "AI / ML Engineer", ["AI Developer", "AI Engineer", "Junior AI Engineer", "Machine Learning Engineer", "Junior Machine Learning Engineer", "ML Engineer", "LLM Developer", "Generative AI Developer"]],
] as const;

const sources = [
  { key: "djinni", name: "Djinni", type: "RSS", method: "Public RSS search feed", adapterStatus: AdapterStatus.ACTIVE },
  { key: "dou", name: "DOU Jobs", type: "RSS", method: "Public RSS feed", adapterStatus: AdapterStatus.ACTIVE },
  { key: "jooble", name: "Jooble", type: "API", method: "Jooble candidate search API (regional API key required)", adapterStatus: AdapterStatus.NEEDS_CONFIGURATION },
  { key: "happymonday", name: "Happy Monday", type: "JSON", method: "Public jobs-feed.json (up to 300 newest active listings)", adapterStatus: AdapterStatus.ACTIVE },
  ...["robota", "workua", "linkedin", "lobbyx", "wellfound"].map((key) => ({
    key,
    name: ({ robota: "Robota.ua", workua: "Work.ua", linkedin: "LinkedIn Jobs", happymonday: "Happy Monday", lobbyx: "Lobby X", wellfound: "Wellfound" } as Record<string, string>)[key]!,
    type: "WEB",
    method: ({
      robota: "Not configured; no public search feed or authorized candidate API verified",
      workua: "Not configured; published API documentation is for employer ATS workflows",
      linkedin: "Not configured; automated collection requires express permission",
      lobbyx: "Not configured; public listings exist but no documented feed/API verified",
      wellfound: "Not configured; no public job search API verified",
    } as Record<string, string>)[key]!,
    adapterStatus: AdapterStatus.UNAVAILABLE,
  })),
];

async function main() {
  const owner = await prisma.user.findFirst({ where: { role: "owner" }, select: { id: true } });
  for (const [slug, name, keywords] of profiles) {
    await prisma.searchProfile.upsert({
      where: { slug },
      update: {},
      create: { slug, name, keywords: [...keywords], ownerId: owner?.id },
    });
  }
  for (const source of sources) {
    await prisma.source.upsert({
      where: { key: source.key },
      update: { name: source.name, type: source.type, method: source.method, adapterStatus: source.adapterStatus },
      create: source,
    });
  }
  const activeSourceKeys = sources.filter((source) => source.adapterStatus !== AdapterStatus.UNAVAILABLE).map((source) => source.key);
  await prisma.searchProfile.updateMany({ where: { enabledSources: { isEmpty: true } }, data: { enabledSources: activeSourceKeys } });
  if (owner) await prisma.searchProfile.updateMany({ where: { ownerId: null }, data: { ownerId: owner.id } });
}

main().finally(() => prisma.$disconnect());
