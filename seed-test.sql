INSERT INTO "Artwork" ("id", "sourceUrl", "r2Key", "width", "height", "sizeBytes", "format", "theme", "color", "vibe", "status", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), 'https://images.unsplash.com/photo-1605810230434-7631ac76ec81?q=80&w=630', NULL, 630, 354, 98304, 'jpeg', 'cyberpunk', 'purple', 'dark', 'PENDING', NOW(), NOW()),
  (gen_random_uuid(), 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=630', NULL, 630, 354, 87040, 'jpeg', 'neon', 'blue', 'electric', 'PENDING', NOW(), NOW()),
  (gen_random_uuid(), 'https://images.unsplash.com/photo-1464802686167-b939a67e06a1?q=80&w=630', NULL, 630, 354, 112640, 'jpeg', 'space', 'black', 'cosmic', 'PENDING', NOW(), NOW());
