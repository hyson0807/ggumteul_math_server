-- CreateIndex
CREATE INDEX "learning_record_user_id_source_created_at_idx" ON "learning_record"("user_id", "source", "created_at" DESC);
