-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ShopCategory" ADD VALUE 'desk';
ALTER TYPE "ShopCategory" ADD VALUE 'shelf';
ALTER TYPE "ShopCategory" ADD VALUE 'clock';
ALTER TYPE "ShopCategory" ADD VALUE 'bed';
ALTER TYPE "ShopCategory" ADD VALUE 'light';
ALTER TYPE "ShopCategory" ADD VALUE 'rug';
ALTER TYPE "ShopCategory" ADD VALUE 'wallpaper';

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "equipped_bed_id" TEXT,
ADD COLUMN     "equipped_clock_id" TEXT,
ADD COLUMN     "equipped_desk_id" TEXT,
ADD COLUMN     "equipped_light_id" TEXT,
ADD COLUMN     "equipped_rug_id" TEXT,
ADD COLUMN     "equipped_shelf_id" TEXT,
ADD COLUMN     "equipped_wallpaper_id" TEXT;

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_equipped_desk_id_fkey" FOREIGN KEY ("equipped_desk_id") REFERENCES "shop_item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_equipped_shelf_id_fkey" FOREIGN KEY ("equipped_shelf_id") REFERENCES "shop_item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_equipped_clock_id_fkey" FOREIGN KEY ("equipped_clock_id") REFERENCES "shop_item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_equipped_bed_id_fkey" FOREIGN KEY ("equipped_bed_id") REFERENCES "shop_item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_equipped_light_id_fkey" FOREIGN KEY ("equipped_light_id") REFERENCES "shop_item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_equipped_rug_id_fkey" FOREIGN KEY ("equipped_rug_id") REFERENCES "shop_item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_equipped_wallpaper_id_fkey" FOREIGN KEY ("equipped_wallpaper_id") REFERENCES "shop_item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

