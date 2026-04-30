/**
 * Base44 SDK Mock for Local Development
 * In production, Base44 injects the global `base44` object
 * This mock allows local testing without the platform
 */

// In-memory storage for recipients (mock database)
let mockRecipients = [
  {
    id: 'mock_rcp_1',
    name: 'Mom',
    payment_method: 'upi_id',
    upi_id: '9876543210@oksbi',
    nickname: 'Mom',
    category: 'family',
    last_amount: 5000,
    last_used: new Date().toISOString(),
    usage_count: 25,
    recipient_id: 'RCPMOM123',
    created_date: new Date().toISOString(),
    updated_date: new Date().toISOString(),
    created_by: 'mock_user'
  },
  {
    id: 'mock_rcp_2',
    name: 'Electricity Board',
    payment_method: 'upi_id',
    upi_id: 'electricity@paytm',
    nickname: 'Electricity',
    category: 'bills',
    last_amount: 1200,
    last_used: new Date().toISOString(),
    usage_count: 12,
    recipient_id: 'RCPELEC456',
    created_date: new Date().toISOString(),
    updated_date: new Date().toISOString(),
    created_by: 'mock_user'
  },
  {
    id: 'mock_rcp_3',
    name: 'John Doe',
    payment_method: 'mobile_number',
    mobile_number: '9876543210',
    nickname: 'John',
    category: 'friends',
    last_amount: 500,
    last_used: new Date().toISOString(),
    usage_count: 8,
    recipient_id: 'RCPJOHN789',
    created_date: new Date().toISOString(),
    updated_date: new Date().toISOString(),
    created_by: 'mock_user'
  }
];

const mockBase44 = {
  entities: {
    Transaction: {
      async create(data) {
        console.log('[Base44 Mock] Transaction.create:', data);
        return {
          id: 'mock_' + Date.now(),
          ...data,
          created_date: new Date().toISOString(),
          updated_date: new Date().toISOString(),
          created_by: 'mock_user'
        };
      },

      async list(query = {}) {
        console.log('[Base44 Mock] Transaction.list:', query);
        // Return mock transactions
        const mockTransactions = [
          {
            id: 'mock_1',
            payment_method: 'upi_id',
            upi_id: 'user@oksbi',
            recipient_name: 'John Doe',
            amount: 500,
            note: 'Payment for services',
            status: 'success',
            transaction_id: 'TXN1234567890',
            created_date: new Date().toISOString(),
            updated_date: new Date().toISOString(),
            created_by: 'mock_user'
          },
          {
            id: 'mock_2',
            payment_method: 'mobile_number',
            mobile_number: '9876543210',
            recipient_name: 'Jane Smith',
            amount: 1000,
            note: 'Reimbursement',
            status: 'pending',
            transaction_id: 'TXN0987654321',
            created_date: new Date().toISOString(),
            updated_date: new Date().toISOString(),
            created_by: 'mock_user'
          }
        ];

        let filtered = mockTransactions;
        if (query.where?.status) {
          filtered = filtered.filter(t => t.status === query.where.status);
        }

        const skip = query.skip || 0;
        const limit = query.limit || 20;

        return {
          items: filtered.slice(skip, skip + limit),
          total: filtered.length
        };
      },

      async get({ id }) {
        console.log('[Base44 Mock] Transaction.get:', id);
        return {
          id,
          payment_method: 'upi_id',
          upi_id: 'user@oksbi',
          recipient_name: 'John Doe',
          amount: 500,
          status: 'success',
          transaction_id: 'TXN1234567890',
          created_date: new Date().toISOString(),
          updated_date: new Date().toISOString(),
          created_by: 'mock_user'
        };
      },

      async update({ id }, data) {
        console.log('[Base44 Mock] Transaction.update:', id, data);
        return {
          id,
          ...data,
          updated_date: new Date().toISOString()
        };
      }
    },

    Recipient: {
      async create(data) {
        console.log('[Base44 Mock] Recipient.create:', data);
        const newRecipient = {
          id: 'mock_rcp_' + Date.now(),
          ...data,
          recipient_id: 'RCP' + Date.now(),
          created_date: new Date().toISOString(),
          updated_date: new Date().toISOString(),
          created_by: 'mock_user'
        };
        mockRecipients.push(newRecipient);
        return newRecipient;
      },

      async list(query = {}) {
        console.log('[Base44 Mock] Recipient.list:', query);
        let filtered = [...mockRecipients];

        // Filter by category if provided
        if (query.where?.category) {
          filtered = filtered.filter(r => r.category === query.where.category);
        }

        // Search by name, nickname, or UPI/mobile
        if (query.search) {
          const searchLower = query.search.toLowerCase();
          filtered = filtered.filter(r =>
            r.name.toLowerCase().includes(searchLower) ||
            r.nickname.toLowerCase().includes(searchLower) ||
            (r.upi_id && r.upi_id.toLowerCase().includes(searchLower)) ||
            (r.mobile_number && r.mobile_number.includes(searchLower))
          );
        }

        // Sort by last_used (default) or name
        const sortBy = query.sortBy || 'last_used';
        const order = query.order === 'asc' ? 1 : -1;
        filtered.sort((a, b) => {
          if (a[sortBy] < b[sortBy]) return -1 * order;
          if (a[sortBy] > b[sortBy]) return 1 * order;
          return 0;
        });

        const skip = query.skip || 0;
        const limit = query.limit || 50;

        return {
          items: filtered.slice(skip, skip + limit),
          total: filtered.length
        };
      },

      async get({ id }) {
        console.log('[Base44 Mock] Recipient.get:', id);
        const recipient = mockRecipients.find(r => r.id === id);
        return recipient || null;
      },

      async getByRecipientId(recipientId) {
        console.log('[Base44 Mock] Recipient.getByRecipientId:', recipientId);
        const recipient = mockRecipients.find(r => r.recipient_id === recipientId);
        return recipient || null;
      },

      async update({ id }, data) {
        console.log('[Base44 Mock] Recipient.update:', id, data);
        const index = mockRecipients.findIndex(r => r.id === id);
        if (index === -1) return null;
        
        mockRecipients[index] = {
          ...mockRecipients[index],
          ...data,
          updated_date: new Date().toISOString()
        };
        return mockRecipients[index];
      },

      async delete({ id }) {
        console.log('[Base44 Mock] Recipient.delete:', id);
        const index = mockRecipients.findIndex(r => r.id === id);
        if (index === -1) return { success: false };
        
        mockRecipients.splice(index, 1);
        return { success: true };
      }
    }
  },

  auth: {
    async me() {
      console.log('[Base44 Mock] Auth.me');
      return {
        id: 'mock_user',
        email: 'user@example.com',
        name: 'Mock User',
        created_date: new Date().toISOString()
      };
    },

    async logout() {
      console.log('[Base44 Mock] Auth.logout');
      return { success: true };
    },

    redirectToLogin(redirectUri) {
      console.log('[Base44 Mock] Auth.redirectToLogin:', redirectUri);
      // In production, this returns the actual OAuth URL
      return `https://app.base44.com/oauth/authorize?redirect_uri=${encodeURIComponent(redirectUri || '')}`;
    }
  },

  settings: {
    async getPublic() {
      console.log('[Base44 Mock] Settings.getPublic');
      return {
        app_name: 'Payment App',
        rbi_compliant: true,
        encryption: '256-bit'
      };
    }
  }
};

/**
 * Get Base44 instance
 * Uses global base44 if available (production), otherwise mock (development)
 */
export function getBase44() {
  // Check if running in Base44 platform (global base44 object)
  if (typeof globalThis.base44 !== 'undefined') {
    console.log('[Base44] Using platform SDK');
    return globalThis.base44;
  }

  // Check for window.base44 (browser)
  if (typeof window !== 'undefined' && window.base44) {
    console.log('[Base44] Using platform SDK (window)');
    return window.base44;
  }

  // Fall back to mock for local development
  console.log('[Base44] Using mock SDK (development mode)');
  return mockBase44;
}

export default getBase44;
