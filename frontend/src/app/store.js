import { configureStore } from '@reduxjs/toolkit'

import paymentReducer from '../features/payment/paymentSlice'

export const store = configureStore({
  reducer: {
    payment: paymentReducer,
  },
})
