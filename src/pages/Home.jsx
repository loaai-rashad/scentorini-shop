// src/pages/Home.js
import React from 'react';
import Carousel from "../components/Carousel";
import ProductsList from "../components/ProductsList";

const Home = () => {
  return (
    // Any layout changes for the home page go here:
    <div className="home-page-layout">
      <Carousel />
      <ProductsList />
    </div>
  );
};

export default Home;