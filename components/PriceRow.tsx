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
      className={`flex items-center gap-3 py-3 transition-opacity ${
        isBest ? 'border-l-2 border-vivat-accent pl-3 -ml-[14px]' : 'border-l-2 border-transparent pl-[14px] -ml-[14px]'
      } ${isUnavailable ? 'opacity-50 hover:opacity-70' : 'hover:bg-vivat-light/30 rounded-r-xl'}`}
    >
      {/* Store name */}
      <span className={`flex-none w-[110px] text-[15px] truncate ${isBest ? 'text-vivat-dark font-medium' : 'text-foreground font-normal'}`}>
        {item.store}
      </span>

      {/* Prices */}
      <span className="flex-1 flex items-baseline gap-2 flex-wrap">
        {isPriceMissing ? (
          <span className="text-[15px] text-gray-400">Ціна не знайдена</span>
        ) : isOutOfStock || !item.available ? (
          <span className="text-[15px] text-gray-400">Немає в наявності</span>
        ) : (
          <>
            <span className={`text-[17px] ${isBest ? 'font-semibold text-foreground' : 'font-normal text-foreground'}`}>
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
