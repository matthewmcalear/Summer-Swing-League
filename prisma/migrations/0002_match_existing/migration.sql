-- Drop old tables if they exist
DROP TABLE IF EXISTS "_PlayerToRound";
DROP TABLE IF EXISTS "Score";
DROP TABLE IF EXISTS "Round";
DROP TABLE IF EXISTS "Player";

-- Create tables to match existing structure
CREATE TABLE IF NOT EXISTS "members" (
    "id" SERIAL NOT NULL,
    "full_name" TEXT NOT NULL,
    "handicap" DOUBLE PRECISION NOT NULL,
    "email" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_test" BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT "members_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "scores" (
    "id" SERIAL NOT NULL,
    "player" TEXT NOT NULL,
    "holes" INTEGER NOT NULL,
    "gross" INTEGER NOT NULL,
    "handicap" DOUBLE PRECISION NOT NULL,
    "difficulty" DOUBLE PRECISION NOT NULL,
    "group_members" INTEGER NOT NULL,
    "total_points" DOUBLE PRECISION NOT NULL,
    "play_date" TIMESTAMP(3) NOT NULL,
    "course_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "scores_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE UNIQUE INDEX "Member_email_key" ON "members"("email");
CREATE UNIQUE INDEX "Score_memberId_date_courseName_key" ON "scores"("player", "play_date", "course_name");

-- Add foreign key constraint
ALTER TABLE "scores" ADD CONSTRAINT "Score_memberId_fkey" FOREIGN KEY ("player") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE; 