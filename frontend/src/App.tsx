import { Route, Routes } from 'react-router-dom';
import { CollegeApp } from './pages/CollegeApp';
import { SubscribePage } from './pages/SubscribePage';
import { SuperAdminApp } from './pages/SuperAdminApp';

export default function App() {
  return (
    <Routes>
      <Route path="/super-admin/*" element={<SuperAdminApp />} />
      <Route path="/subscribe" element={<SubscribePage />} />
      <Route path="/subscribe/success" element={<SubscribeSuccess />} />
      <Route path="/*" element={<CollegeApp />} />
    </Routes>
  );
}

function SubscribeSuccess() {
  return (
    <div className="login-screen">
      <div className="card form login-card">
        <h1>Payment received</h1>
        <p className="muted">Your college tenant is being provisioned. You can sign in once the subscription is active.</p>
        <a className="btn btn-primary login-submit" href="/">
          Go to library sign in
        </a>
      </div>
    </div>
  );
}
