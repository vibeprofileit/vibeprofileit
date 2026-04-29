import pkg from "@prisma/client";
import { config } from "dotenv";
config();

const { PrismaClient } = pkg;
const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
});

await prisma.artwork.createMany({
  data: [
    {
      sourceUrl: "https://images.unsplash.com/photo-1605810230434-7631ac76ec81?q=80&w=630",
      width: 630,
      height: 354,
      sizeBytes: 98304,
      format: "jpeg",
      theme: "cyberpunk",
      color: "purple",
      vibe: "dark",
      status: "PENDING",
    },
    {
      sourceUrl: "https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=630",
      width: 630,
      height: 354,
      sizeBytes: 87040,
      format: "jpeg",
      theme: "neon",
      color: "blue",
      vibe: "electric",
      status: "PENDING",
    },
    {
      sourceUrl: "https://images.unsplash.com/photo-1464802686167-b939a67e06a1?q=80&w=630",
      width: 630,
      height: 354,
      sizeBytes: 112640,
      format: "jpeg",
      theme: "space",
      color: "black",
      vibe: "cosmic",
      status: "PENDING",
    },
  ],
});

console.log("3 test artwork eklendi.");
await prisma.$disconnect();
