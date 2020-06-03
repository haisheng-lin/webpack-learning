'use strict';

import React from 'react';
import ReactDOM from 'react-dom';

import 'amfe-flexible';

import logo from '../assets/images/icon.png';

import './index.less';

const Search = props => {
  return (
    <div className="search-text">
      <span>Search Text Content</span>
      <img src={logo} alt="logo" />
    </div>
  );
};

ReactDOM.render(<Search />, document.querySelector('#app'));
