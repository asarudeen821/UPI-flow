import { QRCodeSVG } from 'qrcode.react'

export default function QRCodeComp({ value, size = 220, className = '' }) {
  // If no value provided, show placeholder
  if (!value) {
    return (
      <div className={`rounded-2xl border bg-white p-4 shadow-sm ${className}`} style={{ width: size, height: size }}>
        <div className="flex items-center justify-center h-full text-gray-400">
          <span className="text-xs text-center">No data</span>
        </div>
      </div>
    )
  }

  return (
    <div className={`rounded-2xl border bg-white p-4 shadow-sm ${className}`} style={{ width: size, height: size }}>
      <QRCodeSVG
        value={value}
        size={size - 32}
        includeMargin
        level="H"
      />
    </div>
  )
}
