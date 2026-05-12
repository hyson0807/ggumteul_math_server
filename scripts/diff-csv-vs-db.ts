import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const PID_MAX = 687;

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

type Row = {
  id: number;
  conceptId: number;
  problemType: string;
  difficulty: number;
  content: string;
  imageUrl: string | null;
  choice1: string | null;
  choice2: string | null;
  choice3: string | null;
  choice4: string | null;
  answer: string;
};

function normalizeNullable(v: string | null | undefined): string | null {
  if (v === undefined || v === null) return null;
  const t = v;
  return t === '' ? null : t;
}

async function main() {
  const seedDataDir = path.join(__dirname, '..', 'prisma', 'seed-data');
  const imageDir = path.join(__dirname, '..', 'public', 'problem-images');

  const rawRows = parseCsv(path.join(seedDataDir, 'problem.csv'));
  const imagesOnDisk = new Set(
    fs.existsSync(imageDir) ? fs.readdirSync(imageDir) : [],
  );

  const csvRows: Row[] = rawRows
    .filter((r) => r['problem_id'] && r['concept_id'])
    .map((r) => {
      const id = parseInt(r['problem_id']);
      const imageFile = ['png', 'jpeg', 'jpg'].find((ext) =>
        imagesOnDisk.has(`${id}.${ext}`),
      );
      return {
        id,
        conceptId: parseInt(r['concept_id']),
        problemType: r['problem_type'],
        difficulty: parseInt(r['difficulty']),
        content: r['question_text'].replace(/\\n/g, '\n'),
        imageUrl: imageFile ? `/static/problem-images/${id}.${imageFile}` : null,
        choice1: normalizeNullable(r['choice_1']),
        choice2: normalizeNullable(r['choice_2']),
        choice3: normalizeNullable(r['choice_3']),
        choice4: normalizeNullable(r['choice_4']),
        answer: r['correct_answer'],
      };
    })
    .filter((r) => r.id <= PID_MAX);

  const csvById = new Map<number, Row>(csvRows.map((r) => [r.id, r]));

  const prisma = new PrismaClient();
  const dbRows = await prisma.problem.findMany({
    where: { id: { lte: PID_MAX } },
    select: {
      id: true,
      conceptId: true,
      problemType: true,
      difficulty: true,
      content: true,
      imageUrl: true,
      choice1: true,
      choice2: true,
      choice3: true,
      choice4: true,
      answer: true,
    },
  });
  await prisma.$disconnect();

  const dbById = new Map<number, (typeof dbRows)[number]>(
    dbRows.map((r) => [r.id, r]),
  );

  const csvOnly: number[] = [];
  const dbOnly: number[] = [];
  const mismatches: Array<{ id: number; field: string; csv: any; db: any }> = [];

  for (const [id, csv] of csvById) {
    const db = dbById.get(id);
    if (!db) {
      csvOnly.push(id);
      continue;
    }
    const checks: Array<[string, any, any]> = [
      ['conceptId', csv.conceptId, db.conceptId],
      ['problemType', csv.problemType, db.problemType],
      ['difficulty', csv.difficulty, db.difficulty],
      ['content', csv.content, db.content],
      ['imageUrl', csv.imageUrl, db.imageUrl],
      ['choice1', csv.choice1, db.choice1],
      ['choice2', csv.choice2, db.choice2],
      ['choice3', csv.choice3, db.choice3],
      ['choice4', csv.choice4, db.choice4],
      ['answer', csv.answer, db.answer],
    ];
    for (const [field, c, d] of checks) {
      if (c !== d) mismatches.push({ id, field, csv: c, db: d });
    }
  }
  for (const id of dbById.keys()) {
    if (!csvById.has(id)) dbOnly.push(id);
  }

  csvOnly.sort((a, b) => a - b);
  dbOnly.sort((a, b) => a - b);
  mismatches.sort((a, b) => a.id - b.id || a.field.localeCompare(b.field));

  console.log('='.repeat(70));
  console.log(`CSV ↔ DB diff for PID 1~${PID_MAX}`);
  console.log('='.repeat(70));
  console.log(`CSV rows (PID ≤ ${PID_MAX}): ${csvById.size}`);
  console.log(`DB rows  (PID ≤ ${PID_MAX}): ${dbById.size}`);
  console.log('');

  if (csvOnly.length === 0 && dbOnly.length === 0 && mismatches.length === 0) {
    console.log('✅ ALL MATCH — no differences in PID 1~' + PID_MAX);
  } else {
    if (csvOnly.length > 0) {
      console.log(
        `⚠️  CSV-only PIDs (CSV에 있으나 DB에 없음) — 시드 시 insert됨: ${csvOnly.length}개`,
      );
      console.log('   ' + csvOnly.join(', '));
      console.log('');
    }
    if (dbOnly.length > 0) {
      console.log(
        `ℹ️  DB-only PIDs (DB에 있으나 CSV에 없음) — 시드 영향 없음: ${dbOnly.length}개`,
      );
      console.log('   ' + dbOnly.join(', '));
      console.log('');
    }
    if (mismatches.length > 0) {
      const byPid: Record<number, typeof mismatches> = {};
      for (const m of mismatches) {
        (byPid[m.id] ||= []).push(m);
      }
      const pids = Object.keys(byPid).map(Number);
      console.log(
        `❗ Field mismatches (양쪽에 있으나 필드 값이 다름) — 시드해도 DB 유지됨: ${pids.length}개 PID, ${mismatches.length}개 필드`,
      );
      for (const id of pids) {
        console.log(`\n  PID ${id}:`);
        for (const m of byPid[id]) {
          const csvStr = JSON.stringify(m.csv);
          const dbStr = JSON.stringify(m.db);
          console.log(`    [${m.field}]`);
          console.log(`      CSV: ${csvStr}`);
          console.log(`      DB : ${dbStr}`);
        }
      }
      console.log('');
    }
  }

  console.log('-'.repeat(70));
  console.log('⚠️  Note: prisma db seed uses createMany({ skipDuplicates: true }).');
  console.log('   PID 1~' + PID_MAX + '의 차이는 시드해도 DB에 반영되지 않습니다.');
  console.log('   차이를 DB에 반영하려면 별도의 upsert/update 스크립트가 필요합니다.');
  console.log('-'.repeat(70));

  if (csvOnly.length > 0 || mismatches.length > 0) {
    process.exit(1);
  }
}

main().catch((e) => {
  console.error('Diff script failed:', e);
  process.exit(2);
});
