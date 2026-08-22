import type { BookPrice } from '@/lib/tavily';

interface PriceRowProps {
  item: BookPrice;
  isBest: boolean;
}

function formatPrice(val: number) {
  return `${val} ₴`;
}

export default function PriceRow({ item, isBest }: PriceRowProps) {
  const isPriceMissing = item.price === null;
  const isOutOfStock = !isPriceMissing && !item.available;
  const isUnavailable = isPriceMissing || isOutOfStock || !item.available;

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex min-w-0 items-center gap-3 border-l-2 py-3 transition-colors ${
        isBest ? 'border-vivat-accent bg-[#FFF9EF] pl-3 pr-2' : 'border-transparent px-3 hover:bg-vivat-light/50'
      } ${isUnavailable ? 'opacity-55 hover:opacity-70' : ''}`}
    >
      {/* Store name */}
      <span className={`min-w-0 flex-[0_1_42%] truncate text-[14px] ${isBest ? 'font-semibold text-vivat-dark' : 'font-medium text-foreground'}`}>
        {item.store}
      </span>

      {/* Prices */}
      <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 gap-y-1">
        {isPriceMissing ? (
          <span className="text-[15px] text-gray-400">Ціна не знайдена</span>
        ) : isOutOfStock || !item.available ? (
          <span className="text-[15px] text-gray-400">Немає в наявності</span>
        ) : (
          <>
            <span className={`text-[17px] tabular-nums ${isBest ? 'font-semibold text-foreground' : 'font-medium text-foreground'}`}>
              {formatPrice(item.price!)}
            </span>
            
            {item.oldPrice && (
              <span className="text-[13px] text-gray-400 line-through">
                {formatPrice(item.oldPrice)}
              </span>
            )}
            
            {item.discount && (
              <span className="text-[13px] font-medium text-vivat-accent bg-vivat-accent/10 px-1.5 py-0.5 rounded">
                -{item.discount}%
              </span>
            )}
          </>
        )}
      </span>
    </a>
  );
}
