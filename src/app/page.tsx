'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Package, MapPin, AlertCircle, ShoppingCart } from 'lucide-react';

type Inventory = {
  id: string;
  warehouseId: string;
  warehouseName: string;
  totalUnits: number;
  reservedUnits: number;
  availableStock: number;
};

type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  inventory: Inventory[];
};

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reservingId, setReservingId] = useState<string | null>(null);
  const router = useRouter();

  const fetchProducts = () => {
    fetch('/api/products')
      .then((res) => res.json())
      .then((data) => {
        setProducts(data);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load products.');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleReserve = async (inventoryId: string) => {
    setReservingId(inventoryId);
    setError(null);
    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inventoryId, quantity: 1 }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to reserve');
      }

      router.push(`/checkout/${data.id}`);
    } catch (err: any) {
      setError(err.message);
      fetchProducts(); // Refresh stock
    } finally {
      setReservingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white p-8 md:p-16">
      <div className="max-w-7xl mx-auto">
        <header className="mb-16 text-center">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500 mb-4"
          >
            Allo Inventory Showroom
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-gray-400 text-lg"
          >
            Real-time multi-warehouse stock reservation system
          </motion.p>
        </header>

        {error && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-xl flex items-center gap-3 mb-8 max-w-2xl mx-auto"
          >
            <AlertCircle size={24} />
            <p className="font-medium">{error}</p>
          </motion.div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {products.map((product, idx) => (
            <motion.div 
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="glass-card rounded-2xl overflow-hidden flex flex-col group"
            >
              <div className="h-64 overflow-hidden relative">
                <img 
                  src={product.imageUrl} 
                  alt={product.name} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] to-transparent opacity-60"></div>
                <div className="absolute bottom-4 left-4">
                  <h2 className="text-2xl font-bold">{product.name}</h2>
                  <p className="text-xl text-blue-400 font-semibold">${product.price.toFixed(2)}</p>
                </div>
              </div>
              
              <div className="p-6 flex-1 flex flex-col">
                <p className="text-gray-300 mb-6 flex-1">{product.description}</p>
                
                <div className="space-y-4">
                  <h3 className="text-sm uppercase tracking-wider text-gray-500 font-semibold flex items-center gap-2">
                    <MapPin size={16} /> Available at Warehouses
                  </h3>
                  
                  {product.inventory.map((inv) => (
                    <div key={inv.id} className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between hover:bg-white/10 transition-colors">
                      <div>
                        <p className="font-medium">{inv.warehouseName}</p>
                        <p className="text-sm text-gray-400 flex items-center gap-1 mt-1">
                          <Package size={14} /> 
                          {inv.availableStock > 0 ? (
                            <span className="text-green-400">{inv.availableStock} in stock</span>
                          ) : (
                            <span className="text-red-400">Out of stock</span>
                          )}
                        </p>
                      </div>
                      
                      <button
                        onClick={() => handleReserve(inv.id)}
                        disabled={inv.availableStock <= 0 || reservingId === inv.id}
                        className={`px-5 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-all ${
                          inv.availableStock <= 0 
                            ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg hover:shadow-blue-500/25'
                        }`}
                      >
                        {reservingId === inv.id ? (
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <>
                            <ShoppingCart size={18} />
                            Reserve
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </main>
  );
}
