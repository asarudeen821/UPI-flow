/**
 * Checkout Widget Component
 * Main widget UI and logic
 */

export default class CheckoutWidget {
  constructor(container, config) {
    this.container = container;
    this.config = config;
    this.state = {
      loading: false,
      step: 'init', // init, payment, processing, success, failed
      error: null,
      paymentData: null
    };
    this.eventHandlers = {};
    this.socket = null;
  }
  
  /**
   * Render widget
   */
  render() {
    this.container.innerHTML = `
      <div class="checkout-widget ${this.config.theme}">
        <div class="checkout-button" onclick="Checkout.open()">
          <svg class="checkout-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
            <line x1="1" y1="10" x2="23" y2="10"/>
          </svg>
          <span>Pay ${this.formatAmount(this.config.amount, this.config.currency)}</span>
        </div>
        
        <div class="checkout-modal" id="checkout-modal" style="display: none;">
          <div class="checkout-overlay"></div>
          <div class="checkout-content">
            <div class="checkout-header">
              <h3>${this.config.productName || 'Payment'}</h3>
              <button class="checkout-close" onclick="Checkout.close()">×</button>
            </div>
            
            <div class="checkout-body">
              ${this.renderStep()}
            </div>
          </div>
        </div>
      </div>
    `;
    
    this.connectSocket();
  }
  
  /**
   * Render current step
   */
  renderStep() {
    switch (this.state.step) {
      case 'init':
        return this.renderPaymentForm();
      case 'processing':
        return this.renderProcessing();
      case 'success':
        return this.renderSuccess();
      case 'failed':
        return this.renderFailed();
      default:
        return this.renderPaymentForm();
    }
  }
  
  /**
   * Render payment form
   */
  renderPaymentForm() {
    const methods = this.config.methods || ['upi', 'card', 'wallet'];
    
    return `
      <div class="payment-amount">
        <span class="amount-label">Amount</span>
        <span class="amount-value">${this.formatAmount(this.config.amount, this.config.currency)}</span>
      </div>
      
      <div class="payment-methods">
        <h4>Select Payment Method</h4>
        <div class="method-grid">
          ${methods.includes('upi') ? `
            <button class="method-card" data-method="upi" onclick="Checkout.selectMethod('upi')">
              <div class="method-icon">📱</div>
              <span>UPI</span>
            </button>
          ` : ''}
          ${methods.includes('card') ? `
            <button class="method-card" data-method="card" onclick="Checkout.selectMethod('card')">
              <div class="method-icon">💳</div>
              <span>Card</span>
            </button>
          ` : ''}
          ${methods.includes('wallet') ? `
            <button class="method-card" data-method="wallet" onclick="Checkout.selectMethod('wallet')">
              <div class="method-icon">👛</div>
              <span>Wallet</span>
            </button>
          ` : ''}
        </div>
      </div>
      
      ${this.state.error ? `
        <div class="error-message">
          <span>⚠️</span>
          <span>${this.state.error}</span>
        </div>
      ` : ''}
    `;
  }
  
  /**
   * Render processing state
   */
  renderProcessing() {
    return `
      <div class="processing-state">
        <div class="spinner"></div>
        <h4>Processing Payment...</h4>
        <p>Please do not close this window</p>
      </div>
    `;
  }
  
  /**
   * Render success state
   */
  renderSuccess() {
    return `
      <div class="success-state">
        <div class="success-icon">✓</div>
        <h4>Payment Successful!</h4>
        <p>Transaction ID: ${this.state.paymentData?.transactionId || 'N/A'}</p>
        <p>Amount: ${this.formatAmount(this.config.amount, this.config.currency)}</p>
        <button class="btn-close" onclick="Checkout.close()">Close</button>
      </div>
    `;
  }
  
  /**
   * Render failed state
   */
  renderFailed() {
    return `
      <div class="failed-state">
        <div class="failed-icon">✕</div>
        <h4>Payment Failed</h4>
        <p>${this.state.error || 'Something went wrong'}</p>
        <button class="btn-retry" onclick="Checkout.retry()">Try Again</button>
        <button class="btn-close" onclick="Checkout.close()">Close</button>
      </div>
    `;
  }
  
  /**
   * Open modal
   */
  open() {
    const modal = document.getElementById('checkout-modal');
    if (modal) {
      modal.style.display = 'flex';
      this.emit('opened');
    }
  }
  
  /**
   * Close modal
   */
  close() {
    const modal = document.getElementById('checkout-modal');
    if (modal) {
      modal.style.display = 'none';
      this.emit('closed');
    }
  }
  
  /**
   * Select payment method
   */
  async selectMethod(method) {
    this.setState({ loading: true, error: null, step: 'processing' });
    this.emit('payment:initiated', { method });
    
    try {
      // Create payment order
      const response = await fetch(`${this.config.apiUrl}/payments/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          publicKey: this.config.publicKey,
          amount: this.config.amount,
          currency: this.config.currency,
          gateway: this.config.gateway || 'razorpay',
          orderId: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          product: {
            name: this.config.productName || 'Product',
            description: this.config.productDescription || ''
          },
          customer: {
            name: this.config.customer?.name,
            email: this.config.customer?.email,
            phone: this.config.customer?.phone
          },
          metadata: {
            method,
            ...this.config.metadata
          }
        })
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to create payment');
      }
      
      this.state.paymentData = result.data;
      
      // Open gateway checkout
      if (this.config.gateway === 'razorpay') {
        await this.openRazorpay(result.data, method);
      } else if (this.config.gateway === 'stripe') {
        await this.openStripe(result.data, method);
      }
      
    } catch (error) {
      console.error('Payment error:', error);
      this.setState({ 
        loading: false, 
        error: error.message,
        step: 'failed'
      });
      this.emit('payment:failed', { error: error.message });
    }
  }
  
  /**
   * Open Razorpay checkout
   */
  async openRazorpay(options, method) {
    // Check if Razorpay is loaded
    if (typeof Razorpay === 'undefined') {
      // Load Razorpay script dynamically
      await this.loadScript('https://checkout.razorpay.com/v1/checkout.js');
    }
    
    const razorpayOptions = {
      key: options.keyId,
      amount: options.amount * 100,
      currency: options.currency,
      name: this.config.productName || 'Merchant',
      description: this.config.productDescription || '',
      order_id: options.orderId,
      handler: (response) => this.handleRazorpaySuccess(response),
      prefill: options.prefilled || {},
      theme: {
        color: this.config.themeColor || '#2563eb'
      },
      modal: {
        ondismiss: () => {
          this.setState({ loading: false, step: 'init' });
          this.emit('payment:cancelled');
        }
      }
    };
    
    const razorpay = new Razorpay(razorpayOptions);
    razorpay.open();
  }
  
  /**
   * Handle Razorpay success
   */
  async handleRazorpaySuccess(response) {
    this.emit('payment:received', response);
    
    // Verify payment on backend
    try {
      const verifyResponse = await fetch(`${this.config.apiUrl}/payments/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          paymentId: this.state.paymentData.paymentId,
          orderId: this.state.paymentData.orderId,
          gatewayPaymentId: response.razorpay_payment_id,
          signature: response.razorpay_signature,
          amount: this.config.amount,
          gateway: 'razorpay'
        })
      });
      
      const result = await verifyResponse.json();
      
      if (result.success && result.verified) {
        this.setState({
          loading: false,
          step: 'success',
          paymentData: {
            transactionId: response.razorpay_payment_id,
            ...result.data
          }
        });
        this.emit('payment:success', result.data);
      } else {
        throw new Error(result.error || 'Payment verification failed');
      }
    } catch (error) {
      console.error('Verification error:', error);
      this.setState({
        loading: false,
        error: error.message,
        step: 'failed'
      });
      this.emit('payment:failed', { error: error.message });
    }
  }
  
  /**
   * Open Stripe checkout
   */
  async openStripe(options, method) {
    // Check if Stripe is loaded
    if (typeof Stripe === 'undefined') {
      await this.loadScript('https://js.stripe.com/v3/');
    }
    
    const stripe = Stripe(this.config.stripePublishableKey || options.publishableKey);
    
    // Redirect to Stripe Checkout
    const result = await stripe.redirectToCheckout({
      sessionId: options.sessionId
    });
    
    if (result.error) {
      throw new Error(result.error.message);
    }
  }
  
  /**
   * Retry payment
   */
  retry() {
    this.setState({ step: 'init', error: null });
    this.emit('payment:retry');
  }
  
  /**
   * Update configuration
   */
  updateConfig(config) {
    this.config = { ...this.config, ...config };
    this.render();
  }
  
  /**
   * Set state and re-render
   */
  setState(newState) {
    this.state = { ...this.state, ...newState };
    const body = this.container.querySelector('.checkout-body');
    if (body) {
      body.innerHTML = this.renderStep();
    }
  }
  
  /**
   * Connect to Socket.IO for real-time updates
   */
  async connectSocket() {
    // Load Socket.IO client if not available
    if (typeof io === 'undefined') {
      await this.loadScript(`${this.config.socketUrl}/socket.io/socket.io.js`);
    }
    
    this.socket = io(this.config.socketUrl);
    
    this.socket.on('connect', () => {
      console.log('Socket connected');
      if (this.state.paymentData?.paymentId) {
        this.socket.emit('subscribe-payment', this.state.paymentData.paymentId);
      }
    });
    
    this.socket.on('payment:update', (data) => {
      console.log('Payment update:', data);
      if (data.event === 'payment.success') {
        this.setState({
          loading: false,
          step: 'success',
          paymentData: data.data
        });
        this.emit('payment:success', data.data);
      } else if (data.event === 'payment.failed') {
        this.setState({
          loading: false,
          error: 'Payment failed',
          step: 'failed'
        });
        this.emit('payment:failed', data.data);
      }
    });
  }
  
  /**
   * Load external script
   */
  loadScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) {
        return resolve();
      }
      
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }
  
  /**
   * Format amount
   */
  formatAmount(amount, currency) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency || 'INR'
    }).format(amount);
  }
  
  /**
   * Event emitter
   */
  on(event, callback) {
    if (!this.eventHandlers[event]) {
      this.eventHandlers[event] = [];
    }
    this.eventHandlers[event].push(callback);
  }
  
  emit(event, data) {
    if (this.eventHandlers[event]) {
      this.eventHandlers[event].forEach(callback => callback(data));
    }
  }
  
  /**
   * Destroy widget
   */
  destroy() {
    if (this.socket) {
      this.socket.disconnect();
    }
    this.container.innerHTML = '';
    this.eventHandlers = {};
  }
}
