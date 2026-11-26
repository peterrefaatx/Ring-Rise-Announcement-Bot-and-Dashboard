import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/crypto";
import {
  DEFAULT_ANNOUNCEMENT_TEMPLATE,
  renderAnnouncementMessage,
} from "../src/lib/template";
import {
  EST_TIMEZONE_LABEL,
  getBusinessDateEst,
  getBusinessMonthEst,
  getEstDayRangeUtc,
} from "../src/lib/timezone";

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
      brandPrimaryColor: process.env.BRAND_PRIMARY_COLOR || "#0077B6",
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

    const existingCallers = await prisma.user.count({ where: { role: "CALLER" } });
    if (existingCallers === 0) {
      const callerPasswordHash = hashPassword("CallerPassword123!");
      const sampleCallers = [
        {
          fullName: "Ahmed Mohamed",
          username: "ahmed",
          announcementName: "Ahmed",
          announcementTemplate: DEFAULT_ANNOUNCEMENT_TEMPLATE,
          leads: [
            { campaign: "Digital Nomad", count: 8 },
            { campaign: "Study in Spain", count: 4 },
          ],
        },
        {
          fullName: "Sara Hassan",
          username: "sara",
          announcementName: "Sara",
          announcementTemplate:
            "{name} just closed a new lead in {campaign}! Keep it rolling!",
          leads: [
            { campaign: "Digital Nomad", count: 6 },
            { campaign: "Study in Spain", count: 4 },
          ],
        },
        {
          fullName: "Mohamed Ali",
          username: "mohamed",
          announcementName: "Mohamed",
          announcementTemplate: DEFAULT_ANNOUNCEMENT_TEMPLATE,
          leads: [
            { campaign: "Digital Nomad", count: 5 },
            { campaign: "Study in Spain", count: 3 },
          ],
        },
        {
          fullName: "Peter Refaat",
          username: "peter",
          announcementName: "Peter",
          announcementTemplate:
            "{name} just secured a new lead for {campaign}! Great work!",
          leads: [
            { campaign: "Digital Nomad", count: 4 },
            { campaign: "Study in Spain", count: 2 },
          ],
        },
      ];

      const campaigns = await prisma.campaign.findMany({
        where: { status: "ACTIVE", deletedAt: null },
      });
      const campByName = new Map(campaigns.map((c) => [c.name, c]));
      const now = new Date();
      const { startUtc } = getEstDayRangeUtc(todayEst);
      const monthEst = getBusinessMonthEst(now);
      let minuteOffset = 15;

      for (const sc of sampleCallers) {
        const caller = await prisma.user.create({
          data: {
            fullName: sc.fullName,
            username: sc.username,
            passwordHash: callerPasswordHash,
            role: "CALLER",
            status: "ACTIVE",
            announcementName: sc.announcementName,
            announcementTemplate: sc.announcementTemplate,
          },
        });

        for (const item of sc.leads) {
          const camp = campByName.get(item.campaign);
          if (!camp) continue;
          for (let i = 0; i < item.count; i++) {
            const ts = new Date(
              Math.min(now.getTime() - 60000, startUtc.getTime() + minuteOffset * 60000)
            );
            minuteOffset += 3;
            await prisma.leadAnnouncement.create({
              data: {
                userId: caller.id,
                campaignId: camp.id,
                idempotencyKey: `seed-${sc.username}-${camp.id}-${i}`,
                callerNameSnapshot: caller.announcementName,
                campaignNameSnapshot: camp.name,
                renderedMessage: renderAnnouncementMessage(
                  caller.announcementTemplate,
                  caller.announcementName,
                  camp.name
                ),
                businessDateEst: todayEst,
                businessMonthEst: monthEst,
                createdAt: ts,
              },
            });
          }
        }
      }
      console.log("Sample callers and today's sample leads seeded.");
    }
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
