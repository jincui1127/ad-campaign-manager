import { prisma } from "../src/lib/prisma.js";
import { dollarsToMicros } from "../src/lib/money.js";

async function main() {
  console.log("Seeding database...");

  await prisma.adEvent.deleteMany();
  await prisma.campaign.deleteMany();

  await prisma.campaign.createMany({
    data: [
      {
        name: "Nike Running AU/NZ",
        headline: "Run Faster with Nike",
        imageUrl: "https://placehold.co/600x300?text=Nike+Running",
        landingPageUrl: "https://example.com/nike-running",
        totalBudgetMicros: dollarsToMicros(100),
        dailyBudgetMicros: dollarsToMicros(20),
        bidPriceMicros: dollarsToMicros(0.8),
        bidType: "CPI",
        countries: ["AU", "NZ"],
        devices: ["mobile", "tablet"],
        categories: ["sports"],
        isActive: true,
      },
      {
        name: "Adidas Sports AU",
        headline: "Impossible Is Nothing",
        imageUrl: "https://placehold.co/600x300?text=Adidas+Sports",
        landingPageUrl: "https://example.com/adidas",
        totalBudgetMicros: dollarsToMicros(120),
        dailyBudgetMicros: dollarsToMicros(25),
        bidPriceMicros: dollarsToMicros(0.6),
        bidType: "CPC",
        countries: ["AU"],
        devices: ["mobile"],
        categories: ["sports"],
        isActive: true,
      },
      {
        name: "Tech Campaign",
        headline: "Discover the Latest Technology",
        imageUrl: "https://placehold.co/600x300?text=Technology",
        landingPageUrl: "https://example.com/tech",
        totalBudgetMicros: dollarsToMicros(80),
        dailyBudgetMicros: dollarsToMicros(15),
        bidPriceMicros: dollarsToMicros(0.5),
        bidType: "CPI",
        countries: [],
        devices: ["desktop"],
        categories: ["technology"],
        isActive: true,
      },
      {
        name: "Paused Campaign",
        headline: "Paused Advertisement",
        imageUrl: "https://placehold.co/600x300?text=Paused+Campaign",
        landingPageUrl: "https://example.com/paused",
        totalBudgetMicros: dollarsToMicros(100),
        dailyBudgetMicros: dollarsToMicros(20),
        bidPriceMicros: dollarsToMicros(1.2),
        bidType: "CPI",
        countries: [],
        devices: [],
        categories: [],
        isActive: false,
      },
    ],
  });

  console.log("Database seeded successfully.");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });