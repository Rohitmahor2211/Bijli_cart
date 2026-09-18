import { useState } from 'react';
// import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import Products from '../components/Products';
import Footer from '../components/Footer';
import { useCart } from '../context/CartContext';

export default function Home() {
  const { addToCart, } = useCart();
  const [searchText, setSearchText] = useState('');
  const [searchCategory, setSearchCategory] = useState('all');

  return (
    <div className="min-h-screen bg-[#f5f7fb]">
      {/* <Navbar cartCount={totalItems} /> */}
      <Hero />
      <Products
        addToCart={addToCart}
        searchText={searchText}
        searchCategory={searchCategory}
        clearSearch={() => { setSearchText(''); setSearchCategory('all'); }}
      />
      <Footer />
    </div>
  );
}
