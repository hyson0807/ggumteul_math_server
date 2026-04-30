-- AlterTable
ALTER TABLE "user" ADD COLUMN     "diagnostic_completed_at" TIMESTAMP(3),
ADD COLUMN     "diagnostic_grade" INTEGER,
ADD COLUMN     "diagnostic_score" INTEGER;

