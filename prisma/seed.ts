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
      const hasImage = imagesOnDisk.has(`${id}.png`);
      return {
        id,
        conceptId: parseInt(r['concept_id']),
        problemType: r['problem_type'] as 'SUBJ' | 'MCQ',
        difficulty: parseInt(r['difficulty']),
        content: r['question_text'],
        imageUrl: hasImage ? `/static/problem-images/${id}.png` : null,
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
