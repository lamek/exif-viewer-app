import './App.css';
import AuthStatus from './AuthStatus';
import PickerPage from './PickerPage';
import ListPage from './ListPage';
import SignOutHandler from './SignOutHandler';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

function App() {

  const appBaseUrl = "https://exif.ladevzo.com";

  return (
    <Router>
      <div className="App flex flex-col min-h-screen">
        <header className="App-header pt-16">
          <h1 className="text-5xl font-extrabold mb-8 text-white">EXIF Viewer</h1>
          <p>View exif data from your photos</p>
          <Routes>
            <Route path="/" element={<AuthStatus />} />
            <Route path="/picker" element={<PickerPage />} />
            <Route path="/list" element={<ListPage />} />
            <Route path="/disconnect" element={<SignOutHandler />} />
          </Routes>
        </header>

        <footer className="mt-auto p-4 bg-gray-100 text-gray-600 text-sm border-t border-gray-200">
          <div className="container mx-auto flex justify-center space-x-4">
            <a href={`${appBaseUrl}/privacy.html`} target="_blank" rel="noopener noreferrer" className="hover:underline">Privacy Policy</a>
            <a href={`${appBaseUrl}/terms.html`} target="_blank" rel="noopener noreferrer" className="hover:underline">Terms of Service</a>
            <span>&copy; {new Date().getFullYear()} EXIF Viewer. All rights reserved.</span>
          </div>
        </footer>
      </div>
    </Router>
  );
}

export default App;