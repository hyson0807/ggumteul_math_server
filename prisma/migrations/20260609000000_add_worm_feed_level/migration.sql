-- AlterTable: 애벌레 먹이/레벨 컬럼 추가 (수학 진도 worm_stage 와 분리)
ALTER TABLE "user" ADD COLUMN "feed" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "user" ADD COLUMN "feed_consumed" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "user" ADD COLUMN "worm_level" INTEGER NOT NULL DEFAULT 1;
