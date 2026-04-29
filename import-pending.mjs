// import-pending.mjs
// Runs from D:\vibeprofileit.com — imports vibe-bot's pending_approval.json into the DB.
// Usage: node import-pending.mjs

import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';

const JSON_PATH = 'C:/Users/hakta/OneDrive/Desktop/vibe-bot/pending_approval.json';

const prisma = new PrismaClient();

async function main() {
    const raw = readFileSync(JSON_PATH, 'utf-8');
    const items = JSON.parse(raw);

    console.log(`\n📥 ${items.length} görsel import ediliyor...\n`);

    let inserted = 0;
    let skipped  = 0;

    for (const item of items) {
        // dimensions: "736x1310" → width/height
        const [w, h] = (item.dimensions || '0x0').split('x').map(Number);
        const sizeBytes = Math.round((item.sizeMB || 0) * 1024 * 1024);

        // Aynı sourceUrl zaten varsa atla (duplicate guard)
        const exists = await prisma.artwork.findFirst({
            where: { sourceUrl: item.url },
            select: { id: true },
        });

        if (exists) {
            console.log(`  [ATLA]  ${item.url.slice(0, 70)}...`);
            skipped++;
            continue;
        }

        await prisma.artwork.create({
            data: {
                sourceUrl: item.url,
                width:     w,
                height:    h,
                sizeBytes: sizeBytes,
                format:    item.format || 'jpg',
                status:    'PENDING',
            },
        });

        console.log(`  [OK]    ${w}x${h} | ${item.format} | ${item.title?.slice(0, 50)}`);
        inserted++;
    }

    console.log('\n══════════════════════════════════════');
    console.log(`✅ Eklenen  : ${inserted}`);
    console.log(`⏭️  Atlanan  : ${skipped} (zaten vardı)`);
    console.log(`📊 Toplam   : ${items.length}`);
    console.log('══════════════════════════════════════\n');
}

main()
    .catch(e => { console.error('💥 HATA:', e.message); process.exit(1); })
    .finally(() => prisma.$disconnect());
