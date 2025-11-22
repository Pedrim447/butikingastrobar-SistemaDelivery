import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CartProvider } from "./contexts/CartContext";
import { AuthProvider } from "./contexts/AuthContext";
import Menu from "./pages/Menu";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import OrderConfirmation from "./pages/OrderConfirmation";
import Auth from "./pages/Auth";

import AdminDashboard from "./pages/AdminDashboard";
import AdminStats from "./pages/AdminStats";
import AdminDeliveryRiders from "./pages/AdminDeliveryRiders";
import AdminUsers from "./pages/AdminUsers";
import DeliveryDashboard from "./pages/DeliveryDashboard";
import OrderTracking from "./pages/OrderTracking";
import MyOrders from "./pages/MyOrders";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <AuthProvider>
          <CartProvider>
            <Toaster />
            <Sonner />
            <Routes>
              <Route path="/" element={<Menu />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/confirmacao" element={<OrderConfirmation />} />
              <Route path="/rastreamento" element={<OrderTracking />} />
              <Route path="/meus-pedidos" element={<MyOrders />} />
              <Route path="/auth" element={<Auth />} />
              
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/stats" element={<AdminStats />} />
              <Route path="/admin/delivery-riders" element={<AdminDeliveryRiders />} />
              <Route path="/admin/users" element={<AdminUsers />} />
              <Route path="/delivery" element={<DeliveryDashboard />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </CartProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
