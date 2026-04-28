import { PrismaClient, ProblemType, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

type Update = { id: number } & Prisma.ProblemUpdateInput;

const updates: Update[] = [
  { id: 104, content: '오른쪽에서 왼쪽으로 갈수록 수가 얼마씩 작아지는지 구하세요.' },
  { id: 238, content: '다음 뺄셈의 결과는 무엇인가요? 524 - 156 = ?', answer: '368' },
  { id: 239, content: '다음 중 계산 결과가 가장 큰 것은 무엇인가요?', imageUrl: null, problemType: ProblemType.MCQ, choice1: '543-189', choice2: '621-456', choice3: '834-478', choice4: '712-345', answer: '4' },
  { id: 240, imageUrl: '/static/problem-images/240.jpeg' },
  { id: 293, answer: 'ㄴ' },
  { id: 294, content: '', answer: '5시 36분 42초' },
  { id: 304, answer: 'ㄴ' },
  { id: 308, content: '단위분수는 분모가 클수록 더 작을까요?\n맞으면 O, 틀리면 X를 써 보세요.' },
  { id: 310, content: '' },
  { id: 314, content: '피자 한 판을 승완이와 남희가 다음과 같이 나누어 먹었습니다. 남희가 먹은 피자의 양을 소수로 나타내어 보세요.', imageUrl: '/static/problem-images/314.jpeg' },
  { id: 334, content: '한 변의 길이가 9인 정사각형을 겹쳐지지 않게 이어 붙여서 다음과 같은 정사각형을 만들었습니다. 사각형 네 변 길이의 합을 쓰시오' },
  { id: 335, content: '' },
  { id: 345, content: '크기가 같은 두 원의 겹쳐진 부분에 작은 원을 맞닿게 그린 것입니다. 작은 원의 반지름은 몇 cm 입니까?' },
  { id: 347, content: '그림에서 삼각형 ㄱㄴㄷ의 세 변의 길이의 합이 22 cm 일 때 작은 원의 반지름은 몇 cm 인지 구하시오.' },
  { id: 348, answer: '3' },
  { id: 352, content: '' },
  { id: 353, content: '' },
  { id: 361, problemType: ProblemType.MCQ },
  { id: 363, content: '분수를 자연수로 표현해 보세요.\n8/2' },
  { id: 364, content: '분수를 자연수로 표현해 보세요. \n64/4' },
  { id: 365, content: '분수를 자연수로 표현해 보세요.\n124/4' },
  { id: 380, answer: '3.7' },
  { id: 383, answer: '9' },
  { id: 384, content: '빈칸 안에 알맞은 수를 써넣으세요.' },
  { id: 385, content: '두 그릇의 들이의 합은 몇 L입니까?', answer: '4.45' },
  { id: 386, content: '들이가 적은 것부터 순서대로 기호를 써 보세요.' },
  { id: 391, content: '그림에서 동화책 한 권의 무게가 640g 일 때 요구르트 한 개의 무게는 몇 g 입니까?' },
  { id: 392, content: '다음에 해당하는 무게를 g 단위로 하여 쓰세요.', imageUrl: '/static/problem-images/392.jpg' },
  { id: 393, content: '바이올린과 아코디언의 무게는 다음과 같습니다. 바이올린과 아코디언의 무게는 모두 몇 g 입니까?' },
  { id: 396, content: '멜론을 좋아하는 학생은 참외를 좋아하는 학생보다 몇 명 더 많을까요?' },
  { id: 405, content: "민준이네 학교 3학년 학생들이 좋아하는 동물을 조사했습니다. 강아지를 좋아하는 학생은 24명입니다. 이 자료를 그림그래프로 나타낼 때, '큰 스마일' 그림이 10명, '작은 스마일' 그림이 1명을 나타낸다면 강아지를 좋아하는 학생 수는 큰 스마일 2개, 작은 스마일 3개가 맞을까요?\n맞으면 O, 틀리면 X를 쓰세요." },
  { id: 415, content: '각자의 수 카드를 한 번씩만 사용하여 승민이는 가장 작은수를, 서연이는 가장 큰 수를 만들었다면 두 사람이 만든 수의 합은 얼마입니까?' },
  { id: 418, content: '' },
  { id: 421, answer: '7' },
  { id: 437, content: '60을 4로 나누면 몫은 무엇일까요?', imageUrl: null },
  { id: 439, content: '다음 색 도화지의 긴 변을 6 cm 씩 자르고, 짧은 변을 5 cm 씩 잘라서 카드를 만들려고 합니다. 카드는 몇 장까지 만들 수 있습니까?' },
  { id: 452, content: '' },
  { id: 466, content: '대한이와 민국이는 양궁대회에 나갔습니다. \n대한이가 10점 과녁에 3발을 맞혔을 때 민국이가 몇 발을 10점에 맞혀야 100점을 만들 수 있을까요?', answer: '7' },
  { id: 514, imageUrl: '/static/problem-images/514.png' },
  { id: 526, answer: '9' },
  { id: 548, answer: '4' },
  { id: 567, imageUrl: '/static/problem-images/567.jpg' },
  { id: 568, imageUrl: '/static/problem-images/568.png' },
  { id: 576, content: '>,=,< 중 ○ 안에 들어갈 알맞은 기호를 쓰세요.' },
  { id: 583, imageUrl: '/static/problem-images/583.jpg', choice2: '7', choice3: '13', choice4: '24', answer: '3' },
  { id: 594, content: '>,=,< 중 ○ 안에 들어갈 알맞은 기호를 쓰세요.' },
  { id: 616, choice2: '초록색 점선을 접으면 마주보는 수가 같다.' },
  { id: 623, content: '쌓은 모양을 보고, 규칙을 찾아 다음에 올 쌓기나무의 개수를 고르세요.', choice1: '1개', choice2: '2개', choice3: '4개', choice4: '6개' },
  { id: 637, imageUrl: '/static/problem-images/637.png' },
  { id: 639, answer: '3' },
];

async function main() {
  console.log(`Applying ${updates.length} problem updates...`);
  await prisma.$transaction(
    updates.map(({ id, ...data }) =>
      prisma.problem.update({ where: { id }, data }),
    ),
  );
  console.log('Done.');
}

main()
  .catch((e) => {
    console.error('Update failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
