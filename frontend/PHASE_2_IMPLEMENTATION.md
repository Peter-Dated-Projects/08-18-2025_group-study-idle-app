# 🚀 Redux Integration - Phase 2: High-Impact Features

## ✅ Phase 1 Completed

- Redux store setup with 12 feature slices
- Redux Provider integrated into garden page
- Auth slice with exact same interface as useSessionAuth
- Test component added for verification

## 🎯 Phase 2: Timer + Bank Balance Integration (Next Priority)

### Step 1: Integrate Timer State

Replace the existing timer state in `PomoBlockTimer.tsx` with Redux:

**Current Pattern:**

```tsx
// In PomoBlockTimer.tsx
const [currentPhase, setCurrentPhase] = useState<PomoBlockPhase>("idle");
const [timeLeft, setTimeLeft] = useState(settings.workDuration * 60);
const [isRunning, setIsRunning] = useState(false);
```

**Redux Pattern:**

```tsx
// Replace with Redux
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { startTimer, pauseTimer, tick, completePhase } from "@/store/slices/timerSlice";

const dispatch = useAppDispatch();
const timer = useAppSelector((state) => state.timer);
```

### Step 2: Connect Bank Balance to Redux

**Current Pattern in BankBalance.tsx:**

```tsx
const [balance, setBalance] = useState<number>(0);
const fetchBalance = async () => {
  // API call
  setBalance(data.balance);
};
```

**Redux Pattern:**

```tsx
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { fetchBalance, updateBalance } from "@/store/slices/walletSlice";

const dispatch = useAppDispatch();
const wallet = useAppSelector((state) => state.wallet);
```

### Step 3: WebSocket Integration

Update your WebSocket listeners to dispatch Redux actions:

```tsx
// In your WebSocket manager
useEffect(() => {
  const handlePomoBankUpdate = (event) => {
    dispatch(updateBalance(event.balance));
  };

  websocket.on("pomo-bank-updated", handlePomoBankUpdate);
  return () => websocket.off("pomo-bank-updated", handlePomoBankUpdate);
}, [dispatch]);
```

## 🔧 Implementation Steps

1. **Test Redux Foundation** (5 minutes)

   - Start your dev server: `npm run dev`
   - Visit `/garden` page
   - Check that the red Redux Test box appears
   - Click "Test Auth" button to verify Redux auth works

2. **Replace Timer Component** (30 minutes)

   - Copy `PomoBlockTimer.tsx` to `PomoBlockTimer.backup.tsx`
   - Replace timer state with Redux selectors
   - Replace timer actions with Redux dispatches
   - Test timer functionality

3. **Replace Bank Balance** (20 minutes)

   - Update `BankBalance.tsx` to use Redux wallet state
   - Remove local balance state
   - Connect WebSocket updates to Redux

4. **Test Integration** (15 minutes)
   - Verify timer works correctly
   - Verify bank balance updates automatically
   - Verify earnings are properly added to wallet

## 🎉 Expected Benefits After Phase 2

- **Timer state persists** across component re-renders
- **Bank balance updates automatically** via WebSocket without prop drilling
- **Reduced API calls** through centralized balance management
- **Consistent state** between timer earnings and bank display

## 📋 Files to Modify

1. `/frontend/src/components/garden/tools/PomoBlockTimer.tsx`
2. `/frontend/src/components/garden/ui/BankBalance.tsx`
3. `/frontend/src/components/garden/ui/GardenMenu.tsx` (if it uses balance)
4. Any WebSocket event handlers that update balance

## 🚦 Next Phase Preview

**Phase 3: Inventory + World State** will tackle:

- Replacing `worldEditingService` singleton with Redux
- Connecting `StructuresModal` to Redux inventory
- Updating `visualWorldUpdateService` to read from Redux
- Optimistic structure placement updates

Ready to proceed? Let's test the Redux foundation first!
