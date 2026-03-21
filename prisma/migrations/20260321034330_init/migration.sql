-- CreateEnum
CREATE TYPE "ShopCategory" AS ENUM ('building', 'landscape', 'decoration');

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "grade" INTEGER NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "coins" INTEGER NOT NULL DEFAULT 0,
    "stars" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "concept" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "grade" INTEGER NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "concept_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "concept_relation" (
    "id" SERIAL NOT NULL,
    "prerequisite_concept_id" INTEGER NOT NULL,
    "target_concept_id" INTEGER NOT NULL,

    CONSTRAINT "concept_relation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "problem" (
    "id" TEXT NOT NULL,
    "concept_id" INTEGER NOT NULL,
    "difficulty" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "image_url" TEXT,
    "answer" TEXT NOT NULL,
    "explanation" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "problem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_record" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "problem_id" TEXT NOT NULL,
    "correct" BOOLEAN NOT NULL,
    "answer_given" TEXT NOT NULL,
    "time_spent" INTEGER NOT NULL,
    "coins_earned" INTEGER NOT NULL,
    "stars_earned" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "learning_record_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "village" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "village_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "village_item" (
    "id" TEXT NOT NULL,
    "village_id" TEXT NOT NULL,
    "shop_item_id" TEXT NOT NULL,
    "position_x" INTEGER NOT NULL,
    "position_y" INTEGER NOT NULL,
    "building_level" INTEGER NOT NULL DEFAULT 1,
    "placed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "village_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shop_item" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "ShopCategory" NOT NULL,
    "price" INTEGER NOT NULL,
    "image_url" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "unlock_level" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "shop_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "shop_item_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "purchased_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "village_user_id_key" ON "village"("user_id");

-- AddForeignKey
ALTER TABLE "concept_relation" ADD CONSTRAINT "concept_relation_prerequisite_concept_id_fkey" FOREIGN KEY ("prerequisite_concept_id") REFERENCES "concept"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "concept_relation" ADD CONSTRAINT "concept_relation_target_concept_id_fkey" FOREIGN KEY ("target_concept_id") REFERENCES "concept"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "problem" ADD CONSTRAINT "problem_concept_id_fkey" FOREIGN KEY ("concept_id") REFERENCES "concept"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_record" ADD CONSTRAINT "learning_record_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_record" ADD CONSTRAINT "learning_record_problem_id_fkey" FOREIGN KEY ("problem_id") REFERENCES "problem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "village" ADD CONSTRAINT "village_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "village_item" ADD CONSTRAINT "village_item_village_id_fkey" FOREIGN KEY ("village_id") REFERENCES "village"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "village_item" ADD CONSTRAINT "village_item_shop_item_id_fkey" FOREIGN KEY ("shop_item_id") REFERENCES "shop_item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_shop_item_id_fkey" FOREIGN KEY ("shop_item_id") REFERENCES "shop_item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
