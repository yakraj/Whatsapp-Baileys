"use client";

import { useCallback, useEffect } from "react";
import { ApiClientError, apiClient } from "@/lib/api-client";
import { useGatewayDashboardStore } from "@/lib/stores/use-gateway-dashboard-store";
import type { DashboardOverviewResponse } from "@/types/gateway";

export function useDashboardData() {
  const { data, loading, error, setData, setError, setLoading } =
    useGatewayDashboardStore();

  const refresh = useCallback(async () => {
    setLoading(true);

    try {
      const response = await apiClient.get<{ data: DashboardOverviewResponse }>(
        "/api/v1/dashboard/overview"
      );

      setData(response.data);
      setError(null);
    } catch (requestError) {
      if (requestError instanceof ApiClientError) {
        setError(requestError.message);
      } else {
        setError("Failed to load dashboard data");
      }
    } finally {
      setLoading(false);
    }
  }, [setData, setError, setLoading]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}
