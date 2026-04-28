import { Navigate, Route, Routes } from "react-router-dom";
import AccessPage from "./pages/Access.jsx";
import DashboardPage from "./pages/Dashboard.jsx";
import WarehouseGiacenze from "./pages/WarehouseGiacenze.jsx";
import MobileScanPage from "./pages/MobileScanPage.jsx";
import WarehouseDdt from "./pages/WarehouseDdt.jsx";
import WarehouseMaps from "./pages/WarehouseMaps.jsx";
import WarehouseCodici from "./pages/WarehouseCodici.jsx";
import WarehouseCausaliDepositi from "./pages/WarehouseCausaliDepositi.jsx";
import WarehouseRiparazioni from "./pages/WarehouseRiparazioni.jsx";
import WarehouseChecklistInterne from "./pages/WarehouseChecklistInterne.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<AccessPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/warehouse/giacenze" element={<WarehouseGiacenze />} />
      <Route path="/warehouse/mappe" element={<WarehouseMaps />} />
      <Route path="/warehouse/ddt" element={<WarehouseDdt />} />
      <Route path="/warehouse/codici" element={<WarehouseCodici />} />
      <Route path="/warehouse/causali" element={<WarehouseCausaliDepositi />} />
      <Route path="/warehouse/causali-depositi" element={<WarehouseCausaliDepositi />} />
      <Route path="/warehouse/riparazioni" element={<WarehouseRiparazioni />} />
      <Route path="/warehouse/checklist-interne" element={<WarehouseChecklistInterne />} />
      <Route path="/mobile-scan/:sessionId" element={<MobileScanPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

