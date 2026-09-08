import { prisma } from "../src/lib/prisma.js";

async function main() {
  console.log("Seeding database...");

  await prisma.adEvent.deleteMany();
  await prisma.campaign.deleteMany();

  await prisma.campaign.createMany({
    data: [
      {
        name: "Nike Running AU",
        headline: "Run Faster with Nike",
        imageUrl:
          "https://placehold.co/600x300?text=Nike+Running",
        landingPageUrl:
          "https://example.com/nike-running",
        totalBudget: 100,
        dailyBudget: 20,
        bidPrice: 0.8,
        country: "AU",
        device: "mobile",
        category: "sports",
        isActive: true,
      },
      {
        name: "Adidas Sports AU",
        headline: "Impossible Is Nothing",
        imageUrl:
          "https://placehold.co/600x300?text=Adidas+Sports",
        landingPageUrl:
          "https://example.com/adidas",
        totalBudget: 120,
        dailyBudget: 25,
        bidPrice: 0.6,
        country: "AU",
        device: "mobile",
        category: "sports",
        isActive: true,
      },
      {
        name: "Tech Campaign AU",
        headline: "Discover the Latest Technology",
        imageUrl:
          "https://placehold.co/600x300?text=Technology",
        landingPageUrl:
          "https://example.com/tech",
        totalBudget: 80,
        dailyBudget: 15,
        bidPrice: 0.5,
        country: "AU",
        device: "desktop",
        category: "technology",
        isActive: true,
      },
      {
        name: "Paused Campaign",
        headline: "Paused Advertisement",
        imageUrl:
          "https://placehold.co/600x300?text=Paused+Campaign",
        landingPageUrl:
          "https://example.com/paused",
        totalBudget: 100,
        dailyBudget: 20,
        bidPrice: 1.2,
        country: "AU",
        device: "mobile",
        category: "sports",
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