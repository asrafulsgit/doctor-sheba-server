-- CreateTable
CREATE TABLE "health_tip_views" (
    "id" TEXT NOT NULL,
    "healthTipId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "health_tip_views_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "health_tip_views_userId_idx" ON "health_tip_views"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "health_tip_views_healthTipId_userId_key" ON "health_tip_views"("healthTipId", "userId");

-- AddForeignKey
ALTER TABLE "health_tip_views" ADD CONSTRAINT "health_tip_views_healthTipId_fkey" FOREIGN KEY ("healthTipId") REFERENCES "health_tips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_tip_views" ADD CONSTRAINT "health_tip_views_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
