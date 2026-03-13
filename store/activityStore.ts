import { create } from "zustand";
import { ActivityRecord } from "@/types/activity";

interface ActivityState {
  activities: ActivityRecord[];
  setActivities: (activities: ActivityRecord[]) => void;
  addActivity: (activity: ActivityRecord) => void;
  updateActivity: (id: string, activity: Partial<ActivityRecord>) => void;
  removeActivity: (id: string) => void;
}

export const useActivityStore = create<ActivityState>((set) => ({
  activities: [],
  setActivities: (activities) => set({ activities }),
  addActivity: (activity) =>
    set((state) => ({ activities: [activity, ...state.activities] })),
  updateActivity: (id, update) =>
    set((state) => ({
      activities: state.activities.map((a) =>
        a._id === id ? { ...a, ...update } : a
      ),
    })),
  removeActivity: (id) =>
    set((state) => ({
      activities: state.activities.filter((a) => a._id !== id),
    })),
}));
