/**
 * Recipients List Component
 * Displays list of recipients with search and filter
 */

import { useState } from 'react'
import { Search, Plus, Filter } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import RecipientCard from './RecipientCard'
import { useRecipients } from '@/lib/useRecipients'

export default function RecipientsList({ 
  onPay, 
  onEdit, 
  onDelete,
  onAdd 
}) {
  const { loading, error, searchRecipients, categories, getRecipientsByCategory } = useRecipients()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')

  const filteredRecipients = searchQuery 
    ? searchRecipients(searchQuery)
    : getRecipientsByCategory(selectedCategory)

  return (
    <div className="space-y-4">
      {/* Search and Filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search recipients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Add Button */}
        {onAdd && (
          <Button onClick={onAdd} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            Add Recipient
          </Button>
        )}
      </div>

      {/* Category Filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <Filter className="h-4 w-4 text-gray-500 flex-shrink-0" />
        {categories.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setSelectedCategory(cat.value)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              selectedCategory === cat.value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
          ))}
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredRecipients.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">
            {searchQuery 
              ? 'No recipients found matching your search.' 
              : 'No recipients yet. Add your first recipient to get started!'}
          </p>
          {onAdd && !searchQuery && (
            <Button onClick={onAdd} variant="outline" className="mt-4">
              <Plus className="h-4 w-4 mr-2" />
              Add Recipient
            </Button>
          )}
        </div>
      )}

      {/* Recipients Grid */}
      {!loading && !error && filteredRecipients.length > 0 && (
        <div className="space-y-3">
          {filteredRecipients.map((recipient) => (
            <RecipientCard
              key={recipient.id}
              recipient={recipient}
              onPay={onPay}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}
