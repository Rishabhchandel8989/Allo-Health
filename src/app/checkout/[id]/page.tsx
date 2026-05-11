'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Clock, CheckCircle2, XCircle, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function CheckoutPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { id } = resolvedParams;
  
  const [reservation, setReservation] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [status, setStatus] = useState<'LOADING' | 'PENDING' | 'CONFIRMED' | 'RELEASED' | 'EXPIRED'>('LOADING');
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetch(`/api/reservations/${id}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setError(data.error);
          setStatus('EXPIRED');
          return;
        }
        setReservation(data);
        if (data.status === 'PENDING') {
          const expiry = new Date(data.expiresAt).getTime();
          const now = Date.now();
          if (expiry > now) {
            setTimeLeft(Math.floor((expiry - now) / 1000));
            setStatus('PENDING');
          } else {
            setStatus('EXPIRED');
          }
        } else {
          setStatus(data.status);
        }
      })
      .catch(() => {
        setError('Failed to fetch reservation.');
        setStatus('EXPIRED');
      });
  }, [id]);

  useEffect(() => {
    if (status !== 'PENDING' || timeLeft <= 0) return;

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setStatus('EXPIRED');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [status, timeLeft]);

  const handleConfirm = async () => {
    setProcessing(true);
    setError(null);
    try {
      const res = await fetch(`/api/reservations/${id}/confirm`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 410) setStatus('EXPIRED');
        throw new Error(data.error || 'Failed to confirm purchase');
      }
      setStatus('CONFIRMED');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleCancel = async () => {
    setProcessing(true);
    setError(null);
    try {
      const res = await fetch(`/api/reservations/${id}/release`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to cancel reservation');
      }
      setStatus('RELEASED');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (status === 'LOADING') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const isComplete = status === 'CONFIRMED' || status === 'RELEASED' || status === 'EXPIRED';

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white p-8 md:p-16 flex items-center justify-center">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="glass-card max-w-2xl w-full rounded-3xl overflow-hidden"
      >
        <div className="p-8 border-b border-white/10 flex items-center justify-between">
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
            Secure Checkout
          </h1>
          <ShieldCheck className="text-blue-400" size={32} />
        </div>

        <div className="p-8">
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-xl flex items-center gap-3 mb-8">
              <AlertTriangle size={24} />
              <p className="font-medium">{error}</p>
            </div>
          )}

          {reservation && (
            <div className="flex gap-6 mb-8 bg-white/5 p-4 rounded-2xl border border-white/5">
              <img 
                src={reservation.inventory.product.imageUrl} 
                alt={reservation.inventory.product.name}
                className="w-24 h-24 object-cover rounded-xl"
              />
              <div className="flex-1">
                <h2 className="text-xl font-bold">{reservation.inventory.product.name}</h2>
                <p className="text-gray-400 text-sm mt-1 mb-2">Ships from: {reservation.inventory.warehouse.name}</p>
                <p className="text-blue-400 font-semibold text-lg">${reservation.inventory.product.price.toFixed(2)}</p>
              </div>
              <div className="text-right flex flex-col justify-center">
                <p className="text-gray-400 text-sm uppercase tracking-wider font-bold">Qty</p>
                <p className="text-2xl font-bold">{reservation.quantity}</p>
              </div>
            </div>
          )}

          {!isComplete && (
            <div className="bg-blue-500/10 border border-blue-500/20 p-6 rounded-2xl flex flex-col items-center justify-center mb-8 relative overflow-hidden">
              <div className="absolute inset-0 bg-blue-500/5 animate-pulse-glow"></div>
              <Clock className="text-blue-400 mb-2 relative z-10" size={32} />
              <p className="text-gray-300 font-medium mb-1 relative z-10">Stock reserved for</p>
              <p className="text-5xl font-mono font-bold text-white relative z-10 tracking-tight">
                {formatTime(timeLeft)}
              </p>
            </div>
          )}

          {status === 'CONFIRMED' && (
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-green-500/10 border border-green-500/20 p-8 rounded-2xl flex flex-col items-center justify-center mb-8 text-center">
              <CheckCircle2 className="text-green-400 mb-4" size={48} />
              <h3 className="text-2xl font-bold text-green-400 mb-2">Payment Successful!</h3>
              <p className="text-green-200/80">Your order is confirmed and stock has been permanently allocated.</p>
            </motion.div>
          )}

          {status === 'RELEASED' && (
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-gray-500/10 border border-gray-500/20 p-8 rounded-2xl flex flex-col items-center justify-center mb-8 text-center">
              <XCircle className="text-gray-400 mb-4" size={48} />
              <h3 className="text-2xl font-bold text-gray-300 mb-2">Reservation Cancelled</h3>
              <p className="text-gray-400">Your reservation was released early. The items are available to others.</p>
            </motion.div>
          )}

          {status === 'EXPIRED' && (
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-orange-500/10 border border-orange-500/20 p-8 rounded-2xl flex flex-col items-center justify-center mb-8 text-center">
              <AlertTriangle className="text-orange-400 mb-4" size={48} />
              <h3 className="text-2xl font-bold text-orange-400 mb-2">Reservation Expired</h3>
              <p className="text-orange-200/80">You took too long to complete checkout. The items have been released to other shoppers.</p>
            </motion.div>
          )}

          <div className="flex gap-4 mt-8">
            {!isComplete ? (
              <>
                <button 
                  onClick={handleCancel}
                  disabled={processing}
                  className="flex-1 py-4 rounded-xl font-bold border border-white/10 hover:bg-white/5 transition-colors text-gray-300"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleConfirm}
                  disabled={processing}
                  className="flex-1 py-4 rounded-xl font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg hover:shadow-blue-500/25 transition-all relative overflow-hidden group"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {processing ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      'Confirm Purchase'
                    )}
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </button>
              </>
            ) : (
              <button 
                onClick={() => router.push('/')}
                className="w-full py-4 rounded-xl font-bold bg-white/10 hover:bg-white/20 transition-colors text-white"
              >
                Back to Showroom
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </main>
  );
}
