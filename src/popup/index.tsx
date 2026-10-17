import { render } from 'preact';
import { Popup } from './Popup';
const container = document.getElementById('root');
if (container) render(<Popup />, container);
