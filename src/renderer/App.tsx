import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import icon from '../../assets/icon.svg';
import './App.css';

function Hello() {
  return (
    <div>
      <div className="Hello">
        <img width="200" alt="icon" src={icon} />
      </div>
      <h1>Alsalam zaki boiler plate is ready</h1>
      <p>
        please go back to the steps i gave you the other day and start from
        there , please use anything and everything that makes your job easier ,
        use shadcnui for components , dont create from scratch, its hard and
        annoying.
      </p>

      <p>Also install tailwindcss for easy styling.</p>

      <p>
        Dont forget to ask me anything you get stuck on for more than 15 mins
      </p>
      <p>starting point of your app is at src/renderer/App.tsx</p>

      <div className="Hello">
        <a
          href="https://electron-react-boilerplate.js.org/"
          target="_blank"
          rel="noreferrer"
        >
          <button type="button">
            <span role="img" aria-label="books">
              📚
            </span>
            Read our docs
          </button>
        </a>
      </div>
      <h1>good luck, inshallah we will finish this and make it good</h1>
    </div>
  );
}

// this is from baraa, below is a router same as web you privde a path and an element and when that path is accessed, the element will be rendered
export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Hello />} />
      </Routes>
    </Router>
  );
}
