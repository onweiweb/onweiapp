-- The shipper box per category, for the courier parcel size and weight.
-- Nullable: categories without one fall back to the Settings size.
ALTER TABLE "Category" ADD COLUMN     "boxHeightCm" DECIMAL(6,1),
ADD COLUMN     "boxLengthCm" DECIMAL(6,1),
ADD COLUMN     "boxWeightGrams" INTEGER,
ADD COLUMN     "boxWidthCm" DECIMAL(6,1);
