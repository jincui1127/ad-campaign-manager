import CampaignDashboard
  from "./components/CampaignDashboard";

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
    </main>
  );
}


export default App;