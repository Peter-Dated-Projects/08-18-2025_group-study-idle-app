import { useAppSelector } from "../store/hooks";
import { UserSession } from "../store/slices/authSlice";

export function useReduxAuth(): { user: UserSession | null; isLoading: boolean } {
  const { user, isLoading } = useAppSelector((state) => state.auth);

  return {
    user,
    isLoading,
  };
}
