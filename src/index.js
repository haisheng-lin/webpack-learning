import _ from 'lodash';
import './style.css';
import IconImage from './icon.png';

function component () {
  let element = document.createElement('div');

  // Lodash, now imported by this script
  element.innerHTML = _.join(['Hello', 'webpack'], ' ');
  element.classList.add('hello');

  // 将图像添加到我们现有的 div
  let iconImage = new Image();
  iconImage.src = IconImage;
  element.appendChild(iconImage);

  return element;
}

document.body.appendChild(component());
