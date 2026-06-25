/* Bootstrap: wire the modules together and draw the initial state.
   data → engine (math) and canvas (chart); stepper drives both from the UI. */
import { initCanvas } from './canvas.js';
import { initStepper } from './stepper.js';

initCanvas();
initStepper();
