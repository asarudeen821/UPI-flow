import { createContext } from 'react'

export const RecipientsContext = createContext(null)

export const RECIPIENT_CATEGORIES = [
  { value: 'all', label: 'All' },
  { value: 'family', label: 'Family' },
  { value: 'friends', label: 'Friends' },
  { value: 'bills', label: 'Bills' },
  { value: 'business', label: 'Business' },
  { value: 'other', label: 'Other' },
]
