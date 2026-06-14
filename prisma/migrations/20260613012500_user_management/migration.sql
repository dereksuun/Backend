-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'USER');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'USER',
ADD COLUMN "disabledAt" TIMESTAMP(3);

-- Promote the oldest existing user so an upgraded local database keeps an admin.
WITH first_user AS (
  SELECT "id"
  FROM "User"
  ORDER BY "createdAt" ASC
  LIMIT 1
)
UPDATE "User"
SET "role" = 'ADMIN'
WHERE "id" IN (SELECT "id" FROM first_user);
