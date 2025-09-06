import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import 'tailwindcss/index.css';
import './App.css';
import Childcomp from './components/ChildComp';

function Hello() {
  return (
    <div className="flex flex-col h-screen w-screen bg-black min-w-0 min-h-0 overflow-hidden">
      <Childcomp />
      <p className="bg-blue-950">Hi nice people</p>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Hello />} />
      </Routes>
    </Router>
  );
}
