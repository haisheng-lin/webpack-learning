'use strict';

import React from 'react';
import ReactDOM from 'react-dom';

import logo from './icon.png';

import './search.less';

const Search = props => {
  return (
    <div className="search-text">
      <span>Search Text</span>
      <img src={logo} alt="logo" />
    </div>
  );
};

ReactDOM.render(<Search />, document.querySelector('#app'));
