/*
  Warnings:

  - Added the required column `semester` to the `concept` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "concept" ADD COLUMN     "knowledge_tag" INTEGER,
ADD COLUMN     "semester" INTEGER NOT NULL,
ALTER COLUMN "id" DROP DEFAULT;
DROP SEQUENCE "concept_id_seq";
