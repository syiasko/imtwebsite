import React, { useState } from "react";
import { vehicles } from "./data";
import "./App.css";

const categories = ["All", "Ambulance", "Fire Truck", "Police Car"];

function App() {
  const [filter, setFilter] = useState("All");
  const filteredVehicles =
    filter === "All"
      ? vehicles
      : vehicles.filter((v) => v.category === filter);

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900">
      <header className="bg-blue-800 text-white py-6 shadow">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold">Custom Vehicle Catalogue</h1>
          <p className="text-sm mt-1">Ambulance, Fire Trucks, Police Cars & More</p>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="flex gap-2 mb-6">
          {categories.map((cat) => (
            <button
              key={cat}
              className={\`px-4 py-2 border rounded \${filter === cat ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}\`}
              onClick={() => setFilter(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVehicles.map((v) => (
            <div key={v.id} className="bg-white rounded-xl shadow overflow-hidden">
              <img src={v.image} alt={v.name} className="w-full h-48 object-cover" />
              <div className="p-4">
                <h3 className="text-xl font-semibold">{v.name}</h3>
                <p className="text-sm text-gray-600">{v.description}</p>
                <p className="text-sm mt-2">💡 Features: {v.features.join(", ")}</p>
                <button className="mt-4 w-full bg-blue-600 text-white px-4 py-2 rounded">
                  Contact Us
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;