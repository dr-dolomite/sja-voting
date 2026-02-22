import { PrismaClient } from "../lib/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

// ─── Mock Senator Candidates ────────────────────────────────────
const PARTYLISTS = [
  { name: "Nacionalista Party", color: "#1B4D3E" },
  { name: "Liberal Party", color: "#FFD700" },
  { name: "PDP-Laban", color: "#0038A8" },
  { name: "Aksyon Demokratiko", color: "#CE1126" },
  { name: "Independent", color: "#808080" },
];

const SENATOR_CANDIDATES: {
  fullName: string;
  description: string;
  partylist: string;
}[] = [
  // Nacionalista Party (6)
  {
    fullName: "Juan Miguel Reyes",
    description: "Former senator and education reform advocate.",
    partylist: "Nacionalista Party",
  },
  {
    fullName: "Maria Luisa Fernandez",
    description: "Environmental lawyer and sustainability champion.",
    partylist: "Nacionalista Party",
  },
  {
    fullName: "Ricardo Antonio Santos",
    description: "Veteran legislator with 20 years of public service.",
    partylist: "Nacionalista Party",
  },
  {
    fullName: "Angela Patricia Cruz",
    description: "Healthcare policy expert and former DOH undersecretary.",
    partylist: "Nacionalista Party",
  },
  {
    fullName: "Eduardo Jose Villanueva",
    description: "Infrastructure development specialist.",
    partylist: "Nacionalista Party",
  },
  {
    fullName: "Sofia Isabelle Mendoza",
    description: "Youth empowerment and digital literacy advocate.",
    partylist: "Nacionalista Party",
  },

  // Liberal Party (6)
  {
    fullName: "Carlos Manuel Aquino",
    description: "Human rights lawyer and civil liberties defender.",
    partylist: "Liberal Party",
  },
  {
    fullName: "Teresa Maria Garcia",
    description: "Former mayor with a track record of transparent governance.",
    partylist: "Liberal Party",
  },
  {
    fullName: "Antonio Rafael Lim",
    description: "Economist focused on inclusive growth and MSMEs.",
    partylist: "Liberal Party",
  },
  {
    fullName: "Patricia Anne Dizon",
    description: "Women's rights and gender equality campaigner.",
    partylist: "Liberal Party",
  },
  {
    fullName: "Miguel Francisco Torres",
    description: "Anti-corruption crusader and former ombudsman.",
    partylist: "Liberal Party",
  },
  {
    fullName: "Isabella Rosario Tan",
    description: "Agricultural reform advocate and farmer's rights champion.",
    partylist: "Liberal Party",
  },

  // PDP-Laban (6)
  {
    fullName: "Roberto Luis Bautista",
    description: "National security and defense policy expert.",
    partylist: "PDP-Laban",
  },
  {
    fullName: "Camille Joy Ramos",
    description: "Social welfare specialist and poverty reduction champion.",
    partylist: "PDP-Laban",
  },
  {
    fullName: "Fernando Diego Castillo",
    description: "Infrastructure and transportation development advocate.",
    partylist: "PDP-Laban",
  },
  {
    fullName: "Mariana Grace Delgado",
    description: "Education reform and teachers' welfare champion.",
    partylist: "PDP-Laban",
  },
  {
    fullName: "Alejandro Pablo Rivera",
    description: "Labor rights and overseas workers' advocate.",
    partylist: "PDP-Laban",
  },
  {
    fullName: "Gabriela Faith Salazar",
    description: "Healthcare accessibility and universal coverage advocate.",
    partylist: "PDP-Laban",
  },

  // Aksyon Demokratiko (4)
  {
    fullName: "Marco Luigi Navarro",
    description: "Good governance and anti-red-tape champion.",
    partylist: "Aksyon Demokratiko",
  },
  {
    fullName: "Diana Rose Pascual",
    description: "Environmental conservation and climate action advocate.",
    partylist: "Aksyon Demokratiko",
  },
  {
    fullName: "Andres Felipe Morales",
    description: "Technology and innovation policy expert.",
    partylist: "Aksyon Demokratiko",
  },
  {
    fullName: "Christine Mae Aguilar",
    description: "Public education and scholarship program advocate.",
    partylist: "Aksyon Demokratiko",
  },

  // Independent (4)
  {
    fullName: "Ramon Carlos Estrada",
    description: "Independent fiscal reformist and budget watchdog.",
    partylist: "Independent",
  },
  {
    fullName: "Vanessa Louise Herrera",
    description: "Independent mental health and social services advocate.",
    partylist: "Independent",
  },
  {
    fullName: "Benjamin Jose Ortega",
    description: "Independent anti-poverty and livelihood programs champion.",
    partylist: "Independent",
  },
  {
    fullName: "Katherine Joy Manalo",
    description: "Independent press freedom and media rights defender.",
    partylist: "Independent",
  },
];

async function main() {
  // 1. Seed default admin
  const hashedPassword = await hash("admin123", 12);

  await prisma.admin.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      password: hashedPassword,
    },
  });
  console.log("✅ Default admin created (admin / admin123)");

  // 2. Create partylists
  const partylistMap: Record<string, string> = {};

  for (const pl of PARTYLISTS) {
    const partylist = await prisma.partylist.upsert({
      where: { name: pl.name },
      update: { color: pl.color },
      create: { name: pl.name, color: pl.color },
    });
    partylistMap[pl.name] = partylist.id;
  }
  console.log(`✅ ${PARTYLISTS.length} partylists created`);

  // 3. Find existing election
  const election = await prisma.election.findFirst({
    where: { name: "SY 2025–2026 Student Council" },
  });

  if (!election) {
    throw new Error(
      'Election "SY 2025–2026 Student Council" not found. Please create it first.',
    );
  }
  console.log(
    `✅ Found existing election: ${election.name} (id: ${election.id})`,
  );

  // 4. Create senator position (maxVotes = 12, Philippine-style)
  const senatorPosition = await prisma.position.create({
    data: {
      name: "Senator",
      order: 1,
      maxVotes: 12,
      electionId: election.id,
    },
  });
  console.log(`✅ Position created: ${senatorPosition.name} (max votes: 12)`);

  // 5. Create 26 senator candidates
  const candidateData = SENATOR_CANDIDATES.map((c) => ({
    fullName: c.fullName,
    description: c.description,
    positionId: senatorPosition.id,
    partylistId: partylistMap[c.partylist],
  }));

  const result = await prisma.candidate.createMany({
    data: candidateData,
  });
  console.log(`✅ ${result.count} senator candidates created`);

  // Summary
  console.log("\n📊 Seed Summary:");
  console.log(`   • Admin:      1`);
  console.log(`   • Partylists: ${PARTYLISTS.length}`);
  console.log(`   • Election:   found existing`);
  console.log(`   • Position:   1 (Senator, max 12 votes)`);
  console.log(`   • Candidates: ${SENATOR_CANDIDATES.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
