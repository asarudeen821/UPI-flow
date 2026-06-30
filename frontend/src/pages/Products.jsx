import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShoppingBag, Star, Info, ShieldCheck, ShoppingCart, Plus, Minus, Trash2, ArrowRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

const PRODUCTS = [
  {
    id: 'chicken-lollipops-drumstick',
    name: 'Chicken Lollipops (Drumstick Meat)',
    category: 'lollipops',
    price: 349,
    weight: '500g',
    image: '/images/products/chicken-lollipops/drumstick-handle.jpg',
    description: 'Tender chicken lollipops made from juicy drumsticks, cut and prepared with a clean bone handle. Perfect for appetizers.',
    tag: 'Popular',
    rating: 4.8
  },
  {
    id: 'chicken-lollipops-drumette',
    name: 'Chicken Lollipops (Drumette Style)',
    category: 'lollipops',
    price: 329,
    weight: '500g',
    image: '/images/products/chicken-lollipops/drumette-style.jpg',
    description: 'Cocktail-style lollipops shaped from chicken wings (drumettes). Coated and ready for frying or grilling.',
    rating: 4.6
  },
  {
    id: 'chicken-breast-single',
    name: 'Single Boneless Chicken Breast',
    category: 'breasts',
    price: 189,
    weight: '250g',
    image: '/images/products/chicken-breast/single-boneless.jpg',
    description: 'Premium class single chicken breast, lean, boneless, and skinless. Ideal for grilling, poaching, or pan-frying.',
    tag: 'Lean Cut',
    rating: 4.9
  },
  {
    id: 'chicken-breast-butterflied',
    name: 'Butterflied Chicken Breast',
    category: 'breasts',
    price: 199,
    weight: '250g',
    image: '/images/products/chicken-breast/butterflied.jpg',
    description: 'Butterflied breast fillet, cut to an even thickness for quick, uniform cooking. Great for sandwiches and schnitzels.',
    rating: 4.5
  },
  {
    id: 'chicken-breast-diced',
    name: 'Diced Chicken Breast Pieces',
    category: 'breasts',
    price: 219,
    weight: '400g',
    image: '/images/products/diced-chicken/diced-pieces.jpg',
    description: 'Uniformly diced raw chicken breast pieces. Convenient and ready to use in curries, stir-fries, and skewers.',
    tag: 'Best Seller',
    rating: 4.7
  },
  {
    id: 'chicken-breast-julienne',
    name: 'Chicken Breast Strips (Julienne)',
    category: 'breasts',
    price: 229,
    weight: '400g',
    image: '/images/products/chicken-breast/julienne-strips.png',
    description: 'Evenly cut julienne strips of lean chicken breast. Ready for quick stir-frying, fajitas, or salads.',
    rating: 4.6
  },
  {
    id: 'chicken-leg-marinated',
    name: 'Marinated Leg & Thigh Quarter',
    category: 'legs-whole',
    price: 249,
    weight: '450g',
    image: '/images/products/chicken-leg/marinated-quarter.png',
    description: 'Chicken leg and thigh quarter coated in a red-pepper herb marinade. Tender, flavorful, and ready for roasting or baking.',
    tag: 'Chef Choice',
    rating: 4.8
  },
  {
    id: 'whole-chicken-seasoned',
    name: 'Whole Seasoned Chicken',
    category: 'legs-whole',
    price: 599,
    weight: '1.2kg',
    image: '/images/products/whole-chicken/seasoned-uncarved.png',
    description: 'Whole fresh chicken, seasoned with aromatic herbs and spices. Ready for oven roasting or rotisserie.',
    rating: 4.7
  },
  {
    id: 'chicken-drumsticks-assorted',
    name: 'Raw Drumsticks & Mixed Pieces',
    category: 'legs-whole',
    price: 299,
    weight: '800g',
    image: '/images/products/chicken-drumsticks/assorted-pieces.png',
    description: 'Selection of fresh bone-in chicken drumsticks and cuts. High-quality pieces perfect for traditional curries and gravies.',
    rating: 4.5
  }
]

const CATEGORIES = [
  { value: 'all', label: 'All Cuts' },
  { value: 'lollipops', label: 'Lollipops & Wings' },
  { value: 'breasts', label: 'Chicken Breast' },
  { value: 'legs-whole', label: 'Whole & Bone-in' }
]

export default function Products() {
  const navigate = useNavigate()
  const [activeCategory, setActiveCategory] = useState('all')
  const [cart, setCart] = useState({})
  const [isCartOpen, setIsCartOpen] = useState(false)

  const filteredProducts = activeCategory === 'all'
    ? PRODUCTS
    : PRODUCTS.filter(p => p.category === activeCategory)

  const cartItemsCount = Object.values(cart).reduce((sum, qty) => sum + qty, 0)
  const cartSubtotal = Object.entries(cart).reduce((sum, [id, qty]) => {
    const product = PRODUCTS.find(p => p.id === id)
    return sum + (product ? product.price * qty : 0)
  }, 0)

  function updateQuantity(productId, amount) {
    setCart(prev => {
      const current = prev[productId] || 0
      const next = current + amount
      if (next <= 0) {
        const copy = { ...prev }
        delete copy[productId]
        return copy
      }
      return { ...prev, [productId]: next }
    })
  }

  function handleCheckout() {
    if (cartItemsCount === 0) return

    const summaryNotes = Object.entries(cart)
      .map(([id, qty]) => {
        const product = PRODUCTS.find(p => p.id === id)
        return `${qty}x ${product ? product.name.split(' (')[0] : 'Chicken Item'}`
      })
      .join(', ')

    // Prefill URL configuration for payment
    const params = new URLSearchParams({
      mode: 'upi_id',
      upi_id: 'chickenstore@upi',
      name: 'Fresh Chicken Co.',
      amount: cartSubtotal.toString(),
      note: `Order: ${summaryNotes.slice(0, 100)}`
    })

    navigate(`/payment?${params.toString()}`)
  }

  return (
    <div className="flex flex-col gap-8 min-h-screen">
      {/* Hero Banner */}
      <div className="relative rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-12 text-white shadow-lg md:px-12">
        <div className="max-w-xl flex flex-col gap-3">
          <Badge className="w-fit bg-amber-400 text-amber-950 font-bold hover:bg-amber-300">
            Fresh & Premium Cuts
          </Badge>
          <h1 className="text-3xl font-extrabold md:text-4xl tracking-tight">
            Order Clean & Prepared Chicken
          </h1>
          <p className="text-orange-100 text-sm md:text-base">
            No preservatives, hand-cut daily, and securely packaged. Ready to cook or pre-seasoned to perfection.
          </p>
        </div>
        <div className="absolute right-8 bottom-0 top-0 hidden items-center justify-center lg:flex">
          <ShoppingBag className="h-44 w-44 text-white/10" />
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid gap-8 lg:grid-cols-[1fr_350px]">
        {/* Catalog Section */}
        <div className="flex flex-col gap-6">
          {/* Category Filter Tabs */}
          <div className="flex flex-wrap gap-2 border-b pb-4 dark:border-gray-800">
            {CATEGORIES.map(cat => (
              <button
                key={cat.value}
                onClick={() => setActiveCategory(cat.value)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                  activeCategory === cat.value
                    ? 'bg-orange-500 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Product Cards Grid */}
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {filteredProducts.map(product => {
              const qty = cart[product.id] || 0
              return (
                <Card key={product.id} className="overflow-hidden hover:shadow-md transition-shadow group flex flex-col justify-between">
                  <div className="relative overflow-hidden aspect-[16/10] bg-gray-100 dark:bg-gray-800">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                    />
                    {product.tag && (
                      <Badge className="absolute top-3 left-3 bg-red-500 text-white font-bold">
                        {product.tag}
                      </Badge>
                    )}
                  </div>
                  <CardContent className="p-4 flex-1 flex flex-col justify-between gap-4">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base leading-tight">
                          {product.name}
                        </h3>
                        <div className="flex items-center gap-1 shrink-0 text-amber-500">
                          <Star className="h-3.5 w-3.5 fill-current" />
                          <span className="text-xs font-semibold">{product.rating}</span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                        {product.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between border-t pt-3 dark:border-gray-800">
                      <div>
                        <p className="text-xs text-gray-400">Net: {product.weight}</p>
                        <p className="text-lg font-extrabold text-orange-600 dark:text-orange-400">
                          ₹{product.price}
                        </p>
                      </div>

                      {qty > 0 ? (
                        <div className="flex items-center gap-2.5 rounded-lg border bg-gray-50 px-2 py-1 dark:bg-gray-800 dark:border-gray-700">
                          <button
                            onClick={() => updateQuantity(product.id, -1)}
                            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="text-sm font-bold w-4 text-center">{qty}</span>
                          <button
                            onClick={() => updateQuantity(product.id, 1)}
                            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <Button
                          onClick={() => updateQuantity(product.id, 1)}
                          size="sm"
                          className="bg-orange-500 hover:bg-orange-600 text-white font-semibold"
                        >
                          Add to Cart
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>

        {/* Floating Cart Summary Drawer/Sidebar */}
        <div className="flex flex-col gap-6">
          <Card className="sticky top-20 border-orange-100 bg-orange-50/20 dark:border-gray-800 dark:bg-gray-900/10">
            <CardContent className="p-5 flex flex-col gap-5">
              <div className="flex items-center justify-between border-b pb-3 dark:border-gray-800">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-orange-600" />
                  <h3 className="font-bold text-gray-900 dark:text-gray-100">
                    Your Cart
                  </h3>
                </div>
                <Badge className="bg-orange-600 text-white">{cartItemsCount} Items</Badge>
              </div>

              {cartItemsCount > 0 ? (
                <div className="flex flex-col gap-3">
                  <div className="max-h-[300px] overflow-y-auto flex flex-col gap-3 pr-1">
                    {Object.entries(cart).map(([id, qty]) => {
                      const product = PRODUCTS.find(p => p.id === id)
                      if (!product) return null
                      return (
                        <div key={id} className="flex items-center justify-between gap-3 text-sm">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                              {product.name}
                            </p>
                            <p className="text-xs text-gray-400">₹{product.price} × {qty}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-700 dark:text-gray-300">
                              ₹{product.price * qty}
                            </span>
                            <button
                              onClick={() => updateQuantity(id, -qty)}
                              className="text-gray-400 hover:text-red-500 p-1 rounded"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <div className="border-t pt-3 flex flex-col gap-1.5 dark:border-gray-800">
                    <div className="flex justify-between font-bold text-base">
                      <span>Total Amount</span>
                      <span className="text-orange-600 dark:text-orange-400">₹{cartSubtotal}</span>
                    </div>
                    <p className="text-xs text-gray-500">Secure UPI payment powered by UPIFlow</p>
                  </div>

                  <Button
                    onClick={handleCheckout}
                    className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold flex items-center justify-center gap-2"
                  >
                    Place Order via UPI
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 py-8 text-center text-gray-400">
                  <ShoppingCart className="h-12 w-12 text-gray-300" />
                  <p className="text-sm font-semibold">Your cart is empty</p>
                  <p className="text-xs">Add chicken cuts to start your order</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Value Prop Info Card */}
          <div className="rounded-xl border p-4 bg-white dark:bg-gray-900 flex flex-col gap-3">
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-gray-900 dark:text-gray-100">Quality Assured</p>
                <p className="text-xs text-gray-500 mt-0.5">Strict hygiene protocols followed. Vacuum-packed fresh delivery.</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-gray-900 dark:text-gray-100">Refund Guarantee</p>
                <p className="text-xs text-gray-500 mt-0.5">100% money back if fresh product requirements are not met.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
