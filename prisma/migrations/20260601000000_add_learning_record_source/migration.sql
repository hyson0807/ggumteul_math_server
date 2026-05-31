-- CreateEnum
CREATE TYPE "RecordSource" AS ENUM ('DIAGNOSTIC', 'CONCEPT', 'RECOMMENDATION');

-- AlterTable
ALTER TABLE "learning_record" ADD COLUMN "source" "RecordSource" NOT NULL DEFAULT 'CONCEPT';
