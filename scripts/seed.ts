import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { User } from "../models/User";
import { Activity } from "../models/Activity";

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("Set MONGODB_URI in .env");
  process.exit(1);
}

async function seed() {
  await mongoose.connect(MONGODB_URI!);

  let user = await User.findOne({ email: "demo@lifetrack.app" });
  if (!user) {
    const hashed = await bcrypt.hash("demo1234", 12);
    user = await User.create({
      name: "Demo User",
      email: "demo@lifetrack.app",
      password: hashed,
    });
    console.log("Created demo user: demo@lifetrack.app / demo1234");
  }

  const exampleActivities = [
    {
      userId: user._id,
      title: "Pickleball with friends",
      category: "Sports",
      tags: ["exercise", "friends"],
      date: new Date("2026-03-10"),
      startTime: "19:00",
      endTime: "21:00",
      duration: 2,
      energyLevel: "high" as const,
      notes: "Played at BGC court",
    },
    {
      userId: user._id,
      title: "Morning coding",
      category: "Work",
      tags: ["coding"],
      date: new Date("2026-03-10"),
      startTime: "09:00",
      endTime: "12:00",
      duration: 3,
      energyLevel: "high" as const,
      notes: "Feature work",
    },
    {
      userId: user._id,
      title: "Team standup",
      category: "Work",
      tags: ["meetings"],
      date: new Date("2026-03-10"),
      startTime: "14:00",
      endTime: "14:30",
      duration: 0.5,
      energyLevel: "medium" as const,
    },
    {
      userId: user._id,
      title: "Church service",
      category: "Church",
      tags: [],
      date: new Date("2026-03-09"),
      startTime: "10:00",
      endTime: "11:30",
      duration: 1.5,
      energyLevel: "medium" as const,
    },
    {
      userId: user._id,
      title: "Family dinner",
      category: "Family",
      tags: [],
      date: new Date("2026-03-09"),
      startTime: "18:00",
      endTime: "19:30",
      duration: 1.5,
      energyLevel: "medium" as const,
    },
  ];

  for (const a of exampleActivities) {
    await Activity.findOneAndUpdate(
      { userId: user._id, title: a.title, date: a.date },
      { $set: a },
      { upsert: true, new: true }
    );
  }

  console.log("Seed complete. Example activities upserted.");
  await mongoose.disconnect();
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
