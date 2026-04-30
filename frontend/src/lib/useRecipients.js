import { useContext } from 'react'
import { RecipientsContext } from './recipients-context'

export function useRecipients() {
  const context = useContext(RecipientsContext)
  if (!context) {
    throw new Error('useRecipients must be used within a RecipientsProvider')
  }
  return context
}
