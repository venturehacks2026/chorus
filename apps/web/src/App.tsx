import { Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard.tsx';
import WorkflowEditor from './pages/WorkflowEditor.tsx';
import Marketplace from './pages/Marketplace.tsx';
import Layout from './components/Layout.tsx';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/workflows" replace />} />
        <Route path="/workflows" element={<Dashboard />} />
        <Route path="/workflows/:id" element={<WorkflowEditor />} />
        <Route path="/marketplace" element={<Marketplace />} />
      </Route>
    </Routes>
  );
}
