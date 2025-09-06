import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import { useState } from 'react';
import './App.css';
import { evaluate } from 'mathjs';

function Hello() {
  const [num, setNum] = useState(''); // store input as string

  const addoutput = (input) => {
    setNum((prev) => prev + input); // append input as string
  };

  const calculate = () => {
    const result = evaluate(num);
    setNum(result.toString());
  }

  return (
    <div>
      <div className='Answer'>
        <input type='text' value={num} readOnly />
      </div>
      <div className='buttonsier'>
        <button onClick={() => addoutput('1')}>1</button>
        <button onClick={() => addoutput('2')}>2</button>
        <button onClick={() => addoutput('3')}>3</button>
        <button onClick={() => addoutput('4')}>4</button>
        <button onClick={() => addoutput('5')}>5</button>
        <button onClick={() => addoutput('6')}>6</button>
        <button onClick={() => addoutput('7')}>7</button>
        <button onClick={() => addoutput('8')}>8</button>
        <button onClick={() => addoutput('9')}>9</button>
        <button onClick={() => addoutput('-')}>-</button>
        <button onClick={() => addoutput('0')}>0</button>
        <button onClick={() => addoutput('+')}>+</button>
        <button className='equal' onClick={() => calculate()}>=</button>
        <button onClick={() => setNum('')}>C</button>
      </div>
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
