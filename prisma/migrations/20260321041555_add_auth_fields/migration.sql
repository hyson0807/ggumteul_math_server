-- DropForeignKey
ALTER TABLE "inventory" DROP CONSTRAINT "inventory_user_id_fkey";

-- DropForeignKey
ALTER TABLE "learning_record" DROP CONSTRAINT "learning_record_user_id_fkey";

-- DropForeignKey
ALTER TABLE "village" DROP CONSTRAINT "village_user_id_fkey";

-- DropForeignKey
ALTER TABLE "village_item" DROP CONSTRAINT "village_item_village_id_fkey";

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "refresh_token" TEXT,
ADD COLUMN     "tutor_type" TEXT,
ALTER COLUMN "name" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "learning_record" ADD CONSTRAINT "learning_record_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "village" ADD CONSTRAINT "village_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "village_item" ADD CONSTRAINT "village_item_village_id_fkey" FOREIGN KEY ("village_id") REFERENCES "village"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
