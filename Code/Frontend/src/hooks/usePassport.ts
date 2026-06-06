import { useQuery } from "@tanstack/react-query";
import { fetchPassport } from "@/services/passport";

export function usePassport(userId: string) {
  return useQuery({
    queryKey: ["passport", userId],
    queryFn: () => fetchPassport(userId),
    enabled: !!userId,
  });
}
