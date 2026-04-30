import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'

import { paymentAPI } from '../../services/paymentAPI'

export const createOrder = createAsyncThunk(
  'payment/createOrder',
  async (payload, { rejectWithValue }) => {
    try {
      const result = await paymentAPI.createPaymentSession(payload)
      if (!result.success) {
        return rejectWithValue(result.error || 'Unable to create payment session')
      }
      return result.data
    } catch (error) {
      return rejectWithValue(error.message)
    }
  }
)

export const confirmOrder = createAsyncThunk(
  'payment/confirmOrder',
  async ({ orderId, paymentId }, { rejectWithValue }) => {
    try {
      const result = await paymentAPI.confirmPayment(orderId, paymentId)
      if (!result.success) {
        return rejectWithValue(result.error || 'Unable to confirm payment')
      }
      return result.data
    } catch (error) {
      return rejectWithValue(error.message)
    }
  }
)

const paymentSlice = createSlice({
  name: 'payment',
  initialState: {
    order: null,
    gatewayOrder: null,
    upiLink: '',
    loading: false,
    confirming: false,
    error: null,
    liveStatus: 'idle',
    lastEvent: null,
  },
  reducers: {
    resetPaymentState(state) {
      state.order = null
      state.gatewayOrder = null
      state.upiLink = ''
      state.loading = false
      state.confirming = false
      state.error = null
      state.liveStatus = 'idle'
      state.lastEvent = null
    },
    applyLivePaymentEvent(state, action) {
      const payload = action.payload || {}
      if (!state.order || payload.orderId !== state.order.orderId) {
        return
      }

      state.liveStatus = payload.status || state.liveStatus
      state.lastEvent = payload
      state.order = payload.payment || state.order
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(createOrder.pending, (state) => {
        state.loading = true
        state.error = null
        state.liveStatus = 'pending'
      })
      .addCase(createOrder.fulfilled, (state, action) => {
        state.loading = false
        state.order = action.payload.order
        state.gatewayOrder = action.payload.gatewayOrder
        state.upiLink = action.payload.upiLink
        state.liveStatus = action.payload.order?.status || 'pending'
      })
      .addCase(createOrder.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload || 'Unable to create payment session'
      })
      .addCase(confirmOrder.pending, (state) => {
        state.confirming = true
        state.error = null
      })
      .addCase(confirmOrder.fulfilled, (state, action) => {
        state.confirming = false
        state.order = action.payload
        state.liveStatus = action.payload?.status || 'success'
      })
      .addCase(confirmOrder.rejected, (state, action) => {
        state.confirming = false
        state.error = action.payload || 'Unable to confirm payment'
      })
  },
})

export const { resetPaymentState, applyLivePaymentEvent } = paymentSlice.actions

export default paymentSlice.reducer
