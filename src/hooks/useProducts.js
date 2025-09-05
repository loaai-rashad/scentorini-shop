// src/hooks/useProducts.js
import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";

export default function useProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      const productsCol = collection(db, "products");
      const productsSnapshot = await getDocs(productsCol);
      const productsList = productsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProducts(productsList);
      setLoading(false);
    };

    fetchProducts();
  }, []);

  return { products, loading };
}
