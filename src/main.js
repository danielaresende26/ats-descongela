
import './style.css';
import { AtsModel } from './models/AtsModel';
import { AtsView } from './views/AtsView';
import { AtsController } from './controllers/AtsController';

document.addEventListener('DOMContentLoaded', () => {
    const model = new AtsModel();
    const view = new AtsView();
    const controller = new AtsController(model, view);
});

