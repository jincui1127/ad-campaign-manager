import CampaignDashboard
  from "./components/CampaignDashboard";

import AdInspector
  from "./components/AdInspector";

import "./App.css";


function App() {
  return (
    <main className="app">
      <header className="app-header">
        <div>
          <h1>Ad Campaign Manager</h1>

          <p>
            Campaign operations and
            real-time ad delivery
          </p>
        </div>
      </header>

      <CampaignDashboard />

      <AdInspector />
    </main>
  );
}


export default App;