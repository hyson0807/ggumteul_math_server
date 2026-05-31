-- AlterEnum: toy
ALTER TYPE "ShopCategory" ADD VALUE IF NOT EXISTS 'toy';

-- AlterEnum: window
ALTER TYPE "ShopCategory" ADD VALUE IF NOT EXISTS 'window';

-- AlterTable: toy slot
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "equipped_toy_id" TEXT;

-- AlterTable: window slot
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "equipped_window_id" TEXT;

-- AddForeignKey: toy
ALTER TABLE "user" ADD CONSTRAINT "user_equipped_toy_id_fkey" FOREIGN KEY ("equipped_toy_id") REFERENCES "shop_item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: window
ALTER TABLE "user" ADD CONSTRAINT "user_equipped_window_id_fkey" FOREIGN KEY ("equipped_window_id") REFERENCES "shop_item"("id") ON DELETE SET NULL ON UPDATE CASCADE;
