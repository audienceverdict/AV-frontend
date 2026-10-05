import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import {LoadingScreen} from './components/LoadingScreen';
import './styles.css';
import './brand-images.css';
import './venue-setup.css';
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><LoadingScreen><App/></LoadingScreen></React.StrictMode>);
