import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

function parseCsv(filePath: string): Record<string, string>[] {
  let content = fs.readFileSync(filePath, 'utf-8');
  if (content.charCodeAt(0) === 0xfeff) content = content.slice(1);
  const lines = content.trim().split('\n');
  const headers = lines[0].split(',');

  return lines.slice(1).map((line) => {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    const record: Record<string, string> = {};
    headers.forEach((header, i) => {
      record[header.trim()] = values[i] ?? '';
    });
    return record;
  });
}

async function main() {
  const seedDataDir = path.join(__dirname, 'seed-data');

  // 1. Seed Concepts
  console.log('Seeding concepts...');
  const concepts = parseCsv(path.join(seedDataDir, 'concept.csv'));

  const conceptData = concepts.map((row, index) => ({
    id: parseInt(row['concept.id']),
    name: row['concept.name'].replace(/\\n/g, '\n'),
    grade: parseInt(row['grade']),
    semester: parseInt(row['semester']),
    order: index + 1,
    knowledgeTag: parseInt(row['knowledgetag']),
  }));

  await prisma.concept.createMany({
    data: conceptData,
    skipDuplicates: true,
  });
  console.log(`  ${conceptData.length} concepts seeded.`);

  // 2. Seed Concept Relations
  console.log('Seeding concept relations...');
  const relations = parseCsv(
    path.join(seedDataDir, 'concept_relation.csv'),
  );

  // concept_relation의 from/to가 실제 존재하는 concept id인지 필터링
  const conceptIds = new Set(conceptData.map((c) => c.id));

  const relationData = relations
    .filter((row) => {
      const fromId = parseInt(row['from_concept_id']);
      const toId = parseInt(row['to_concept_id']);
      return conceptIds.has(fromId) && conceptIds.has(toId);
    })
    .map((row) => ({
      id: parseInt(row['relation_id']),
      prerequisiteConceptId: parseInt(row['from_concept_id']),
      targetConceptId: parseInt(row['to_concept_id']),
    }));

  await prisma.conceptRelation.createMany({
    data: relationData,
    skipDuplicates: true,
  });
  console.log(`  ${relationData.length} concept relations seeded.`);

  // 3. Seed Problems
  console.log('Seeding problems...');
  const problems = parseCsv(path.join(seedDataDir, 'problem.csv'));

  const imageDir = path.join(__dirname, '..', 'public', 'problem-images');
  const imagesOnDisk = new Set(
    fs.existsSync(imageDir) ? fs.readdirSync(imageDir) : [],
  );

  const problemData = problems
    .filter((r) => r['problem_id'] && r['concept_id'])
    .filter((r) => conceptIds.has(parseInt(r['concept_id'])))
    .map((r) => {
      const id = parseInt(r['problem_id']);
      const imageFile = ['png', 'jpeg', 'jpg'].find((ext) =>
        imagesOnDisk.has(`${id}.${ext}`),
      );
      return {
        id,
        conceptId: parseInt(r['concept_id']),
        problemType: r['problem_type'] as 'SUBJ' | 'MCQ',
        difficulty: parseInt(r['difficulty']),
        content: r['question_text'].replace(/\\n/g, '\n'),
        imageUrl: imageFile ? `/static/problem-images/${id}.${imageFile}` : null,
        choice1: r['choice_1'] || null,
        choice2: r['choice_2'] || null,
        choice3: r['choice_3'] || null,
        choice4: r['choice_4'] || null,
        answer: r['correct_answer'],
      };
    });

  await prisma.problem.createMany({
    data: problemData,
    skipDuplicates: true,
  });
  console.log(`  ${problemData.length} problems seeded.`);

  // 4. Seed Shop Items (지렁이 장착 아이템)
  console.log('Seeding shop items (worm)...');
  const existingWormItemCount = await prisma.shopItem.count({
    where: { category: { in: ['hat', 'body', 'accessory'] } },
  });
  if (existingWormItemCount === 0) {
    await prisma.shopItem.createMany({
      data: [
        // 모자 (hat)
        { name: '풀잎 모자', category: 'hat', price: 30, imageUrl: '/static/shop/hat_leaf.png', description: '풀잎으로 만든 작고 귀여운 모자', unlockStage: 1 },
        { name: '노란 리본', category: 'hat', price: 60, imageUrl: '/static/shop/hat_ribbon.png', description: '바람에 살랑이는 노란 리본', unlockStage: 2 },
        { name: '마법사 고깔', category: 'hat', price: 120, imageUrl: '/static/shop/hat_wizard.png', description: '별이 박힌 마법사 고깔모자', unlockStage: 3 },
        { name: '꽃 화관', category: 'hat', price: 200, imageUrl: '/static/shop/hat_flower.png', description: '봄꽃으로 엮은 화려한 화관', unlockStage: 4 },
        // 옷 (body)
        { name: '도토리 갑옷', category: 'body', price: 50, imageUrl: '/static/shop/body_acorn.png', description: '단단한 도토리 껍질로 만든 갑옷', unlockStage: 1 },
        { name: '꽃무늬 옷', category: 'body', price: 100, imageUrl: '/static/shop/body_floral.png', description: '알록달록 꽃무늬가 수놓인 옷', unlockStage: 2 },
        { name: '별빛 망토', category: 'body', price: 250, imageUrl: '/static/shop/body_starcloak.png', description: '반짝이는 별빛 무늬의 망토', unlockStage: 4 },
        // 장신구 (accessory)
        { name: '이슬 안경', category: 'accessory', price: 40, imageUrl: '/static/shop/acc_dewglass.png', description: '이슬방울로 빚은 투명 안경', unlockStage: 1 },
        { name: '나뭇잎 가방', category: 'accessory', price: 80, imageUrl: '/static/shop/acc_leafbag.png', description: '넉넉한 나뭇잎 가방', unlockStage: 2 },
        { name: '반딧불 목걸이', category: 'accessory', price: 180, imageUrl: '/static/shop/acc_firefly.png', description: '어둠 속에서 반짝이는 목걸이', unlockStage: 3 },
      ],
    });
    console.log(`  10 worm shop items seeded.`);
  } else {
    console.log(`  ${existingWormItemCount} worm shop items already exist, skipping.`);
  }

  // 4-1. Seed Furniture Items (방꾸미기 가구) — 테마별 가드
  console.log('Seeding shop items (furniture)...');

  // 딸기 + 초록 (초기 12개)
  const baseThemeCount = await prisma.shopItem.count({
    where: {
      category: { in: ['desk', 'shelf', 'clock', 'bed', 'light', 'rug'] },
      name: { contains: '딸기' },
    },
  });
  if (baseThemeCount === 0) {
    await prisma.shopItem.createMany({
      data: [
        // 책상 (desk) — PNG 안에 의자 포함됨, 별도 의자 카테고리 없음
        { name: '딸기 책상', category: 'desk', price: 450, imageUrl: '/static/furniture/desk_strawberry.png', description: '귀여운 딸기 무늬 책상', unlockStage: 1 },
        { name: '초록 책상', category: 'desk', price: 400, imageUrl: '/static/furniture/desk_green.png', description: '싱그러운 초록 잎사귀 책상', unlockStage: 1 },
        // 책장 (shelf)
        { name: '딸기 책장', category: 'shelf', price: 380, imageUrl: '/static/furniture/shelf_strawberry.png', description: '귀여운 딸기 책장', unlockStage: 1 },
        { name: '초록 책장', category: 'shelf', price: 350, imageUrl: '/static/furniture/shelf_green.png', description: '튼튼한 초록 책장', unlockStage: 1 },
        // 시계 (clock)
        { name: '딸기 시계', category: 'clock', price: 220, imageUrl: '/static/furniture/clock_strawberry.png', description: '벽에 거는 딸기 시계', unlockStage: 1 },
        { name: '초록 시계', category: 'clock', price: 200, imageUrl: '/static/furniture/clock_green.png', description: '벽에 거는 초록 시계', unlockStage: 1 },
        // 침대 (bed)
        { name: '딸기 침대', category: 'bed', price: 600, imageUrl: '/static/furniture/bed_strawberry.png', description: '폭신한 딸기 침대', unlockStage: 1 },
        { name: '초록 침대', category: 'bed', price: 550, imageUrl: '/static/furniture/bed_green.png', description: '폭신한 초록 침대', unlockStage: 1 },
        // 조명 (light)
        { name: '딸기 조명', category: 'light', price: 280, imageUrl: '/static/furniture/light_strawberry.png', description: '아늑한 딸기 조명', unlockStage: 1 },
        { name: '초록 조명', category: 'light', price: 250, imageUrl: '/static/furniture/light_green.png', description: '아늑한 초록 조명', unlockStage: 1 },
        // 러그 (rug)
        { name: '딸기 러그', category: 'rug', price: 320, imageUrl: '/static/furniture/rug_strawberry.png', description: '푹신한 딸기 러그', unlockStage: 1 },
        { name: '초록 러그', category: 'rug', price: 300, imageUrl: '/static/furniture/rug_green.png', description: '푹신한 초록 러그', unlockStage: 1 },
      ],
    });
    console.log(`  12 base furniture shop items seeded (딸기+초록).`);
  } else {
    console.log(`  base furniture already exists, skipping.`);
  }

  // 벽지 (4종) — 방 전체 배경 교체용
  const wallpaperCount = await prisma.shopItem.count({
    where: { category: 'wallpaper' },
  });
  if (wallpaperCount === 0) {
    await prisma.shopItem.createMany({
      data: [
        { name: '핑크 덩굴 벽지', category: 'wallpaper', price: 800, imageUrl: '/static/furniture/wallpaper_pink_vine.png', description: '귀여운 핑크 덩굴 무늬 벽지', unlockStage: 1 },
        { name: '크림 플로럴 벽지', category: 'wallpaper', price: 800, imageUrl: '/static/furniture/wallpaper_cream_floral.png', description: '따뜻한 크림 꽃무늬 벽지', unlockStage: 1 },
        { name: '하늘 블루 벽지', category: 'wallpaper', price: 800, imageUrl: '/static/furniture/wallpaper_sky_blue.png', description: '청량한 하늘색 벽지', unlockStage: 1 },
        { name: '구름 블루 벽지', category: 'wallpaper', price: 900, imageUrl: '/static/furniture/wallpaper_blue_cloud.png', description: '몽글몽글 구름 벽지', unlockStage: 1 },
      ],
    });
    console.log(`  4 wallpaper shop items seeded.`);
  } else {
    console.log(`  wallpaper already exists, skipping.`);
  }

  // 파랑 테마 (3개 — 책상/책장/침대 제외)
  const blueThemeCount = await prisma.shopItem.count({
    where: { name: { contains: '파랑' } },
  });
  if (blueThemeCount === 0) {
    await prisma.shopItem.createMany({
      data: [
        { name: '파랑 시계', category: 'clock', price: 210, imageUrl: '/static/furniture/clock_blue.png', description: '벽에 거는 파랑 시계', unlockStage: 1 },
        { name: '파랑 조명', category: 'light', price: 270, imageUrl: '/static/furniture/light_blue.png', description: '은은한 파랑 조명', unlockStage: 1 },
        { name: '파랑 러그', category: 'rug', price: 310, imageUrl: '/static/furniture/rug_blue.png', description: '폭신한 파랑 러그', unlockStage: 1 },
      ],
    });
    console.log(`  3 blue furniture shop items seeded.`);
  } else {
    console.log(`  blue furniture already exists, skipping.`);
  }

  // 노랑 테마 (7개)
  const yellowThemeCount = await prisma.shopItem.count({
    where: { name: { contains: '노랑' } },
  });
  if (yellowThemeCount === 0) {
    await prisma.shopItem.createMany({
      data: [
        { name: '노랑 러그', category: 'rug', price: 330, imageUrl: '/static/furniture/rug_yellow.jpeg', description: '포근한 노랑 러그', unlockStage: 1 },
        { name: '노랑 시계', category: 'clock', price: 215, imageUrl: '/static/furniture/clock_yellow.jpeg', description: '벽에 거는 노랑 시계', unlockStage: 1 },
        { name: '노랑 장난감', category: 'toy', price: 340, imageUrl: '/static/furniture/toy_yellow.jpeg', description: '귀여운 노랑 장난감', unlockStage: 1 },
        { name: '노랑 조명', category: 'light', price: 260, imageUrl: '/static/furniture/light_yellow.jpeg', description: '따뜻한 노랑 조명', unlockStage: 1 },
        { name: '노랑 책상', category: 'desk', price: 430, imageUrl: '/static/furniture/desk_yellow.jpeg', description: '밝은 노랑 책상', unlockStage: 1 },
        { name: '노랑 책장', category: 'shelf', price: 370, imageUrl: '/static/furniture/shelf_yellow.jpeg', description: '튼튼한 노랑 책장', unlockStage: 1 },
        { name: '노랑 침대', category: 'bed', price: 560, imageUrl: '/static/furniture/bed_yellow.jpeg', description: '폭신한 노랑 침대', unlockStage: 1 },
      ],
    });
    console.log(`  7 yellow furniture shop items seeded.`);
  } else {
    console.log(`  yellow furniture already exists, skipping.`);
  }

  // 5. Seed Diagnostic Problems (PID 10001~)
  console.log('Seeding diagnostic problems...');
  const diagnostics = parseCsv(path.join(seedDataDir, 'diagnostic.csv'));

  const diagnosticData = diagnostics
    .filter((r) => r['id'] && r['concept_id'])
    .filter((r) => conceptIds.has(parseInt(r['concept_id'])))
    .map((r) => {
      const id = parseInt(r['id']);
      const imageFile = ['png', 'jpeg', 'jpg'].find((ext) =>
        imagesOnDisk.has(`${id}.${ext}`),
      );
      return {
        id,
        conceptId: parseInt(r['concept_id']),
        problemType: r['problem_type'] as 'SUBJ' | 'MCQ',
        difficulty: parseInt(r['difficulty']),
        content: r['content'].replace(/\\n/g, '\n'),
        imageUrl: imageFile ? `/static/problem-images/${id}.${imageFile}` : null,
        choice1: r['choice_1'] || null,
        choice2: r['choice_2'] || null,
        choice3: r['choice_3'] || null,
        choice4: r['choice_4'] || null,
        answer: r['answer'],
        explanation: r['explanation'] || null,
      };
    });

  await prisma.problem.createMany({
    data: diagnosticData,
    skipDuplicates: true,
  });
  console.log(`  ${diagnosticData.length} diagnostic problems seeded.`);

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
