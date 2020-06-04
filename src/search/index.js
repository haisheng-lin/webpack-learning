'use strict';

import React, { useState } from 'react';
import ReactDOM from 'react-dom';

import 'amfe-flexible';

import logo from '../assets/images/icon.png';

import './index.less';

const Search = props => {
  const [Test, setTest] = useState(null);

  const lazyLoad = () => {
    const component = React.lazy(() => import('./lazy-load'));
    setTest(component);
  };

  return (
    <div className="search-text">
      <span onClick={lazyLoad}>Search Text Content</span>
      <img src={logo} alt="logo" />
      {Test ? <Test /> : null}
    </div>
  );
};

ReactDOM.render(
  <React.Suspense fallback={<>loading...</>}>
    <Search />
  </React.Suspense>,
  document.querySelector('#app')
);
