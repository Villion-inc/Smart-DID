-- CreateTable
CREATE TABLE "admin_users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'admin',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "video_records" (
    "bookId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NONE',
    "requestCount" INTEGER NOT NULL DEFAULT 0,
    "lastRequestedAt" TIMESTAMP(3),
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "rankingScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "videoUrl" TEXT,
    "subtitleUrl" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "title" TEXT,
    "author" TEXT,
    "publisher" TEXT,
    "coverImageUrl" TEXT,
    "summary" TEXT,
    "category" TEXT,

    CONSTRAINT "video_records_pkey" PRIMARY KEY ("bookId")
);

-- CreateTable
CREATE TABLE "shelf_maps" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "shelfCode" TEXT NOT NULL,
    "mapX" DOUBLE PRECISION NOT NULL,
    "mapY" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shelf_maps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recommendations" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "ageGroup" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "title" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "publisher" TEXT NOT NULL DEFAULT '',
    "summary" TEXT NOT NULL DEFAULT '',
    "coverImageUrl" TEXT,
    "category" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_username_key" ON "admin_users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "shelf_maps_bookId_key" ON "shelf_maps"("bookId");

-- CreateIndex
CREATE INDEX "shelf_maps_shelfCode_idx" ON "shelf_maps"("shelfCode");

-- CreateIndex
CREATE UNIQUE INDEX "recommendations_ageGroup_bookId_key" ON "recommendations"("ageGroup", "bookId");
