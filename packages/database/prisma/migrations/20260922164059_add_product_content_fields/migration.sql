-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "careInstructions" TEXT,
ADD COLUMN     "controlRating" INTEGER,
ADD COLUMN     "powerRating" INTEGER,
ADD COLUMN     "specs" JSONB,
ADD COLUMN     "spinRating" INTEGER,
ADD COLUMN     "whoThisIsFor" TEXT;
