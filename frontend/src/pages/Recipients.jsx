/**
 * Recipients Page
 * Manage saved payment recipients
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Users } from 'lucide-react'
import RecipientsList from '@/components/RecipientsList'
import RecipientForm from '@/components/RecipientForm'
import { useRecipients } from '@/lib/useRecipients'

export default function Recipients() {
  const navigate = useNavigate()
  const { addRecipient, updateRecipient, deleteRecipient } = useRecipients()
  const [showForm, setShowForm] = useState(false)
  const [editingRecipient, setEditingRecipient] = useState(null)
  const [loading, setLoading] = useState(false)

  function handleAddClick() {
    setEditingRecipient(null)
    setShowForm(true)
  }

  function handleEditClick(recipient) {
    setEditingRecipient(recipient)
    setShowForm(true)
  }

  function handleCancelClick() {
    setShowForm(false)
    setEditingRecipient(null)
  }

  async function handleSubmit(formData) {
    setLoading(true)

    try {
      let result
      if (editingRecipient) {
        result = await updateRecipient(editingRecipient.id, formData)
      } else {
        result = await addRecipient(formData)
      }

      if (result.success) {
        setShowForm(false)
        setEditingRecipient(null)
      }
    } catch (error) {
      console.error('Failed to save recipient:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteClick(recipient) {
    if (!confirm(`Are you sure you want to delete "${recipient.nickname}"?`)) {
      return
    }

    try {
      await deleteRecipient(recipient.id)
    } catch (error) {
      console.error('Failed to delete recipient:', error)
    }
  }

  function handlePayClick(recipient) {
    // Navigate to payment page with recipient details
    const params = new URLSearchParams({
      mode: recipient.payment_method,
      [recipient.payment_method]: recipient.payment_method === 'upi_id' ? recipient.upi_id : recipient.mobile_number,
      name: recipient.name,
      recipientId: recipient.id
    })
    navigate(`/payment?${params.toString()}`)
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900">
            <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Recipients
            </h1>
            <p className="text-sm text-gray-500">
              Manage your saved payment recipients
            </p>
          </div>
        </div>

        {!showForm && (
          <Button onClick={handleAddClick} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            Add Recipient
          </Button>
        )}
      </div>

      {/* Form or List */}
      {showForm ? (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingRecipient ? 'Edit Recipient' : 'Add New Recipient'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RecipientForm
              key={editingRecipient?.id || 'new-recipient'}
              recipient={editingRecipient}
              onSubmit={handleSubmit}
              onCancel={handleCancelClick}
              loading={loading}
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <RecipientsList
              onPay={handlePayClick}
              onEdit={handleEditClick}
              onDelete={handleDeleteClick}
              onAdd={handleAddClick}
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
