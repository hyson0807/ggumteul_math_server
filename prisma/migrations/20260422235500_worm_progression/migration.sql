-- AlterEnum
BEGIN;
CREATE TYPE "ShopCategory_new" AS ENUM ('hat', 'body', 'accessory');
ALTER TABLE "shop_item" ALTER COLUMN "category" TYPE "ShopCategory_new" USING ("category"::text::"ShopCategory_new");
ALTER TYPE "ShopCategory" RENAME TO "ShopCategory_old";
ALTER TYPE "ShopCategory_new" RENAME TO "ShopCategory";
DROP TYPE "public"."ShopCategory_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "building_progress" DROP CONSTRAINT "building_progress_user_id_fkey";

-- DropForeignKey
ALTER TABLE "village" DROP CONSTRAINT "village_user_id_fkey";

-- DropForeignKey
ALTER TABLE "village_item" DROP CONSTRAINT "village_item_shop_item_id_fkey";

-- DropForeignKey
ALTER TABLE "village_item" DROP CONSTRAINT "village_item_village_id_fkey";

-- AlterTable
ALTER TABLE "inventory" DROP COLUMN "quantity";

-- AlterTable
ALTER TABLE "shop_item" DROP COLUMN "unlock_level",
ADD COLUMN     "unlock_stage" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "equipped_accessory_id" TEXT,
ADD COLUMN     "equipped_body_id" TEXT,
ADD COLUMN     "equipped_hat_id" TEXT,
ADD COLUMN     "worm_progress" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "worm_stage" INTEGER NOT NULL DEFAULT 1;

-- DropTable
DROP TABLE "building_progress";

-- DropTable
DROP TABLE "village";

-- DropTable
DROP TABLE "village_item";

-- CreateIndex
CREATE UNIQUE INDEX "inventory_user_id_shop_item_id_key" ON "inventory"("user_id", "shop_item_id");

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_equipped_hat_id_fkey" FOREIGN KEY ("equipped_hat_id") REFERENCES "shop_item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_equipped_body_id_fkey" FOREIGN KEY ("equipped_body_id") REFERENCES "shop_item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_equipped_accessory_id_fkey" FOREIGN KEY ("equipped_accessory_id") REFERENCES "shop_item"("id") ON DELETE SET NULL ON UPDATE CASCADE;
