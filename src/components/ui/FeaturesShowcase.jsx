import React, { useState } from 'react'

// FeaturesShowcase
// A dark marketing band modeled on the CSFloat-style "why use us" grid.
// Drop it into home.jsx between the listings and the CTA.
// Pure Tailwind + inline SVG, no extra deps.

const Card = ({ children, className = '' }) => (
  <div className={`relative overflow-hidden rounded-2xl bg-[#161b22] border border-white/5 p-6 ${className}`}>
    {children}
  </div>
)

const SecureTradesArt = () => (
  <div className="flex items-center justify-center gap-3 py-6">
    {/* Seller */}
    <div className="flex flex-col items-center gap-1">
      <div className="h-12 w-12 rounded-md bg-white/5 border border-white/10 flex items-center justify-center text-blue-400 text-lg font-bold">S</div>
      <span className="text-[10px] uppercase tracking-wider text-gray-400">Seller</span>
    </div>
    <div className="h-px w-6 bg-blue-500/60" />
    {/* Card icon */}
    <div className="flex flex-col items-center gap-1">
      <div className="h-12 w-12 rounded-md bg-white/5 border border-white/10 flex items-center justify-center text-blue-400 text-lg font-bold">C</div>
      <span className="text-[10px] uppercase tracking-wider text-gray-400">Card</span>
    </div>
    <div className="h-px w-6 bg-blue-500/60" />
    {/* Buyer */}
    <div className="flex flex-col items-center gap-1">
      <div className="h-12 w-12 rounded-md bg-white/5 border border-white/10 flex items-center justify-center text-blue-400 text-lg font-bold">B</div>
      <span className="text-[10px] uppercase tracking-wider text-gray-400">Buyer</span>
    </div>
  </div>
)

const FeesChart = () => (
  <svg viewBox="0 0 240 100" className="w-full h-24">
    <defs>
      <linearGradient id="curveFill" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
      </linearGradient>
    </defs>
    <path d="M0 20 C 80 25, 140 75, 240 85 L240 100 L0 100 Z" fill="url(#curveFill)" />
    <path d="M0 20 C 80 25, 140 75, 240 85" stroke="#60a5fa" strokeWidth="2" fill="none" />
    <text x="6" y="14" fill="#9ca3af" fontSize="10" fontFamily="sans-serif">15%</text>
    <text x="210" y="78" fill="#9ca3af" fontSize="10" fontFamily="sans-serif">2%</text>
    <circle cx="6" cy="20" r="3" fill="#60a5fa" />
    <circle cx="234" cy="85" r="3" fill="#60a5fa" />
  </svg>
)

const FeeCalculator = () => {
  const [amount, setAmount] = useState(25)
  const [volume, setVolume] = useState(10000)
  const salesFeeRate = 0.02
  // dynamic withdraw fee: 0.5% to 2.5% inversely related to volume (cap at $100k)
  const withdrawRate = Math.max(0.005, 0.025 - Math.min(volume, 100000) / 100000 * 0.02)
  const salesFee = amount * salesFeeRate
  const withdrawFee = amount * withdrawRate

  return (
    <div className="rounded-xl bg-black/30 border border-white/5 p-4 text-sm text-gray-200">
      <div className="font-bold text-base mb-3 text-white">Bid Calculator</div>
      <label className="block text-xs text-gray-400 mb-1">Sale Amount</label>
      <div className="flex items-center gap-2 rounded-md bg-white/5 border border-white/10 px-2 py-1.5 mb-3">
        <span className="text-gray-400">$</span>
        <input
          type="number"
          min="0"
          value={amount}
          onChange={e => setAmount(Number(e.target.value) || 0)}
          className="w-full bg-transparent outline-none text-white"
        />
      </div>
      <div className="flex justify-between text-xs text-gray-400 mb-1">
        <span>Sale Volume</span>
        <span className="text-white font-mono">${volume.toLocaleString()}</span>
      </div>
      <input
        type="range"
        min="0"
        max="100000"
        step="500"
        value={volume}
        onChange={e => setVolume(Number(e.target.value))}
        className="w-full accent-blue-500 mb-4"
      />
      <div className="border-t border-white/10 pt-3 space-y-1.5">
        <div className="flex justify-between">
          <span>Sales Fee <span className="text-gray-500 text-xs">{(salesFeeRate * 100).toFixed(0)}%</span></span>
          <span className="text-blue-400 font-mono">${salesFee.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>Withdraw Fee <span className="text-gray-500 text-xs">{(withdrawRate * 100).toFixed(1)}%</span></span>
          <span className="text-blue-400 font-mono">${withdrawFee.toFixed(2)}</span>
        </div>
      </div>
    </div>
  )
}

const AuctionArt = () => (
  <div className="flex items-center justify-center py-6">
    <div className="relative">
      <div className="h-20 w-20 rounded-full bg-gradient-to-br from-blue-500/30 to-blue-700/30 border border-blue-400/30 flex items-center justify-center">
        <span className="text-blue-300 font-extrabold tracking-widest">BID</span>
      </div>
      <span className="absolute -top-1 -right-1 text-yellow-300 text-lg">+</span>
      <span className="absolute -bottom-1 -left-1 text-yellow-300 text-lg">+</span>
    </div>
  </div>
)

const BargainArt = () => (
  <div className="rounded-lg bg-black/40 border border-white/10 px-4 py-3 mx-auto max-w-[230px]">
    <div className="flex items-center gap-1 mb-2">
      <span className="h-2 w-2 rounded-full bg-red-400/70" />
      <span className="h-2 w-2 rounded-full bg-yellow-400/70" />
      <span className="h-2 w-2 rounded-full bg-green-400/70" />
    </div>
    <div className="flex items-center justify-between">
      <div className="flex flex-col gap-2">
        <button className="px-3 py-1 rounded bg-blue-600 text-white text-xs font-bold">Accept</button>
        <button className="px-3 py-1 rounded bg-white/10 text-white text-xs font-bold">Decline</button>
      </div>
      <div className="flex flex-col items-end">
        <div className="text-blue-300 text-2xl font-extrabold">$100</div>
        <div className="h-10 w-16 rounded bg-white/5 border border-white/10 mt-1" />
      </div>
    </div>
  </div>
)

const FastListingArt = () => (
  <div className="flex items-center justify-center py-4 gap-3">
    <svg viewBox="0 0 64 64" className="h-16 w-16 text-gray-300">
      <circle cx="32" cy="32" r="26" fill="none" stroke="currentColor" strokeWidth="3" />
      <line x1="32" y1="32" x2="32" y2="14" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <line x1="32" y1="32" x2="46" y2="34" stroke="#60a5fa" strokeWidth="3" strokeLinecap="round" />
    </svg>
    <div className="text-blue-300 font-extrabold text-2xl">0<span className="text-base text-gray-400 ml-1">days</span></div>
  </div>
)

const FeaturesShowcase = () => {
  return (
    <section className="w-full bg-[#0d1117] text-white py-16 -mx-4 md:-mx-8 px-4 md:px-8 rounded-2xl">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">Why trade on Flare?</h2>
          <p className="text-gray-400 mt-2">Built for collectors who want fast, fair, and friendly trading.</p>
        </div>

        {/* Top row: 2 wide + 1 tall calculator */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <Card>
            <SecureTradesArt />
            <h3 className="font-bold text-lg mt-2">Secure Peer-to-Peer Trades</h3>
            <p className="text-sm text-gray-400 mt-1">
              Buyers bid through our chat, sellers approve, and the trade locks in once both sides confirm.
            </p>
          </Card>

          <Card>
            <FeesChart />
            <h3 className="font-bold text-lg mt-3">Lowest Fees in the Industry</h3>
            <p className="text-sm text-gray-400 mt-1">
              A flat 2% sale fee with dynamic withdraw fees that drop to 0.5% as your sales volume grows.
            </p>
          </Card>

          <Card className="md:row-span-2">
            <FeeCalculator />
          </Card>
        </div>

        {/* Bottom row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <AuctionArt />
            <h3 className="font-bold text-lg mt-2 text-center md:text-left">Auctions</h3>
            <p className="text-sm text-gray-400 mt-1">
              List rare cards as timed auctions and let collectors compete for them.
            </p>
          </Card>

          <Card>
            <BargainArt />
            <h3 className="font-bold text-lg mt-3">Bargains</h3>
            <p className="text-sm text-gray-400 mt-1">
              Make offers on listings over $30. Sellers can accept, counter, or decline right in chat.
            </p>
          </Card>

          <Card>
            <FastListingArt />
            <h3 className="font-bold text-lg mt-2">No Trade Holds</h3>
            <p className="text-sm text-gray-400 mt-1">
              Listings go live the moment you post them - no waiting period before buyers can bid.
            </p>
          </Card>
        </div>
      </div>
    </section>
  )
}

export default FeaturesShowcase
