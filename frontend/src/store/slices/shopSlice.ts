import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'

export interface ShopItem {
  id: string
  name: string
  price: number
  type: 'structure' | 'cosmetic' | 'boost'
  description: string
  image: string
  inStock: boolean
}

export interface Purchase {
  itemId: string
  quantity: number
  totalCost: number
}

export interface ShopState {
  items: ShopItem[]
  cart: Purchase[]
  isLoading: boolean
  isPurchasing: boolean
  error: string | null
  lastUpdated: number | null
}

const initialState: ShopState = {
  items: [],
  cart: [],
  isLoading: false,
  isPurchasing: false,
  error: null,
  lastUpdated: null,
}

// Async thunks
export const fetchShopItems = createAsyncThunk(
  'shop/fetchShopItems',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/shop/items', {
        credentials: 'include',
      })
      
      if (!response.ok) {
        return rejectWithValue('Failed to fetch shop items')
      }
      
      const data = await response.json()
      return data.items
    } catch (error) {
      return rejectWithValue('Network error')
    }
  }
)

export const purchaseItem = createAsyncThunk(
  'shop/purchaseItem',
  async (
    { userId, itemId, quantity }: { userId: string; itemId: string; quantity: number },
    { rejectWithValue }
  ) => {
    try {
      const response = await fetch('/api/shop/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          user_id: userId,
          item_id: itemId,
          quantity,
        }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        return rejectWithValue(errorData.message || 'Purchase failed')
      }
      
      const data = await response.json()
      return { itemId, quantity, data }
    } catch (error) {
      return rejectWithValue('Network error')
    }
  }
)

const shopSlice = createSlice({
  name: 'shop',
  initialState,
  reducers: {
    addToCart: (state, action: PayloadAction<Purchase>) => {
      const existingItem = state.cart.find(item => item.itemId === action.payload.itemId)
      if (existingItem) {
        existingItem.quantity += action.payload.quantity
        existingItem.totalCost += action.payload.totalCost
      } else {
        state.cart.push(action.payload)
      }
    },
    removeFromCart: (state, action: PayloadAction<string>) => {
      state.cart = state.cart.filter(item => item.itemId !== action.payload)
    },
    clearCart: (state) => {
      state.cart = []
    },
    updateItemStock: (state, action: PayloadAction<{ itemId: string; inStock: boolean }>) => {
      const item = state.items.find(item => item.id === action.payload.itemId)
      if (item) {
        item.inStock = action.payload.inStock
      }
    },
    clearError: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Shop Items
      .addCase(fetchShopItems.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchShopItems.fulfilled, (state, action) => {
        state.isLoading = false
        state.items = action.payload
        state.lastUpdated = Date.now()
      })
      .addCase(fetchShopItems.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      // Purchase Item
      .addCase(purchaseItem.pending, (state) => {
        state.isPurchasing = true
        state.error = null
      })
      .addCase(purchaseItem.fulfilled, (state, action) => {
        state.isPurchasing = false
        // Remove purchased item from cart
        state.cart = state.cart.filter(item => item.itemId !== action.payload.itemId)
        state.lastUpdated = Date.now()
      })
      .addCase(purchaseItem.rejected, (state, action) => {
        state.isPurchasing = false
        state.error = action.payload as string
      })
  },
})

export const {
  addToCart,
  removeFromCart,
  clearCart,
  updateItemStock,
  clearError,
} = shopSlice.actions

export default shopSlice.reducer