import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const artworks = [
    {
      sourceUrl: 'https://images.unsplash.com/photo-1605810230434-7631ac76ec81?q=80&w=630',
      width: 630,
      height: 800,
      sizeBytes: 102400,
      format: 'jpg',
      theme: 'Cyberpunk',
      vibe: 'Neon',
      status: 'PENDING' as any,
    },
    {
      sourceUrl: 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=630',
      width: 630,
      height: 800,
      sizeBytes: 102400,
      format: 'jpg',
      theme: 'Abstract',
      vibe: 'Glow',
      status: 'PENDING' as any,
    },
  ];

  for (const art of artworks) {
    await prisma.artwork.create({ data: art });
  }
  console.log('✅ Veritabanı başarıyla tohumlandı! Resimler dükkana indi.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });