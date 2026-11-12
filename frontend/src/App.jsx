import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import Landing from "./pages/Landing.jsx";
import Assistant from "./pages/Assistant.jsx";
import Products from "./pages/Products.jsx";
import Compare from "./pages/Compare.jsx";
import Recommendations from "./pages/Recommendations.jsx";
import Checkout from "./pages/Checkout.jsx";
import Orders from "./pages/Orders.jsx";
import ProductDetail from "./pages/ProductDetail.jsx";

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/assistant" element={<Assistant />} />
        <Route path="/products" element={<Products />} />
        <Route path="/product/:id" element={<ProductDetail />} />
        <Route path="/compare" element={<Compare />} />
        <Route path="/recommendations" element={<Recommendations />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/orders" element={<Orders />} />
      </Routes>
    </Layout>
  );
}
