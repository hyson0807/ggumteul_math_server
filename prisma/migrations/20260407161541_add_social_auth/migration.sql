-- AlterTable
ALTER TABLE "user" ADD COLUMN "google_id" TEXT,
                   ADD COLUMN "apple_id" TEXT,
                   ALTER COLUMN "password_hash" DROP NOT NULL,
                   ALTER COLUMN "grade" SET DEFAULT 1;

-- CreateIndex
CREATE UNIQUE INDEX "user_google_id_key" ON "user"("google_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_apple_id_key" ON "user"("apple_id");
