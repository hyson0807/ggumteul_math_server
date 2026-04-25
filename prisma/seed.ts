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
        content: r['question_text'],
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
  console.log('Seeding shop items...');
  const existingShopCount = await prisma.shopItem.count();
  if (existingShopCount === 0) {
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
    console.log(`  10 shop items seeded.`);
  } else {
    console.log(`  ${existingShopCount} shop items already exist, skipping.`);
  }

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
