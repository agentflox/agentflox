import React from 'react';

const testimonials = [
  { id: 1, name: "Sarah Chen", handle: "@sarahdigital", rating: 5, quote: "Amazing platform! The user experience is seamless and the features are exactly what I needed." },
  { id: 2, name: "Marcus Johnson", handle: "@marcustech", rating: 5, quote: "This service has transformed how I work. Clean design, powerful features, and excellent support." },
  { id: 3, name: "David Martinez", handle: "@davidcreates", rating: 5, quote: "I've tried many platforms, but this one stands out. Intuitive, reliable, and genuinely helpful for productivity." },
];

const StarRating = ({ rating }: { rating: number }) => (
    <div className="flex text-yellow-500">
        {[...Array(5)].map((_, i) => (
            <svg key={i} className={`w-4 h-4 fill-current ${i < rating ? 'text-yellow-500' : 'text-gray-300'}`} viewBox="0 0 24 24">
                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
            </svg>
        ))}
    </div>
);

const UserCard = ({ name, handle, quote, rating }: { name: string, handle: string, quote: string, rating: number }) => {
    const imagePlaceholder = `https://placehold.co/80x80/6366F1/FFFFFF?text=${name.split(' ')[0][0]}${name.split(' ')[1][0]}`;
    
    return (
        <div className="p-4 flex flex-col bg-white/50 border border-gray-100 rounded-xl shadow-lg transition duration-300 hover:shadow-xl h-full">
            <div className="flex items-center mb-3">
                <img 
                    src={imagePlaceholder}
                    alt={name}
                    className="w-12 h-12 rounded-full object-cover mr-3 border-2 border-indigo-400"
                />
                <div>
                    <h3 className="text-sm font-bold text-gray-800">{name}</h3>
                    <p className="text-xs text-indigo-500 font-medium">{handle}</p>
                </div>
            </div>
            <StarRating rating={rating} />
            <p className="text-sm text-gray-700 mt-2 flex-grow">{quote}</p>
        </div>
    );
};

export const Testimonials = () => (
    <div className="mt-12 pt-6 border-t border-gray-200">
        <h3 className="text-xl font-bold text-gray-800 mb-6 text-center">Loved by Creators Worldwide</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
                <UserCard key={t.id} {...t} />
            ))}
        </div>
    </div>
);
