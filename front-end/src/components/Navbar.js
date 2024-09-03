//Navbar.js
import React from 'react';
import { Link } from 'react-router-dom';

const Navbar = () => {
  return (
    <nav className="navbar navbar-expand-lg navbar-light ps-2" style={{ backgroundColor: '#0047BB' }}>
      <Link className="navbar-brand text-white" to="/">Home</Link>
      <div className="collapse navbar-collapse">
        <ul className="navbar-nav mr-auto">
          <li className="nav-item">
            <Link className="nav-link text-white" to="/upload">Upload Asset</Link>
          </li>
          <li className="nav-item">
            <Link className="nav-link text-white" to="/add-manual">Add Asset Manually</Link>
          </li>
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;
