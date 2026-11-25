import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/crypto";
import { DEFAULT_ANNOUNCEMENT_TEMPLATE } from "../src/lib/template";
import { EST_TIMEZONE_LABEL, getBusinessDateEst } from "../src/lib/timezone";

const prisma = new PrismaClient();

async function main() {
  const adminUsername = (process.env.INITIAL_ADMIN_USERNAME || "admin").trim().toLowerCase();
  const adminPassword = process.env.INITIAL_ADMIN_PASSWORD || "ChangeMeImmediately123!";
  const adminName = (process.env.INITIAL_ADMIN_NAME || "System Administrator").trim();

  await prisma.systemSettings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      brandName: process.env.BRAND_NAME || "Daily Dashboard",
      brandTagline: process.env.BRAND_TAGLINE || "Real-Time Lead & Campaign Tracker",
      brandPrimaryColor: process.env.BRAND_PRIMARY_COLOR || "#1D4ED8",
      brandLogoUrl: "/logo.png",
      timezoneLabel: EST_TIMEZONE_LABEL,
      telegramEnabled: true,
    },
  });

  const existingAdmin = await prisma.user.findFirst({
    where: { role: "ADMIN", deletedAt: null },
  });

  if (!existingAdmin) {
    await prisma.user.create({
      data: {
        fullName: adminName,
        username: adminUsername,
        passwordHash: hashPassword(adminPassword),
        role: "ADMIN",
        status: "ACTIVE",
        announcementName: adminName.split(" ")[0] || adminName,
        announcementTemplate: DEFAULT_ANNOUNCEMENT_TEMPLATE,
      },
    });
    console.log(`Initial admin account created (username: ${adminUsername}).`);
  } else {
    console.log(`Admin account already exists (username: ${existingAdmin.username}).`);
  }

  if (process.env.SEED_SAMPLE_TEAM === "true") {
    const sampleCampaigns = [
      { name: "Digital Nomad", dailyTarget: 50, description: "Remote worker relocation inquiries" },
      { name: "Study in Spain", dailyTarget: 35, description: "Student visa & university placement" },
    ];
    const todayEst = getBusinessDateEst(new Date());
    for (const c of sampleCampaigns) {
      const existing = await prisma.campaign.findUnique({ where: { name: c.name } });
      if (!existing) {
        await prisma.campaign.create({
          data: {
            name: c.name,
            description: c.description,
            dailyTarget: c.dailyTarget,
            status: "ACTIVE",
            targetHistory: {
              create: {
                dailyTarget: c.dailyTarget,
                effectiveDateEst: todayEst,
              },
            },
          },
        });
      }
    }
    console.log("Sample campaigns seeded.");
  }
}

main()
  .catch((err) => {
    console.error("Seed error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
