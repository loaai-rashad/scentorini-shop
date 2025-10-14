import { Card } from "@/components/ui/card";
import { Link } from "react-router-dom";

export default function ProductCard({
  id,
  image,
  title,
  subtitle,
  price,
  stock = 0, // 👈 new prop for stock
  className = "",
}) {
  return (
    <Link to={`/products/${id}`} className="w-full">
      <Card
        className={`overflow-hidden bg-white border shadow-sm cursor-pointer hover:shadow-lg transition ${className}`}
      >
        {/* Product Image */}
        <div className="w-full h-96 sm:h-[28rem] md:h-96 lg:h-[32rem] xl:h-[36rem] bg-stone-100 flex items-center justify-center overflow-hidden relative">
          <img
            src={image || "/perfume.jpeg"}
            alt={title}
            className="w-full h-full object-cover"
          />

          {/* Out of Stock Badge */}
          {stock === 0 && (
            <span className="absolute top-3 left-3 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded">
              Out of Stock
            </span>
          )}
        </div>

        {/* Product Details */}
        <div className="p-4 space-y-2">
          <div>
            <h3 className="font-serif text-lg font-bold tracking-wide text-stone-900 uppercase">
              {title}
            </h3>
            <p className="text-stone-500 text-sm">{subtitle}</p>
          </div>

          {stock > 0 ? (
            <div className="flex flex-col items-start gap-1">
              
              <span className="text-xl font-semibold text-stone-900">
                EGP{price.toFixed(2)}
              </span>
            </div>
          ) : (
            <div className="text-red-600 font-semibold">Currently Unavailable</div>
          )}
        </div>
      </Card>
    </Link>
  );
}
