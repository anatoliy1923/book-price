import type { BookPrice } from '@/lib/tavily';

interface PriceRowProps {
  item: BookPrice;
  isBest: boolean;
}

function formatPrice(price: number): string {
  return price.toLocaleString('uk-UA', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }) + ' грн';
}

export default function PriceRow({ item, isBest }: PriceRowProps) {
  const isUnavailable = !item.available || item.price === null;

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 0',
        textDecoration: 'none',
        color: 'inherit',
        borderLeft: isBest ? '2px solid #0071E3' : '2px solid transparent',
        paddingLeft: isBest ? '12px' : '14px',
        marginLeft: '-14px',
        opacity: isUnavailable ? 0.45 : 1,
      }}
    >
      {/* Store name */}
      <span
        style={{
          flex: '0 0 100px',
          fontSize: '15px',
          color: isBest ? '#0071E3' : '#1D1D1F',
          fontWeight: isBest ? 500 : 400,
        }}
      >
        {item.store}
      </span>

      {/* Prices */}
      <span style={{ flex: 1, display: 'flex', alignItems: 'baseline', gap: '8px' }}>
        {item.price !== null ? (
          <>
            <span
              style={{
                fontSize: '17px',
                fontWeight: isBest ? 600 : 400,
                color: '#1D1D1F',
              }}
            >
              {formatPrice(item.price)}
            </span>
            {item.oldPrice && (
              <span
                style={{
                  fontSize: '13px',
                  color: '#AEAEB2',
                  textDecoration: 'line-through',
                }}
              >
                {formatPrice(item.oldPrice)}
              </span>
            )}
            {item.discount && (
              <span
                style={{
                  fontSize: '13px',
                  color: '#1DB954',
                  fontWeight: 500,
                }}
              >
                -{item.discount}%
              </span>
            )}
          </>
        ) : (
          <span style={{ fontSize: '15px', color: '#AEAEB2' }}>
            {isUnavailable ? 'Немає в наявності' : 'Ціна недоступна'}
          </span>
        )}
      </span>

      {/* Arrow */}
      <svg
        width="7"
        height="12"
        viewBox="0 0 7 12"
        fill="none"
        style={{ flexShrink: 0, opacity: 0.35 }}
      >
        <path
          d="M1 1L6 6L1 11"
          stroke="#1D1D1F"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </a>
  );
}
