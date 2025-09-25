import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux'
import type { RootState, AppDispatch } from './store'

// Typed hooks
export const useAppDispatch = () => useDispatch<AppDispatch>()
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector

// Convenience selectors
export const useAuth = () => useAppSelector(state => state.auth)
export const useInventory = () => useAppSelector(state => state.inventory)
export const useWorld = () => useAppSelector(state => state.world)
export const useTimer = () => useAppSelector(state => state.timer)
export const useTasks = () => useAppSelector(state => state.tasks)
export const useWallet = () => useAppSelector(state => state.wallet)
export const useShop = () => useAppSelector(state => state.shop)
export const useSocial = () => useAppSelector(state => state.social)
export const useLeaderboard = () => useAppSelector(state => state.leaderboard)
export const useNotifications = () => useAppSelector(state => state.notifications)
export const useMusic = () => useAppSelector(state => state.music)
export const useUI = () => useAppSelector(state => state.ui)