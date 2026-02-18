import { Navigate, Route, Routes } from "react-router-dom";
import AccessPage from "./pages/Access.jsx";
import DashboardPage from "./pages/Dashboard.jsx";
import WarehouseGiacenze from "./pages/WarehouseGiacenze.jsx";
import MobileScanPage from "./pages/MobileScanPage.jsx";
import WarehouseDdt from "./pages/WarehouseDdt.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<AccessPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/warehouse/giacenze" element={<WarehouseGiacenze />} />
      <Route path="/warehouse/ddt" element={<WarehouseDdt />} />
      <Route path="/mobile-scan/:sessionId" element={<MobileScanPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
