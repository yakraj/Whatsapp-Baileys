import { create } from "zustand";
import type { DashboardOverviewResponse } from "@/types/gateway";

interface GatewayDashboardState {
  data: DashboardOverviewResponse | null;
  loading: boolean;
  error: string | null;
  setData: (data: DashboardOverviewResponse) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useGatewayDashboardStore = create<GatewayDashboardState>((set) => ({
  data: null,
  loading: true,
  error: null,
  setData: (data) => set({ data, error: null }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));
